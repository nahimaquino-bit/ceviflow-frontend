import React from 'react';

const SalesHistory = ({ 
  sales, 
  filterStartDate, 
  setFilterStartDate, 
  filterEndDate, 
  setFilterEndDate, 
  fetchSales, 
  exportToExcel,
  todayStr 
}) => {
  const isToday = filterStartDate === todayStr && filterEndDate === todayStr;
  const rangeLabel = isToday ? 'Hoy' : 'del Rango';
  
  const totalRevenue = sales.reduce((acc, s) => acc + Number(s.total), 0).toFixed(2);
  const totalOrders = sales.length;
  const cashTotal = sales
    .filter(s => s.payment_method === 'Efectivo')
    .reduce((acc, s) => acc + Number(s.total), 0).toFixed(2);
  const transferTotal = sales
    .filter(s => s.payment_method === 'Transferencia')
    .reduce((acc, s) => acc + Number(s.total), 0).toFixed(2);

  return (
    <main className="screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
        <div>
          <div className="section-title">Historial de Ventas</div>
          <div className="section-subtitle">Consulta y filtra tus transacciones</div>
        </div>
        <button className="btn-icon" onClick={exportToExcel} style={{ padding: '10px', fontSize: '18px' }} title="Descargar Excel">
          📊
        </button>
      </div>

      {/* Date Filter UI */}
      <div className="card" style={{ marginBottom: '20px', padding: '15px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-field" style={{ flex: 1, minWidth: '140px', marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '12px' }}>Desde</label>
            <input 
              type="date" 
              className="form-input" 
              value={filterStartDate} 
              onChange={(e) => setFilterStartDate(e.target.value)}
            />
          </div>
          <div className="form-field" style={{ flex: 1, minWidth: '140px', marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '12px' }}>Hasta</label>
            <input 
              type="date" 
              className="form-input" 
              value={filterEndDate} 
              onChange={(e) => setFilterEndDate(e.target.value)}
            />
          </div>
          <button 
            className="btn-icon" 
            onClick={() => fetchSales(true)}
            style={{ padding: '10px 15px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            🔄
          </button>
        </div>
      </div>

      {/* Daily Totals Summary */}
      <div className="summary-grid">
        <div className="summary-box">
          <div className="summary-val">${totalRevenue}</div>
          <div className="summary-lab">Venta Total {rangeLabel}</div>
        </div>
        <div className="summary-box accent">
          <div className="summary-val">{totalOrders}</div>
          <div className="summary-lab">Pedidos {rangeLabel}</div>
        </div>
      </div>

      <div className="payment-methods-summary" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <div className="card" style={{ flex: 1, padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>💵 EFECTIVO</div>
          <div style={{ fontWeight: '800', color: 'var(--mint)' }}>${cashTotal}</div>
        </div>
        <div className="card" style={{ flex: 1, padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>📱 TRANSF.</div>
          <div style={{ fontWeight: '800', color: 'var(--mint)' }}>${transferTotal}</div>
        </div>
      </div>

      <div className="sales-list">
        {sales.length === 0 ? (
          <div className="empty-state">No hay ventas registradas</div>
        ) : (
          sales.map(sale => (
            <div key={sale.id} className="sale-card">
              <div className="sale-header">
                <div className="sale-time">
                  {new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  <span className="sale-date"> - {new Date(sale.created_at).toLocaleDateString()}</span>
                </div>
                <div className="sale-method">{sale.payment_method === 'Efectivo' ? '💵' : '📱'}</div>
              </div>
              <div className="sale-items" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {sale.items.map((it, idx) => (
                  <div key={idx} className="sale-item-row" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                      {it.name} <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>x{it.qtyHere + it.qtyToGo}</span>
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {it.qtyHere > 0 && <span>🍽️ {it.qtyHere} aquí</span>}
                      {it.qtyHere > 0 && it.qtyToGo > 0 && <span> | </span>}
                      {it.qtyToGo > 0 && <span>🥡 {it.qtyToGo} llevar</span>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="sale-footer">
                <span className="sale-total-label">Total</span>
                <span className="sale-total">${Number(sale.total).toFixed(2)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
};

export default SalesHistory;
