export type Store = {
  store_id: number
  name: string
  city?: string | null
  address?: string | null
}

export type Product = {
  product_id: number
  name: string
  category?: string | null
  gender?: string | null
  unit_price?: number | null
  image_url?: string | null
}

export type ProductSize = {
  size_id: number
  size: string
}

export type DashboardStockRow = {
  store_id: number
  store_name: string
  total_quantity: number
  last_updated?: string | null
}

export type DashboardStockResponse = {
  rows: DashboardStockRow[]
}

export type StockoutRow = {
  store_id: number
  store_name: string
  product_id: number
  product_name: string
  size: string
  size_id: number
  current_stock: number
  daily_speed: number
  DoS: number
  classification: 'Slow' | 'Normal' | 'Fast'
  is_stockout: boolean
}

export type StockoutResponse = {
  threshold_DoS: number
  rows: StockoutRow[]
}

export type TransferOrder = {
  source_id: number
  destination_id: number
  quantity: number
  type: 'automatic' | 'manager_approval'
}

export type WorkflowDestinationExplain = {
  store_id: number
  DoS: number
  free_capacity: number
  route_cost: number
  score: number
}

export type WorkflowSourceExplain = {
  store_id: number
  available_surplus: number
}

export type WorkflowItem = {
  size_id: number
  product_id: number
  product_name: string
  size: string
  unit_price?: number | null
  orders: TransferOrder[]
  explain: {
    sources: WorkflowSourceExplain[]
    destinations: WorkflowDestinationExplain[]
  }
}

export type WorkflowResponse = {
  meta: Record<string, unknown>
  items: WorkflowItem[]
}

// ── Inventory page (built from existing stockout + dashboard endpoints) ──

export type InventorySkuRow = {
  store_id: number
  store_name: string
  product_id: number
  product_name: string
  size: string
  size_id: number
  current_stock: number
  daily_speed: number
  DoS: number
  classification: 'Slow' | 'Normal' | 'Fast'
  is_stockout: boolean
  unit_price?: number | null
  category?: string | null
}

// ── Alerts History page (mock data until backend delivers endpoint) ──

export type AlertSeverity = 'Critical' | 'High' | 'Medium' | 'Low'

export type AlertHistoryRow = {
  alert_id: number
  timestamp: string
  alert_type: string
  severity: AlertSeverity
  trigger_subject: string
  store_id: number
  store_name: string
  duration: string
  action: string
  result: 'Success' | 'Failure' | 'Pending'
}

export type AlertHistoryResponse = {
  rows: AlertHistoryRow[]
}
