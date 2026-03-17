import sqlite3
from typing import Optional

from fastapi import APIRouter, Depends, Query
from typing import cast

from ..db import get_db, load_stores
from ..models import StoreRow, StoreInventoryRow, StoreInventoryResponse, ProductRow, ProductSizeRow

router = APIRouter(prefix="/api", tags=["stores & products"])


@router.get("/stores", response_model=list[StoreRow])
def list_stores(conn: sqlite3.Connection = Depends(get_db)) -> list[StoreRow]:
    return list(load_stores(conn).values())


@router.get("/stores/{store_id}/inventory", response_model=StoreInventoryResponse)
def store_inventory(
    store_id: int,
    product_id: Optional[int] = None,
    conn: sqlite3.Connection = Depends(get_db),
) -> StoreInventoryResponse:
    params: list[object] = [store_id]
    conditions: list[str] = []
    if product_id is not None:
        conditions.append("AND p.product_id = ?")
        params.append(product_id)
    extra_where = " ".join(conditions)

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
        {extra_where}
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


@router.get("/products", response_model=list[ProductRow])
def list_products(conn: sqlite3.Connection = Depends(get_db)) -> list[ProductRow]:
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


@router.get("/products/{product_id}/sizes", response_model=list[ProductSizeRow])
def list_product_sizes(
    product_id: int,
    conn: sqlite3.Connection = Depends(get_db),
) -> list[ProductSizeRow]:
    cur = conn.execute(
        "SELECT size_id, size FROM product_sizes WHERE product_id = ? ORDER BY size",
        (product_id,),
    )
    return [
        ProductSizeRow(size_id=int(r["size_id"]), size=str(r["size"]))
        for r in cur.fetchall()
    ]
