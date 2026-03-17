import os
import sqlite3
import sys
from collections import defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any
from typing import Literal
from typing import Optional
from typing import TypedDict
from typing import cast

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from algoritmi import (
    AllocationResult,
    DestinationCandidate,
    Transaction,
    check_stockout,
    compute_metrics,
    compute_surplus,
    greedy_allocation,
    score_destinations,
)
from config import CONFIG


def _db_path() -> Path:
    return ROOT_DIR / "inventory_system.db"


def _connect() -> sqlite3.Connection:
    db_path = _db_path()
    if not db_path.exists():
        raise FileNotFoundError(
            f"Database file not found at {db_path}. Run setupdb.py and populatedb.py first."
        )
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def _date_from_db(value: Any) -> date:
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, str):
        return date.fromisoformat(value)
    if isinstance(value, datetime):
        return value.date()
    raise TypeError(f"Unsupported date value: {type(value)}")


def _route_cost(destination_store_id: int, base: float = 20.0, k: float = 5.0) -> float:
    return round(base + k * float(destination_store_id), 2)


class HealthResponse(BaseModel):
    status: Literal["ok"]


class StoreRow(BaseModel):
    store_id: int
    name: str
    city: Optional[str] = None
    address: Optional[str] = None


class ProductRow(BaseModel):
    product_id: int
    name: str
    category: Optional[str] = None
    gender: Optional[str] = None
    unit_price: Optional[float] = None
    image_url: Optional[str] = None


class ProductSizeRow(BaseModel):
    size_id: int
    size: str


class DashboardStockRow(BaseModel):
    store_id: int
    store_name: str
    total_quantity: int
    last_updated: Optional[str] = None


class DashboardStockResponse(BaseModel):
    rows: list[DashboardStockRow]


class StoreInventoryRow(BaseModel):
    product_id: int
    product_name: str
    category: Optional[str] = None
    gender: Optional[str] = None
    unit_price: Optional[float] = None
    image_url: Optional[str] = None
    size_id: int
    size: str
    quantity: int
    last_updated: Optional[str] = None


class StoreInventoryResponse(BaseModel):
    store_id: int
    rows: list[StoreInventoryRow]


class StockoutRow(BaseModel):
    store_id: int
    store_name: str
    product_id: int
    product_name: str
    size: str
    size_id: int
    current_stock: int
    daily_speed: float
    DoS: float
    classification: Literal["Slow", "Normal", "Fast"]
    is_stockout: bool


class StockoutResponse(BaseModel):
    threshold_DoS: int
    rows: list[StockoutRow]


class TransferOrderRow(BaseModel):
    source_id: int
    destination_id: int
    quantity: int
    type: Literal["automatic", "manager_approval"]


class WorkflowExplainDestinationRow(BaseModel):
    store_id: int
    DoS: float
    free_capacity: int
    route_cost: float
    score: float


class WorkflowExplainSourceRow(BaseModel):
    store_id: int
    available_surplus: int


class WorkflowExplain(BaseModel):
    sources: list[WorkflowExplainSourceRow]
    destinations: list[WorkflowExplainDestinationRow]


class WorkflowItem(BaseModel):
    size_id: int
    product_id: int
    product_name: str
    size: str
    unit_price: Optional[float] = None
    orders: list[TransferOrderRow]
    explain: WorkflowExplain


class WorkflowResponse(BaseModel):
    meta: dict[str, Any]
    items: list[WorkflowItem]


def _load_stores(conn: sqlite3.Connection) -> dict[int, StoreRow]:
    cur = conn.execute("SELECT store_id, name, city, address FROM stores")
    stores: dict[int, StoreRow] = {}
    for row in cur.fetchall():
        stores[int(row["store_id"])] = StoreRow(
            store_id=int(row["store_id"]),
            name=str(row["name"]),
            city=cast(Optional[str], row["city"]),
            address=cast(Optional[str], row["address"]),
        )
    return stores


class _SkuInfo(TypedDict):
    size_id: int
    size: str
    product_id: int
    product_name: str
    unit_price: Optional[float]


