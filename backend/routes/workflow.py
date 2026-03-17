import sqlite3
from datetime import date, timedelta
from typing import Any, Literal, Optional
from typing import cast

from fastapi import APIRouter, Depends, Query

from algoritmi import (
    AllocationResult,
    DestinationCandidate,
    compute_surplus,
    greedy_allocation,
    score_destinations,
)
from config import CONFIG
from ..db import (
    get_db,
    load_stores,
    load_sku_info,
    load_inventory,
    load_sales_transactions,
    compute_metrics_by_size,
    route_cost,
)
from ..models import (
    TransferOrderRow,
    WorkflowExplainDestinationRow,
    WorkflowExplainSourceRow,
    WorkflowExplain,
    WorkflowItem,
    WorkflowResponse,
)

router = APIRouter(prefix="/api", tags=["workflow"])


def _workflow_for_size(
    size_id: int,
    store_ids: list[int],
    metrics_by_key: dict[tuple[int, int], Any],
    inventory_by_key: dict[tuple[int, int], tuple[int, Optional[str]]],
    unit_price: Optional[float],
    route_cost_base: float,
    route_cost_k: float,
) -> tuple[list[TransferOrderRow], WorkflowExplain]:
    sources: list[WorkflowExplainSourceRow] = []
    destinations: list[DestinationCandidate] = []
    explain_destinations: list[WorkflowExplainDestinationRow] = []

    for store_id in store_ids:
        stock = inventory_by_key.get((store_id, size_id), (0, None))[0]
        metrics = metrics_by_key[(store_id, size_id)]

        surplus = compute_surplus(current_stock=stock, daily_speed=float(metrics.daily_speed))
        if surplus > 0:
            sources.append(
                WorkflowExplainSourceRow(store_id=store_id, available_surplus=int(surplus))
            )

        optimal = CONFIG.DoS_target * float(metrics.daily_speed) * (1 + CONFIG.safety_factor)
        free_capacity = max(0, int(max(0.0, optimal - float(stock)) // 1))
        if free_capacity > 0:
            rc = route_cost(store_id, base=route_cost_base, k=route_cost_k)
            destinations.append(
                DestinationCandidate(
                    store_id=str(store_id),
                    DoS=float(metrics.DoS),
                    route_cost=float(rc),
                    free_capacity=int(free_capacity),
                )
            )

    scored = score_destinations(destinations)
    for d in scored:
        explain_destinations.append(
            WorkflowExplainDestinationRow(
                store_id=int(d.store_id),
                DoS=float(d.DoS),
                free_capacity=int(d.free_capacity),
                route_cost=float(d.route_cost),
                score=float(d.score),
            )
        )

    unit_price_value = float(unit_price) if unit_price is not None else 0.0

    allocation_sources = [
        {"store_id": str(s.store_id), "available_surplus": int(s.available_surplus)}
        for s in sources
    ]
    allocation_result: AllocationResult = greedy_allocation(
        allocation_sources,
        scored,
        unit_price=unit_price_value,
    )

    orders: list[TransferOrderRow] = []
    for o in allocation_result.orders:
        orders.append(
            TransferOrderRow(
                source_id=int(o.source_id),
                destination_id=int(o.destination_id),
                quantity=int(o.quantity),
                type=cast(Literal["automatic", "manager_approval"], o.type),
            )
        )

    explain = WorkflowExplain(
        sources=sources,
        destinations=explain_destinations,
    )
    return orders, explain


@router.get("/workflow/transfers/suggestions", response_model=WorkflowResponse)
def workflow_suggestions(
    days: int = Query(default=120, ge=1, le=730),
    product_id: Optional[int] = None,
    size_id: Optional[int] = None,
    limit: int = Query(default=10, ge=1, le=100),
    conn: sqlite3.Connection = Depends(get_db),
) -> WorkflowResponse:
    end = date.today()
    start = end - timedelta(days=days)
    route_cost_base = 20.0
    route_cost_k = 5.0

    stores = load_stores(conn)
    sku_info = load_sku_info(conn, product_id=product_id, size_id=size_id)
    if not sku_info:
        return WorkflowResponse(meta={"days": days}, items=[])

    inventory_by_key = load_inventory(conn)
    transactions_by_key = load_sales_transactions(conn, start)

    store_ids = sorted(stores.keys())
    size_ids = sorted(sku_info.keys())

    metrics_by_key = compute_metrics_by_size(
        store_ids,
        size_ids,
        transactions_by_key=transactions_by_key,
        inventory_by_key=inventory_by_key,
    )

    items: list[WorkflowItem] = []
    for sid in size_ids:
        sku = sku_info[sid]
        orders, explain = _workflow_for_size(
            sid,
            store_ids=store_ids,
            metrics_by_key=metrics_by_key,
            inventory_by_key=inventory_by_key,
            unit_price=sku.unit_price,
            route_cost_base=route_cost_base,
            route_cost_k=route_cost_k,
        )
        if not orders:
            continue
        items.append(
            WorkflowItem(
                size_id=sku.size_id,
                product_id=sku.product_id,
                product_name=sku.product_name,
                size=sku.size,
                unit_price=sku.unit_price,
                orders=orders,
                explain=explain,
            )
        )

    items.sort(key=lambda i: len(i.orders), reverse=True)
    items = items[: max(1, limit)]

    return WorkflowResponse(
        meta={
            "days": days,
            "route_cost_model": {"base": route_cost_base, "k": route_cost_k, "mode": "destination_index"},
            "auto_threshold": int(CONFIG.auto_threshold),
            "min_roi": float(CONFIG.min_roi),
        },
        items=items,
    )
