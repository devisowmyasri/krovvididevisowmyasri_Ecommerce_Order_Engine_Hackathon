import React, { useState, useEffect } from 'react';
import './index.css';

function App() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [logs, setLogs] = useState([]);
  const [alerts, setAlerts] = useState([]);

  const fetchData = async () => {
    try {
      const [resP, resO, resL, resA] = await Promise.all([
        fetch('http://localhost:3001/api/products'),
        fetch('http://localhost:3001/api/orders'),
        fetch('http://localhost:3001/api/logs'),
        fetch('http://localhost:3001/api/alerts')
      ]);

      setProducts(await resP.json());
      setOrders(await resO.json());
      setLogs((await resL.json()).reverse());
      setAlerts(await resA.json());
    } catch (e) {
      console.error("Backend not running or CORS issue.");
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-container">
      <header>
        <div>
          <h1>Engine Dashboard</h1>
          <p style={{ color: 'var(--text-dim)' }}>Real-time Distributed Backend Simulation</p>
        </div>
        <div className="badge info">SYSTEM LIVE</div>
      </header>

      <div className="dashboard-grid">
        {/* Inventory Panel */}
        <div className="panel">
          <h2>Inventory Management</h2>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Price</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>{p.name}</td>
                  <td>₹{p.price}</td>
                  <td>
                    {p.stock}
                    <div className="stock-bar">
                      <div 
                        className={`stock-fill ${p.stock <= 5 ? 'low' : ''}`} 
                        style={{ width: `${Math.min(p.stock * 2, 100)}%` }}
                      ></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Order Lifecycle Panel */}
        <div className="panel">
          <h2>Order State Machine</h2>
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td>{o.id}</td>
                  <td>₹{o.total}</td>
                  <td>
                    <span className={`badge ${
                      o.state === 'PAID' ? 'success' : 
                      o.state === 'FAILED' ? 'error' : 
                      o.state === 'CANCELLED' ? 'error' :
                      'warning'
                    }`}>
                      {o.state}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Audit Logs */}
        <div className="panel" style={{ gridColumn: 'span 1' }}>
          <h2>Audit & Recovery Logs</h2>
          <div className="log-list">
            {logs.map((log, i) => (
              <div key={i} className="log-item">
                {log}
              </div>
            ))}
          </div>
        </div>

        {/* Alerts & Simulation */}
        <div className="panel">
          <h2>System Alerts</h2>
          {alerts.length === 0 && <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>No active alerts.</p>}
          {alerts.map(a => (
            <div key={a.id} className="log-item" style={{ color: 'var(--error)' }}>
              ⚠️ Low Stock Warning: {a.name} ({a.stock} left)
            </div>
          ))}
          
          <div style={{ marginTop: '2rem' }}>
            <h2>Simulation Controls</h2>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
              Use the CLI app to trigger failure modes and concurrency simulations. The dashboard will reflect state changes automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
