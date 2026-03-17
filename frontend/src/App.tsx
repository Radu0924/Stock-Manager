import { useState } from 'react'
import { Layout, type Tab } from './components/Layout'
import { AlertsPage, AlertsRightPanel } from './pages/AlertsPage'
import { AlertsHistoryPage, AlertsHistoryRightPanel } from './pages/AlertsHistoryPage'
import { AuditLogsPage, AuditLogsRightPanel } from './pages/AuditLogsPage'
import { DashboardPage, DashboardRightPanel } from './pages/DashboardPage'
import { InventoryPage, InventoryRightPanel } from './pages/InventoryPage'
import { InsightsPage, InsightsRightPanel } from './pages/InsightsPage'
import { InteractiveMapPage, InteractiveMapRightPanel, type StoreMapData } from './pages/InteractiveMapPage'
import { LogisticsPage, LogisticsRightPanel, type LogisticsStats } from './pages/LogisticsPage'
import { LoginPage } from './pages/LoginPage'
import { SettingsPage, SettingsRightPanel } from './pages/SettingsPage'
import { WorkflowPage, WorkflowRightPanel } from './pages/WorkflowPage'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { usePageData } from './hooks/usePageData'
import type { AuditLogRow } from './pages/AuditLogsPage'

const pageTitles: Record<Tab, string> = {
  dashboard: 'Retail Supply Chain Dashboard',
  inventory: 'Supply Chain Inventory Optimizer - Real-Time View',
  alerts: 'Store Alerts - Real-Time',
  workflow: 'Transfer Workflow - Decision Engine',
  'alerts-history': 'Store Alerts History - Real-Time',
  settings: 'Configuration',
  'audit-logs': 'Audit Logs',
  insights: 'Supply Chain Insights & Analytics',
  map: '',
  logistics: 'Logistics & Shipment Tracking',
}

function AuthenticatedApp() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const pageData = usePageData()
  const { user, logout } = useAuth()
  const [auditRows, setAuditRows] = useState<AuditLogRow[]>([])
  const [mapStoreData, setMapStoreData] = useState<StoreMapData[]>([])
  const [logisticsStats, setLogisticsStats] = useState<LogisticsStats | null>(null)

  const rightPanel = (() => {
    if (tab === 'dashboard') return <DashboardRightPanel rows={pageData.dashboardRows} />
    if (tab === 'inventory') return <InventoryRightPanel skuRows={pageData.inventorySkuRows} storeRows={pageData.inventoryStoreRows} />
    if (tab === 'alerts') return <AlertsRightPanel data={pageData.alertsData} />
    if (tab === 'workflow') return <WorkflowRightPanel data={pageData.workflowData} storeNameById={pageData.storeNameById} />
    if (tab === 'alerts-history') return <AlertsHistoryRightPanel rows={pageData.alertsHistoryRows} />
    if (tab === 'settings') return <SettingsRightPanel />
    if (tab === 'audit-logs') return <AuditLogsRightPanel rows={auditRows} />
    if (tab === 'insights') return <InsightsRightPanel />
    if (tab === 'map') return <InteractiveMapRightPanel storeData={mapStoreData} />
    if (tab === 'logistics') return <LogisticsRightPanel stats={logisticsStats} />
    return undefined
  })()

  return (
    <Layout
      activeTab={tab}
      onTabChange={setTab}
      pageTitle={pageTitles[tab]}
      rightPanel={rightPanel}
      username={user?.username}
      onLogout={logout}
    >
      {tab === 'dashboard' ? <DashboardPage onDataChange={pageData.setDashboardRows} /> : null}
      {tab === 'inventory' ? <InventoryPage onSkuDataChange={pageData.setInventorySkuRows} onStoreDataChange={pageData.setInventoryStoreRows} /> : null}
      {tab === 'alerts' ? <AlertsPage onDataChange={pageData.setAlertsData} /> : null}
      {tab === 'workflow' ? <WorkflowPage onDataChange={pageData.setWorkflowData} onStoreMapChange={pageData.setStoreNameById} /> : null}
      {tab === 'alerts-history' ? <AlertsHistoryPage onDataChange={pageData.setAlertsHistoryRows} /> : null}
      {tab === 'settings' ? <SettingsPage /> : null}
      {tab === 'audit-logs' ? <AuditLogsPage onDataChange={setAuditRows} /> : null}
      {tab === 'insights' ? <InsightsPage /> : null}
      {tab === 'map' ? <InteractiveMapPage onStoreDataChange={setMapStoreData} /> : null}
      {tab === 'logistics' ? <LogisticsPage onDataChange={setLogisticsStats} /> : null}
    </Layout>
  )
}

function App() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-panel-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    )
  }

  if (!user) return <LoginPage />

  return <AuthenticatedApp />
}

function AppWrapper() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  )
}

export default AppWrapper
