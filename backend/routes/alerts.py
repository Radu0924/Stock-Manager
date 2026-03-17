import sqlite3
from datetime import date, timedelta
from typing import Literal, Optional
from typing import cast

from fastapi import APIRouter, Depends, Query

from algoritmi import check_stockout
from config import CONFIG
from ..db import (
    get_db,
    load_stores,
    load_sku_info,
    load_inventory,
    load_sales_transactions,
    compute_metrics_by_size,
)
from ..models import StockoutRow, StockoutResponse, AlertHistoryRow, AlertHistoryResponse

router = APIRouter(prefix="/api", tags=["alerts"])


@router.get("/alerts/stockout", response_model=StockoutResponse)
def alerts_stockout(
    days: int = Query(default=120, ge=1, le=730),
    product_id: Optional[int] = None,
    size_id: Optional[int] = None,
    conn: sqlite3.Connection = Depends(get_db),
) -> StockoutResponse:
    end = date.today()
    start = end - timedelta(days=days)

    stores = load_stores(conn)
    sku_info = load_sku_info(conn, product_id=product_id, size_id=size_id)
    if not sku_info:
        return StockoutResponse(threshold_DoS=int(CONFIG.stockout_threshold), rows=[])

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
                    product_id=sku.product_id,
                    product_name=sku.product_name,
                    size=sku.size,
                    size_id=sku.size_id,
                    current_stock=int(stock),
                    daily_speed=float(metrics.daily_speed),
                    DoS=float(metrics.DoS),
                    classification=cast(Literal["Slow", "Normal", "Fast"], metrics.classification),
                    is_stockout=is_out,
                )
            )

    rows.sort(key=lambda r: (r.DoS, r.store_id, r.product_id, r.size))
    return StockoutResponse(threshold_DoS=int(CONFIG.stockout_threshold), rows=rows)


@router.get("/alerts/history", response_model=AlertHistoryResponse)
def alerts_history(
    severity: Optional[str] = None,
    store_id: Optional[int] = None,
    conn: sqlite3.Connection = Depends(get_db),
) -> AlertHistoryResponse:
    stores = load_stores(conn)
    params: list[object] = []
    conditions: list[str] = []
    if severity:
        conditions.append("ah.severity = ?")
        params.append(severity)
    if store_id is not None:
        conditions.append("ah.store_id = ?")
        params.append(store_id)
    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    cur = conn.execute(
        f"""
        SELECT ah.alert_id, ah.timestamp, ah.alert_type, ah.severity,
               ah.trigger_subject, ah.store_id, ah.duration,
               ah.action_taken, ah.result, ah.resolved_at
        FROM alerts_history ah
        {where_clause}
        ORDER BY ah.timestamp DESC
        LIMIT 500
        """,
        params,
    )

    rows: list[AlertHistoryRow] = []
    for r in cur.fetchall():
        store = stores.get(int(r["store_id"]))
        rows.append(
            AlertHistoryRow(
                alert_id=int(r["alert_id"]),
                timestamp=str(r["timestamp"]),
                alert_type=str(r["alert_type"]),
                severity=cast(Literal["Critical", "High", "Medium", "Low"], r["severity"]),
                trigger_subject=str(r["trigger_subject"]),
                store_id=int(r["store_id"]),
                store_name=store.name if store else f"Store {r['store_id']}",
                duration=cast(Optional[str], r["duration"]),
                action_taken=cast(Optional[str], r["action_taken"]),
                result=cast(Optional[Literal["Success", "Failure", "Pending"]], r["result"]),
                resolved_at=cast(Optional[str], r["resolved_at"]),
            )
        )
    return AlertHistoryResponse(rows=rows)
