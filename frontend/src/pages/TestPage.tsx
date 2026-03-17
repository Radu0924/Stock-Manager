import { useEffect, useState } from 'react'
import { fetchJson } from '../lib/api'

export function TestPage() {
  const [status, setStatus] = useState('Loading...')
  const [results, setResults] = useState<any[]>([])

  useEffect(() => {
    async function test() {
      try {
        setStatus('Testing /api/dashboard/stock...')
        const stockResp = await fetchJson(`/api/dashboard/stock?_t=${Date.now()}`)
        console.log('Stock API response:', stockResp)
        
        setStatus('Testing /api/products...')
        const productsResp = await fetchJson(`/api/products?_t=${Date.now()}`)
        console.log('Products API response:', productsResp)
        
        setResults([
          { endpoint: '/api/dashboard/stock', success: true, data: stockResp },
          { endpoint: '/api/products', success: true, count: Array.isArray(productsResp) ? productsResp.length : 'N/A' }
        ])
        setStatus('All tests completed successfully!')
      } catch (error) {
        console.error('API test error:', error)
        setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
        setResults([{ endpoint: 'error', success: false, error: String(error) }])
      }
    }
    
    test()
  }, [])

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-white">API Test Page</h1>
      <div className="text-slate-300">Status: {status}</div>
      <div className="space-y-2">
        {results.map((result, idx) => (
          <div key={idx} className="bg-panel-surface p-3 rounded border border-panel-border">
            <div className="font-semibold text-white">{result.endpoint}</div>
            <div className={result.success ? 'text-green-400' : 'text-red-400'}>
              {result.success ? '✓ Success' : '✗ Failed'}
            </div>
            {result.count && <div className="text-slate-300">Count: {result.count}</div>}
            {result.error && <div className="text-red-400 text-sm">Error: {result.error}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}