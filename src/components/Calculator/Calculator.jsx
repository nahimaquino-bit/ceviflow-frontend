import React, { useState, useEffect } from 'react';
import { getEmoji } from '../../utils/helpers';
import haptics from '../../utils/haptics';
import syncManager from '../../utils/syncManager';

const Calculator = ({ 
  dishes, 
  quantities, 
  adjustQty, 
  orderItems, 
  subtotal, 
  toGoTotal, 
  total, 
  paymentMethod, 
  setPaymentMethod, 
  amountPaid, 
  setAmountPaid, 
  paid, 
  change, 
  resetOrder, 
  finalizeSale, 
  isSaving 
}) => {
  const [pendingSync, setPendingSync] = useState(0);

  useEffect(() => {
    setPendingSync(syncManager.getPendingCount());
    
    // Check sync status every 30 seconds
    const interval = setInterval(() => {
      setPendingSync(syncManager.getPendingCount());
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const handleAdjust = (id, type, delta) => {
    haptics.click();
    adjustQty(id, type, delta);
  };

  const handleFinalize = async () => {
    if (!navigator.onLine) {
      haptics.warning();
      const saleData = {
        items: orderItems,
        subtotal,
        togo_fee: toGoTotal,
        total,
        payment_method: paymentMethod,
        amount_paid: paid,
        change_given: Math.max(0, change)
      };
      syncManager.enqueueSale(saleData);
      setPendingSync(syncManager.getPendingCount());
      resetOrder();
      haptics.success();
      alert('📴 Sin conexión. Venta guardada localmente. Se sincronizará cuando vuelvas a tener internet.');
      return;
    }

    const success = await finalizeSale();
    if (success) {
      haptics.success();
      setPendingSync(syncManager.getPendingCount());
    } else {
      haptics.error();
    }
  };

  return (
    <main className="screen">
      {pendingSync > 0 && (
        <div className="sync-banner" onClick={() => syncManager.sync().then(res => setPendingSync(syncManager.getPendingCount()))}>
          🔄 {pendingSync} {pendingSync === 1 ? 'venta' : 'ventas'} por sincronizar. Toca para reintentar.
        </div>
      )}

      {dishes.length === 0 ? (
        <div className="no-dishes">
          <div style={{ fontSize: 48, marginBottom: 12 }}>🍋</div>
          <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>
            Aún no tienes platos
          </strong>
          Ve a la pestaña <strong>⚙️ Productos</strong> para agregar tu menú y sus precios.
        </div>
      ) : (
        <>
          {/* Dish Counters */}
          <div className="dish-list">
            {dishes.map(dish => {
              const val = quantities[dish.id];
              const q = (val && typeof val === 'object') ? val : { here: 0, toGo: 0 };
              const hasQty = (q.here || 0) > 0 || (q.toGo || 0) > 0;
              return (
                <div key={dish.id} className={`product-card ${hasQty ? 'has-quantity' : ''}`}>
                  <div className="product-emoji">{getEmoji(dish.name)}</div>
                  <div className="dish-info">
                    <div className="dish-name">{dish.name}</div>
                    <div className="dish-price">${Number(dish.price).toFixed(2)} c/u</div>
                  </div>
                  
                  <div className="counters-container">
                    <div className="counter-group">
                      <label>🍽️ Aquí</label>
                      <div className="counter">
                        <button
                          className="counter-btn minus"
                          onClick={() => handleAdjust(dish.id, 'here', -1)}
                          disabled={(q.here || 0) === 0}
                        >−</button>
                        <span className="counter-value">{q.here || 0}</span>
                        <button
                          className="counter-btn"
                          onClick={() => handleAdjust(dish.id, 'here', 1)}
                        >+</button>
                      </div>
                    </div>

                    {dish.category !== 'Otro' && (
                      <div className="counter-group">
                        <label>🥡 Llevar</label>
                        <div className="counter">
                          <button
                            className="counter-btn minus"
                            onClick={() => handleAdjust(dish.id, 'toGo', -1)}
                            disabled={(q.toGo || 0) === 0}
                          >−</button>
                          <span className="counter-value">{q.toGo || 0}</span>
                          <button
                            className="counter-btn"
                            onClick={() => handleAdjust(dish.id, 'toGo', 1)}
                          >+</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total */}
          <div className="totals-card">
            <div className="totals-title">Resumen del pedido</div>
            {orderItems.length > 0 ? (
              <div className="order-summary-items">
                {orderItems.map(item => (
                  <div key={item.id} className="order-summary-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <span>{item.name} (×{item.totalQty})</span>
                      <span>${(item.price * item.totalQty).toFixed(2)}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {item.qtyHere > 0 && <span>🍽️ {item.qtyHere} aquí</span>}
                      {item.qtyHere > 0 && item.qtyToGo > 0 && <span> | </span>}
                      {item.qtyToGo > 0 && <span>🥡 {item.qtyToGo} llevar</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 14 }}>
                Usa los botones + para armar el pedido
              </div>
            )}
            {toGoTotal > 0 && (
              <div className="total-row to-go-row">
                <span className="to-go-label">📦 Cobro envase(s) para llevar</span>
                <span className="to-go-amount">+${toGoTotal.toFixed(2)}</span>
              </div>
            )}
            <div className="total-row">
              <span className="total-label">TOTAL</span>
              <span className="total-amount">${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment / Change */}
          {total > 0 && (
            <div className="payment-card">
              <div className="payment-title">💵 Cobro y vuelto</div>
              
              <div className="form-field" style={{ marginBottom: '12px' }}>
                <label className="input-label">Método de Pago</label>
                <div className="category-toggle">
                  <button 
                    type="button" 
                    className={`category-option ${paymentMethod === 'Efectivo' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('Efectivo')}
                  >
                    💵 Efectivo
                  </button>
                  <button 
                    type="button" 
                    className={`category-option ${paymentMethod === 'Transferencia' ? 'active' : ''}`}
                    onClick={() => setPaymentMethod('Transferencia')}
                  >
                    📱 Transferencia
                  </button>
                </div>
              </div>

              {paymentMethod === 'Efectivo' && (
                <div className="input-group">
                  <label className="input-label">¿Cuánto te dieron?</label>
                  <input
                    className="money-input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="$0.00"
                    value={amountPaid}
                    onChange={e => setAmountPaid(e.target.value)}
                  />
                </div>
              )}

              {paymentMethod === 'Efectivo' && paid > 0 && (
                <div className={`change-result ${change < 0 ? 'insufficient' : ''}`}>
                  <span className="change-label">
                    {change >= 0 ? 'Vuelto a dar:' : 'Falta:'}
                  </span>
                  <span className="change-amount">
                    {change >= 0
                      ? `$${change.toFixed(2)}`
                      : `Faltan $${Math.abs(change).toFixed(2)}`
                    }
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Reset / Finalize */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            {(total > 0 || amountPaid) && (
              <button className="btn-icon" onClick={resetOrder} style={{ flex: 1, padding: '15px' }}>
                Limpiar
              </button>
            )}
            {total > 0 && (
              <button 
                className="btn-primary" 
                onClick={handleFinalize} 
                disabled={isSaving || (paymentMethod === 'Efectivo' && paid < total)}
                style={{ flex: 2 }}
              >
                {isSaving ? 'Guardando...' : 'Finalizar Venta'}
              </button>
            )}
          </div>
        </>
      )}
    </main>
  );
};

export default Calculator;
