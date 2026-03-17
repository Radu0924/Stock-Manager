import sqlite3
from typing import Optional
from typing import cast

from fastapi import APIRouter, Depends

from ..db import get_db
from ..models import DashboardStockRow, DashboardStockResponse

router = APIRouter(prefix="/api", tags=["dashboard"])


@router.get("/dashboard/stock", response_model=DashboardStockResponse)
def dashboard_stock(
    size_id: Optional[int] = None,
    conn: sqlite3.Connection = Depends(get_db),
) -> DashboardStockResponse:
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