def _load_sku_info(
    conn: sqlite3.Connection,
    product_id: Optional[int] = None,
    size_id: Optional[int] = None,
) -> dict[int, _SkuInfo]:
    params: list[Any] = []
    where: list[str] = []
    if product_id is not None:
        where.append("ps.product_id = ?")
        params.append(product_id)
    if size_id is not None:
        where.append("ps.size_id = ?")
        params.append(size_id)
    where_clause = f"WHERE {' AND '.join(where)}" if where else ""

    cur = conn.execute(
        f"""
        SELECT
          ps.size_id,
          ps.size,
          p.product_id,
          p.name AS product_name,
          p.unit_price
        FROM product_sizes ps
        JOIN products p ON p.product_id = ps.product_id
        {where_clause}
        """,
        params,
    )
    info: dict[int, _SkuInfo] = {}
    for row in cur.fetchall():
        sid = int(row["size_id"])
        info[sid] = {
            "size_id": sid,
            "size": str(row["size"]),
            "product_id": int(row["product_id"]),
            "product_name": str(row["product_name"]),
            "unit_price": cast(Optional[float], row["unit_price"]),
        }
    return info


def _load_inventory(conn: sqlite3.Connection) -> dict[tuple[int, int], tuple[int, Optional[str]]]:
    cur = conn.execute(
        "SELECT store_id, size_id, quantity, last_updated FROM inventory"
    )
    inv: dict[tuple[int, int], tuple[int, Optional[str]]] = {}
    for row in cur.fetchall():
        inv[(int(row["store_id"]), int(row["size_id"]))] = (
            int(row["quantity"]),
            cast(Optional[str], row["last_updated"]),
        )
    return inv


def _load_sales_transactions(
    conn: sqlite3.Connection,
    start_date: date,
) -> dict[tuple[int, int], list[Transaction]]:
    cur = conn.execute(
        """
        SELECT store_id, size_id, sale_date, SUM(quantity) AS qty
        FROM sales
        WHERE sale_date >= ?
        GROUP BY store_id, size_id, sale_date
        ORDER BY sale_date ASC
        """,
        (start_date.isoformat(),),
    )
    out: dict[tuple[int, int], list[Transaction]] = defaultdict(list)
    for row in cur.fetchall():
        key = (int(row["store_id"]), int(row["size_id"]))
        out[key].append(
            Transaction(date=_date_from_db(row["sale_date"]), quantity=int(row["qty"]))
        )
    return dict(out)


def _compute_metrics_by_size(
    store_ids: list[int],
    size_ids: list[int],
    transactions_by_key: dict[tuple[int, int], list[Transaction]],
    inventory_by_key: dict[tuple[int, int], tuple[int, Optional[str]]],
) -> dict[tuple[int, int], Any]:
    speeds_by_size: dict[int, dict[int, float]] = defaultdict(dict)
    for size_id in size_ids:
        for store_id in store_ids:
            stock = inventory_by_key.get((store_id, size_id), (0, None))[0]
            tx = transactions_by_key.get((store_id, size_id), [])
            speed_metrics = compute_metrics(
                str(store_id),
                tx,
                current_stock=stock,
                all_speeds=[0.0],
            )
            speeds_by_size[size_id][store_id] = float(speed_metrics.daily_speed)

    metrics_by_key: dict[tuple[int, int], Any] = {}
    for size_id in size_ids:
        all_speeds = list(speeds_by_size[size_id].values())
        for store_id in store_ids:
            stock = inventory_by_key.get((store_id, size_id), (0, None))[0]
            tx = transactions_by_key.get((store_id, size_id), [])
            metrics = compute_metrics(
                str(store_id),
                tx,
                current_stock=stock,
                all_speeds=all_speeds if len(all_speeds) >= 2 else [0.0],
            )
            metrics_by_key[(store_id, size_id)] = metrics
    return metrics_by_key


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
            rc = _route_cost(store_id, base=route_cost_base, k=route_cost_k)
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

    if unit_price is None:
        unit_price_value = 0.0
    else:
        unit_price_value = float(unit_price)

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


