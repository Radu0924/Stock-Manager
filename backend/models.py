from typing import Any, Literal, Optional

from pydantic import BaseModel


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


# ── Alerts History ──

class AlertHistoryRow(BaseModel):
    alert_id: int
    timestamp: str
    alert_type: str
    severity: Literal["Critical", "High", "Medium", "Low"]
    trigger_subject: str
    store_id: int
    store_name: str
    duration: Optional[str] = None
    action_taken: Optional[str] = None
    result: Optional[Literal["Success", "Failure", "Pending"]] = None
    resolved_at: Optional[str] = None


class AlertHistoryResponse(BaseModel):
    rows: list[AlertHistoryRow]
