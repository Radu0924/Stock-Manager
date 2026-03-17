import { useCallback, useState } from 'react'
import type { AlertHistoryRow, DashboardStockRow, InventorySkuRow, StockoutResponse, WorkflowResponse } from '../lib/types'

export function usePageData() {
  const [dashboardRows, setDashboardRows] = useState<DashboardStockRow[]>([])
  const [alertsData, setAlertsData] = useState<StockoutResponse | null>(null)
  const [workflowData, setWorkflowData] = useState<WorkflowResponse | null>(null)
  const [storeNameById, setStoreNameById] = useState<Map<number, string>>(new Map())
  const [inventorySkuRows, setInventorySkuRows] = useState<InventorySkuRow[]>([])
  const [inventoryStoreRows, setInventoryStoreRows] = useState<DashboardStockRow[]>([])
  const [alertsHistoryRows, setAlertsHistoryRows] = useState<AlertHistoryRow[]>([])

  return {
    dashboardRows,
    setDashboardRows: useCallback((rows: DashboardStockRow[]) => setDashboardRows(rows), []),
    alertsData,
    setAlertsData: useCallback((data: StockoutResponse | null) => setAlertsData(data), []),
    workflowData,
    setWorkflowData: useCallback((data: WorkflowResponse | null) => setWorkflowData(data), []),
    storeNameById,
    setStoreNameById: useCallback((map: Map<number, string>) => setStoreNameById(map), []),
    inventorySkuRows,
    setInventorySkuRows: useCallback((rows: InventorySkuRow[]) => setInventorySkuRows(rows), []),
    inventoryStoreRows,
    setInventoryStoreRows: useCallback((rows: DashboardStockRow[]) => setInventoryStoreRows(rows), []),
    alertsHistoryRows,
    setAlertsHistoryRows: useCallback((rows: AlertHistoryRow[]) => setAlertsHistoryRows(rows), []),
  }
}
