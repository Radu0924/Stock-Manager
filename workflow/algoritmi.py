import logging
import math
from datetime import date
from dataclasses import dataclass, field
from typing import Literal

from config import CONFIG

logger = logging.getLogger(__name__)


@dataclass
class Transaction:
    date: date
    quantity: int


@dataclass
class StoreMetrics:
    store_id: str
    daily_speed: float
    DoS: float
    classification: Literal["Slow", "Normal", "Fast"]


@dataclass
class DestinationCandidate:
    store_id: str
    DoS: float
    route_cost: float
    free_capacity: int
    score: float = 0.0


@dataclass
class TransferOrder:
    source_id: str
    destination_id: str
    quantity: int
    type: Literal["automatic", "manager_approval"]


@dataclass
class AllocationResult:
    orders: list[TransferOrder] = field(default_factory=list)
    remaining_surplus: dict[str, int] = field(default_factory=dict)


def compute_metrics(
    store_id: str,
    transactions: list[Transaction],
    current_stock: int,
    all_speeds: list[float],
) -> StoreMetrics:
    if not store_id:
        raise ValueError("store_id must not be empty")
    if current_stock < 0:
        raise ValueError(f"current_stock must be non-negative, got {current_stock}")

    speed = _weighted_moving_average(transactions)
    DoS = (current_stock / speed) if speed > 0 else float("inf")
    classification = _zscore_classification(speed, all_speeds)

    logger.debug(
        "store=%s speed=%.4f DoS=%.2f classification=%s",
        store_id, speed, DoS, classification,
    )

    return StoreMetrics(
        store_id=store_id,
        daily_speed=round(speed, 4),
        DoS=round(DoS, 2),
        classification=classification,
    )


def _weighted_moving_average(transactions: list[Transaction]) -> float:
    if not transactions:
        return 0.0

    lam = CONFIG.lambda_decay
    today = date.today()
    weighted_sum = 0.0
    weight_sum = 0.0

    for t in transactions:
        days_diff = (today - t.date).days
        w = math.exp(-lam * days_diff)
        weighted_sum += t.quantity * w
        weight_sum += w

    return weighted_sum / weight_sum if weight_sum > 0 else 0.0


def _zscore_classification(
    store_speed: float,
    all_speeds: list[float],
) -> Literal["Slow", "Normal", "Fast"]:
    if len(all_speeds) < 2:
        return "Normal"

    mu = sum(all_speeds) / len(all_speeds)
    sigma = math.sqrt(
        sum((v - mu) ** 2 for v in all_speeds) / len(all_speeds)
    )

    if sigma == 0:
        return "Normal"

    z = (store_speed - mu) / sigma

    if z < CONFIG.z_slow_threshold:
        return "Slow"
    elif z > CONFIG.z_fast_threshold:
        return "Fast"
    else:
        return "Normal"


def compute_surplus(
    current_stock: int,
    daily_speed: float,
) -> int:
    if current_stock < 0:
        raise ValueError(f"current_stock must be non-negative, got {current_stock}")
    if daily_speed < 0:
        raise ValueError(f"daily_speed must be non-negative, got {daily_speed}")

    if daily_speed == 0:
        return 0

    optimal_stock = CONFIG.DoS_target * daily_speed * (1 + CONFIG.safety_factor)
    surplus = current_stock - optimal_stock

    return max(0, math.floor(surplus))


def score_destinations(
    candidates: list[DestinationCandidate],
) -> list[DestinationCandidate]:
    if not candidates:
        return []

    w1, w2, w3 = CONFIG.w1, CONFIG.w2, CONFIG.w3

    vals_dos = [1 / c.DoS if c.DoS > 0 else 0 for c in candidates]
    vals_cost = [1 / c.route_cost if c.route_cost > 0 else 0 for c in candidates]
    vals_cap = [float(c.free_capacity) for c in candidates]

    dos_norm = _normalize(vals_dos)
    cost_norm = _normalize(vals_cost)
    cap_norm = _normalize(vals_cap)

    for i, candidate in enumerate(candidates):
        candidate.score = round(
            w1 * dos_norm[i] + w2 * cost_norm[i] + w3 * cap_norm[i], 4
        )

    return sorted(candidates, key=lambda c: c.score, reverse=True)


def _normalize(values: list[float]) -> list[float]:
    min_v = min(values)
    max_v = max(values)
    if max_v == min_v:
        return [1.0 for _ in values]
    return [(v - min_v) / (max_v - min_v) for v in values]


def verify_ROI(
    quantity: int,
    unit_price: float,
    route_cost: float,
) -> bool:
    if quantity < 0:
        raise ValueError(f"quantity must be non-negative, got {quantity}")
    if unit_price < 0:
        raise ValueError(f"unit_price must be non-negative, got {unit_price}")

    if route_cost <= 0:
        return False

    ROI = (quantity * unit_price) / route_cost
    return ROI > CONFIG.min_roi


def greedy_allocation(
    sources: list[dict],
    destinations: list[DestinationCandidate],
    unit_price: float,
) -> AllocationResult:
    if unit_price < 0:
        raise ValueError(f"unit_price must be non-negative, got {unit_price}")

    if not sources or not destinations:
        return AllocationResult()

    remaining_surplus = {s["store_id"]: s["available_surplus"] for s in sources}
    remaining_capacity = {d.store_id: d.free_capacity for d in destinations}

    pairs = []
    for source in sources:
        for dest in destinations:
            possible_qty = min(
                remaining_surplus[source["store_id"]],
                remaining_capacity[dest.store_id],
            )
            if possible_qty <= 0:
                continue
            if not verify_ROI(possible_qty, unit_price, dest.route_cost):
                logger.debug(
                    "Skipped %s -> %s: ROI too low (qty=%d, cost=%.2f)",
                    source["store_id"], dest.store_id,
                    possible_qty, dest.route_cost,
                )
                continue
            pairs.append({
                "source_id": source["store_id"],
                "source_surplus": source["available_surplus"],
                "dest": dest,
                "quantity": possible_qty,
            })

    pairs.sort(key=lambda p: (p["dest"].score, p["source_surplus"]), reverse=True)

    orders = []
    for p in pairs:
        sid = p["source_id"]
        did = p["dest"].store_id

        quantity = min(remaining_surplus[sid], remaining_capacity[did])
        if quantity <= 0:
            continue

        order_type = (
            "automatic" if quantity <= CONFIG.auto_threshold
            else "manager_approval"
        )

        orders.append(TransferOrder(
            source_id=sid,
            destination_id=did,
            quantity=quantity,
            type=order_type,
        ))

        logger.info(
            "Transfer: %s -> %s qty=%d type=%s",
            sid, did, quantity, order_type,
        )

        remaining_surplus[sid] -= quantity
        remaining_capacity[did] -= quantity

    result = AllocationResult(
        orders=orders,
        remaining_surplus={k: v for k, v in remaining_surplus.items() if v > 0},
    )

    logger.info(
        "Allocation complete: %d orders, %d sources with remaining surplus",
        len(result.orders), len(result.remaining_surplus),
    )

    return result


def check_stockout(store_id: str, DoS: float) -> bool:
    if not store_id:
        raise ValueError("store_id must not be empty")

    return DoS < CONFIG.stockout_threshold