app = FastAPI(title="Stock Management API", version="1.0.0")

cors_origins = [
    os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173"),
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok")


@app.get("/api/stores", response_model=list[StoreRow])
def list_stores() -> list[StoreRow]:
    with _connect() as conn:
        return list(_load_stores(conn).values())


@app.get("/api/products", response_model=list[ProductRow])
def list_products() -> list[ProductRow]:
    with _connect() as conn:
        cur = conn.execute(
            "SELECT product_id, name, category, gender, unit_price, image_url FROM products"
        )
        rows: list[ProductRow] = []
        for r in cur.fetchall():
            rows.append(
                ProductRow(
                    product_id=int(r["product_id"]),
                    name=str(r["name"]),
                    category=cast(Optional[str], r["category"]),
                    gender=cast(Optional[str], r["gender"]),
                    unit_price=cast(Optional[float], r["unit_price"]),
                    image_url=cast(Optional[str], r["image_url"]),
                )
            )
        return rows


@app.get("/api/products/{product_id}/sizes", response_model=list[ProductSizeRow])
def list_product_sizes(product_id: int) -> list[ProductSizeRow]:
    with _connect() as conn:
        cur = conn.execute(
            "SELECT size_id, size FROM product_sizes WHERE product_id = ? ORDER BY size",
            (product_id,),
        )
        return [
            ProductSizeRow(size_id=int(r["size_id"]), size=str(r["size"]))
            for r in cur.fetchall()
        ]


@app.get("/api/dashboard/stock", response_model=DashboardStockResponse)
def dashboard_stock(size_id: Optional[int] = None) -> DashboardStockResponse:
    with _connect() as conn:
        if size_id is None:
            cur = conn.execute(
                """
                SELECT
                  s.store_id,
                  s.name AS store_name,
                  COALESCE(SUM(i.quantity), 0) AS total_quantity,
                  MAX(i.last_updated) AS last_updated
                FROM stores s
                LEFT JOIN inventory i ON i.store_id = s.store_id
                GROUP BY s.store_id, s.name
                ORDER BY s.store_id
                """
            )
        else:
            cur = conn.execute(
                """
                SELECT
                  s.store_id,
                  s.name AS store_name,
                  COALESCE(i.quantity, 0) AS total_quantity,
                  i.last_updated AS last_updated
                FROM stores s
                LEFT JOIN inventory i
                  ON i.store_id = s.store_id AND i.size_id = ?
                ORDER BY s.store_id
                """,
                (size_id,),
            )
        rows: list[DashboardStockRow] = []
        for r in cur.fetchall():
            rows.append(
                DashboardStockRow(
                    store_id=int(r["store_id"]),
                    store_name=str(r["store_name"]),
                    total_quantity=int(r["total_quantity"]),
                    last_updated=cast(Optional[str], r["last_updated"]),
                )
            )
        return DashboardStockResponse(rows=rows)


@app.get("/api/stores/{store_id}/inventory", response_model=StoreInventoryResponse)
def store_inventory(store_id: int, product_id: Optional[int] = None) -> StoreInventoryResponse:
    with _connect() as conn:
        params: list[Any] = [store_id]
        where = ""
        if product_id is not None:
            where = "AND p.product_id = ?"
            params.append(product_id)

        cur = conn.execute(
            f"""
            SELECT
              p.product_id,
              p.name AS product_name,
              p.category,
              p.gender,
              p.unit_price,
              p.image_url,
              ps.size_id,
              ps.size,
              COALESCE(i.quantity, 0) AS quantity,
              i.last_updated
            FROM product_sizes ps
            JOIN products p ON p.product_id = ps.product_id
            LEFT JOIN inventory i
              ON i.size_id = ps.size_id AND i.store_id = ?
            WHERE 1=1
            {where}
            ORDER BY p.product_id, ps.size
            """,
            params,
        )

        rows: list[StoreInventoryRow] = []
        for r in cur.fetchall():
            rows.append(
                StoreInventoryRow(
                    product_id=int(r["product_id"]),
                    product_name=str(r["product_name"]),
                    category=cast(Optional[str], r["category"]),
                    gender=cast(Optional[str], r["gender"]),
                    unit_price=cast(Optional[float], r["unit_price"]),
                    image_url=cast(Optional[str], r["image_url"]),
                    size_id=int(r["size_id"]),
                    size=str(r["size"]),
                    quantity=int(r["quantity"]),
                    last_updated=cast(Optional[str], r["last_updated"]),
                )
            )
        return StoreInventoryResponse(store_id=store_id, rows=rows)


@app.get("/api/alerts/stockout", response_model=StockoutResponse)
def alerts_stockout(
    days: int = 120,
    product_id: Optional[int] = None,
    size_id: Optional[int] = None,
) -> StockoutResponse:
    end = date.today()
    start = end - timedelta(days=max(1, days))

    with _connect() as conn:
        stores = _load_stores(conn)
        sku_info = _load_sku_info(conn, product_id=product_id, size_id=size_id)
        if not sku_info:
            return StockoutResponse(threshold_DoS=int(CONFIG.stockout_threshold), rows=[])

        inventory_by_key = _load_inventory(conn)
        transactions_by_key = _load_sales_transactions(conn, start)

        store_ids = sorted(stores.keys())
        size_ids = sorted(sku_info.keys())

        metrics_by_key = _compute_metrics_by_size(
            store_ids,
            size_ids,
            transactions_by_key=transactions_by_key,
            inventory_by_key=inventory_by_key,
        )

        rows: list[StockoutRow] = []
        for sid in size_ids:
            sku = sku_info[sid]
            for store_id_value in store_ids:
                stock = inventory_by_key.get((store_id_value, sid), (0, None))[0]
                metrics = metrics_by_key[(store_id_value, sid)]
                is_out = bool(check_stockout(str(store_id_value), DoS=float(metrics.DoS)))
                if not is_out:
                    continue
                store = stores[store_id_value]
                rows.append(
                    StockoutRow(
                        store_id=store_id_value,
                        store_name=store.name,
                        product_id=int(sku["product_id"]),
                        product_name=str(sku["product_name"]),
                        size=str(sku["size"]),
                        size_id=int(sku["size_id"]),
                        current_stock=int(stock),
                        daily_speed=float(metrics.daily_speed),
                        DoS=float(metrics.DoS),
                        classification=cast(Literal["Slow", "Normal", "Fast"], metrics.classification),
                        is_stockout=is_out,
                    )
                )

        rows.sort(key=lambda r: (r.DoS, r.store_id, r.product_id, r.size))
        return StockoutResponse(threshold_DoS=int(CONFIG.stockout_threshold), rows=rows)


@app.get("/api/workflow/transfers/suggestions", response_model=WorkflowResponse)
def workflow_suggestions(
    days: int = 120,
    product_id: Optional[int] = None,
    size_id: Optional[int] = None,
    limit: int = 10,
) -> WorkflowResponse:
    end = date.today()
    start = end - timedelta(days=max(1, days))
    route_cost_base = 20.0
    route_cost_k = 5.0

    with _connect() as conn:
        stores = _load_stores(conn)
        sku_info = _load_sku_info(conn, product_id=product_id, size_id=size_id)
        if not sku_info:
            return WorkflowResponse(meta={"days": days}, items=[])

        inventory_by_key = _load_inventory(conn)
        transactions_by_key = _load_sales_transactions(conn, start)

        store_ids = sorted(stores.keys())
        size_ids = sorted(sku_info.keys())

        metrics_by_key = _compute_metrics_by_size(
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
                unit_price=sku["unit_price"],
                route_cost_base=route_cost_base,
                route_cost_k=route_cost_k,
            )
            if not orders:
                continue
            items.append(
                WorkflowItem(
                    size_id=int(sku["size_id"]),
                    product_id=int(sku["product_id"]),
                    product_name=str(sku["product_name"]),
                    size=str(sku["size"]),
                    unit_price=cast(Optional[float], sku["unit_price"]),
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
