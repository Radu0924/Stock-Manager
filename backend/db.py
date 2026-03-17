import sqlite3
import sys
from collections import defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Generator, Optional
from typing import cast

from fastapi import HTTPException

from algoritmi import Transaction, compute_metrics
from .models import StoreRow

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))


class _SkuInfo:
    """Typed dict replacement for SKU info rows."""

    __slots__ = ("size_id", "size", "product_id", "product_name", "unit_price")

    def __init__(
        self,
        size_id: int,
        size: str,
        product_id: int,
        product_name: str,
        unit_price: Optional[float],
    ) -> None:
        self.size_id = size_id
        self.size = size
        self.product_id = product_id
        self.product_name = product_name
        self.unit_price = unit_price


def _db_path() -> Path:
    return ROOT_DIR / "inventory_system.db"


def get_db() -> Generator[sqlite3.Connection, None, None]:
    """FastAPI dependency that yields a DB connection and closes it after."""
    db_path = _db_path()
    if not db_path.exists():
        raise HTTPException(
            status_code=503,
            detail="Database not found. Run setupdb.py and populatedb.py first.",
        )
    conn = sqlite3.connect(str(db_path), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def date_from_db(value: Any) -> date:
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, str):
        return date.fromisoformat(value)
    if isinstance(value, datetime):
        return value.date()
    raise TypeError(f"Unsupported date value: {type(value)}")


def route_cost(destination_store_id: int, base: float = 20.0, k: float = 5.0) -> float:
    return round(base + k * float(destination_store_id), 2)


def load_stores(conn: sqlite3.Connection) -> dict[int, StoreRow]:
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


def load_sku_info(
    conn: sqlite3.Connection,
    product_id: Optional[int] = None,
    size_id: Optional[int] = None,
) -> dict[int, _SkuInfo]:
    params: list[Any] = []
    conditions: list[str] = []
    if product_id is not None:
        conditions.append("ps.product_id = ?")
        params.append(product_id)
    if size_id is not None:
        conditions.append("ps.size_id = ?")
        params.append(size_id)
    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

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
        info[sid] = _SkuInfo(
            size_id=sid,
            size=str(row["size"]),
            product_id=int(row["product_id"]),
            product_name=str(row["product_name"]),
            unit_price=cast(Optional[float], row["unit_price"]),
        )
    return info


def load_inventory(conn: sqlite3.Connection) -> dict[tuple[int, int], tuple[int, Optional[str]]]:
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


def load_sales_transactions(
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
            Transaction(date=date_from_db(row["sale_date"]), quantity=int(row["qty"]))
        )
    return dict(out)


def compute_metrics_by_size(
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
