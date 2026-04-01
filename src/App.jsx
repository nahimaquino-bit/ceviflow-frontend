import { useState, useEffect, useCallback } from 'react'

const API = (import.meta.env.VITE_API_URL || '') + '/api'


const getEmoji = (name) => {
  const n = name.toLowerCase();
  if (n.includes('ceviche')) return '🥘';
  if (n.includes('cola') || n.includes('gaseosa') || n.includes('fanta') || n.includes('sprite')) return '🥤';
  if (n.includes('agua')) return '💧';
  if (n.includes('chifle')) return '🍌';
  if (n.includes('cerveza')) return '🍺';
  if (n.includes('arroz') || n.includes('chaufa')) return '🍛';
  if (n.includes('pescado')) return '🐟';
  if (n.includes('marisco')) return '🦑';
  if (n.includes('leche')) return '🥛';
  return '🍽️';
};

export default function App() {
  const [tab, setTab] = useState('calculator') // 'calculator' | 'admin'
  const [dishes, setDishes] = useState([])
  const [quantities, setQuantities] = useState({}) // { id: { here: 0, toGo: 0 } }
  const [amountPaid, setAmountPaid] = useState('')
  const [toast, setToast] = useState({ msg: '', visible: false })

  // Admin state
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newCategory, setNewCategory] = useState('Plato')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editCategory, setEditCategory] = useState('Plato')

  // Fetch dishes from backend
  const fetchDishes = useCallback(async () => {
    try {
      const res = await fetch(`${API}/dishes`)
      if (res.ok) {
        const data = await res.json()
        setDishes(data)
      } else {
        showToast(`❌ Error: ${res.status} al cargar platos`)
      }
    } catch (err) {
      showToast('❌ No se pudo conectar con el servidor')
    }
  }, [])

  useEffect(() => { fetchDishes() }, [fetchDishes])

  // Show toast notification
  const showToast = (msg) => {
    setToast({ msg, visible: true })
    setTimeout(() => setToast({ msg: '', visible: false }), 2500)
  }

  // ===== Calculator Logic =====
  const adjustQty = (id, type, delta) => {
    setQuantities(prev => {
      const key = String(id);
      const val = prev[key];
      const current = (val && typeof val === 'object') ? val : { here: 0, toGo: 0 };
      const nextVal = Math.max(0, (current[type] || 0) + delta);
      
      const newState = { 
        ...prev, 
        [key]: { 
          ...current, 
          [type]: nextVal 
        } 
      };
      
      // For debugging in browser console
      console.log(`Adjusting ${key} (${type}): ${current[type]} -> ${nextVal}`);
      return newState;
    });
  }

  const orderItems = dishes
    .map(d => {
      const val = quantities[d.id]
      const q = (val && typeof val === 'object') ? val : { here: 0, toGo: 0 }
      return { 
        ...d, 
        qtyHere: q.here || 0, 
        qtyToGo: q.toGo || 0, 
        totalQty: (q.here || 0) + (q.toGo || 0) 
      }
    })
    .filter(d => d.totalQty > 0)

  const subtotal = orderItems.reduce((sum, d) => sum + d.price * d.totalQty, 0)
  const toGoFee = 0.25
  const toGoTotal = orderItems.reduce((sum, d) => {
    // Only apply fee if it's a Plato
    return d.category === 'Otro' ? sum : sum + (d.qtyToGo * toGoFee)
  }, 0)
  const total = subtotal + toGoTotal

  const paid = parseFloat(amountPaid) || 0
  const change = paid - total

  const resetOrder = () => {
    setQuantities({})
    setAmountPaid('')
  }

  // ===== Admin Logic =====
  const addDish = async (e) => {
    e.preventDefault()
    if (!newName.trim() || !newPrice) return
    try {
      const res = await fetch(`${API}/dishes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newName.trim(), 
          price: newPrice,
          category: newCategory 
        })
      })
      if (res.ok) {
        await fetchDishes()
        setNewName('')
        setNewPrice('')
        setNewCategory('Plato')
        showToast('✅ Producto agregado')
      } else {
        const errData = await res.json().catch(() => ({}))
        showToast(`❌ Error ${res.status}: ${errData.error || 'No se pudo guardar'}`)
      }
    } catch (err) {
      showToast('❌ Error de conexión al guardar')
    }
  }

  const deleteDish = async (id) => {
    try {
      await fetch(`${API}/dishes/${id}`, { method: 'DELETE' })
      await fetchDishes()
      setQuantities(prev => { const n = { ...prev }; delete n[id]; return n })
      showToast('🗑️ Plato eliminado')
    } catch { showToast('❌ Error al eliminar') }
  }

  const startEdit = (dish) => {
    setEditingId(dish.id)
    setEditName(dish.name)
    setEditPrice(dish.price.toString())
    setEditCategory(dish.category || 'Plato')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditPrice('')
    setEditCategory('Plato')
  }

  const saveEdit = async (id) => {
    if (!editName.trim() || !editPrice) return
    try {
      const res = await fetch(`${API}/dishes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: editName.trim(), 
          price: editPrice,
          category: editCategory 
        })
      })
      if (res.ok) {
        await fetchDishes()
        cancelEdit()
        showToast('✏️ Producto actualizado')
      }
    } catch { showToast('❌ Error al actualizar') }
  }

  return (
    <div className="app">
      {/* Header */}
      {/* Header (Minimalist) */}
      <header className="header" style={{ paddingBottom: '10px' }}>
        <div className="logo-wrapper">
          <div className="logo-text" style={{ fontSize: '24px', marginTop: '0' }}>
            <span className="cevi">CEVI</span><span className="flow">FLOW</span>
          </div>
        </div>
      </header>




      {/* ===== CALCULATOR SCREEN ===== */}
      {tab === 'calculator' && (
        <main className="screen">
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
                  const val = quantities[dish.id]
                  const q = (val && typeof val === 'object') ? val : { here: 0, toGo: 0 }
                  const hasQty = (q.here || 0) > 0 || (q.toGo || 0) > 0
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
                              onClick={() => adjustQty(dish.id, 'here', -1)}
                              disabled={(q.here || 0) === 0}
                            >−</button>
                            <span className="counter-value">{q.here || 0}</span>
                            <button
                              className="counter-btn"
                              onClick={() => adjustQty(dish.id, 'here', 1)}
                            >+</button>
                          </div>
                        </div>

                        {dish.category !== 'Otro' && (
                          <div className="counter-group">
                            <label>🥡 Llevar</label>
                            <div className="counter">
                              <button
                                className="counter-btn minus"
                                onClick={() => adjustQty(dish.id, 'toGo', -1)}
                                disabled={(q.toGo || 0) === 0}
                              >−</button>
                              <span className="counter-value">{q.toGo || 0}</span>
                              <button
                                className="counter-btn"
                                onClick={() => adjustQty(dish.id, 'toGo', 1)}
                              >+</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
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
                  {paid > 0 && (
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

              {/* Reset */}
              {(total > 0 || amountPaid) && (
                <button className="btn-reset" onClick={resetOrder}>
                  🔄 Nuevo pedido
                </button>
              )}
            </>
          )}
        </main>
      )}

      {/* ===== ADMIN SCREEN ===== */}
      {tab === 'admin' && (
        <main className="screen">
          {/* Add new dish */}
          <div className="card">
            <div className="section-title">Agregar producto</div>
            <div className="section-subtitle">Escribe el nombre y precio del producto</div>
            <form className="admin-form" onSubmit={addDish}>
              <div className="form-row">
                <div className="form-field">
                  <label className="form-label">Nombre</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Ceviche Rojo"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Precio ($)</label>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="2.50"
                    value={newPrice}
                    onChange={e => setNewPrice(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="form-field" style={{ marginTop: '4px', marginBottom: '8px' }}>
                <label className="form-label">Tipo de Producto</label>
                <div className="category-toggle">
                  <button 
                    type="button" 
                    className={`category-option ${newCategory === 'Plato' ? 'active' : ''}`}
                    onClick={() => setNewCategory('Plato')}
                  >
                    🍲 Plato (con envase)
                  </button>
                  <button 
                    type="button" 
                    className={`category-option ${newCategory === 'Otro' ? 'active' : ''}`}
                    onClick={() => setNewCategory('Otro')}
                  >
                    🥤 Otro (bebida/extra)
                  </button>
                </div>
              </div>
              <button className="btn-primary" type="submit">
                + Agregar producto
              </button>
            </form>
          </div>

          {/* Dish list */}
          <div>
            <div className="section-title" style={{ marginBottom: 12 }}>
              Mis productos ({dishes.length})
            </div>
            {dishes.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🍽️</div>
                <div className="empty-state-text">No hay productos todavía</div>
              </div>
            ) : (
              <div className="dish-list">
                {dishes.map(dish => (
                  <div key={dish.id} className="admin-dish-item">
                    {editingId === dish.id ? (
                      <div className="edit-inline" style={{ flex: 1 }}>
                        <div className="edit-inline-row">
                          <input
                            className="form-input"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            placeholder="Nombre"
                          />
                          <input
                            className="form-input"
                            type="number"
                            min="0"
                            step="0.01"
                            value={editPrice}
                            onChange={e => setEditPrice(e.target.value)}
                            placeholder="Precio"
                          />
                        </div>
                        
                        <div className="category-toggle" style={{ marginTop: '8px' }}>
                          <button 
                            type="button" 
                            className={`category-option ${editCategory === 'Plato' ? 'active' : ''}`}
                            onClick={() => setEditCategory('Plato')}
                          >
                            🍲 Plato
                          </button>
                          <button 
                            type="button" 
                            className={`category-option ${editCategory === 'Otro' ? 'active' : ''}`}
                            onClick={() => setEditCategory('Otro')}
                          >
                            🥤 Otro
                          </button>
                        </div>

                        <div className="edit-actions" style={{ marginTop: '8px' }}>
                          <button className="btn-primary" style={{ flex: 1, padding: '10px' }} onClick={() => saveEdit(dish.id)}>
                            Guardar
                          </button>
                          <button className="btn-icon" style={{ flex: 1, padding: '10px' }} onClick={cancelEdit}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="admin-dish-info">
                          <div className="admin-dish-name">{dish.name}</div>
                          <div className="admin-dish-price">${Number(dish.price).toFixed(2)}</div>
                        </div>
                        <div className="admin-dish-actions">
                          <button className="btn-icon" onClick={() => startEdit(dish)}>✏️ Editar</button>
                          <button className="btn-icon danger" onClick={() => deleteDish(dish.id)}>🗑️</button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      )}

      {/* Bottom Tab Navigation (iOS Style) */}
      <nav className="tab-nav">
        <button
          className={`tab-btn ${tab === 'calculator' ? 'active' : ''}`}
          onClick={() => setTab('calculator')}
        >
          <span>🧮</span>
          <span>Calcular</span>
        </button>
        <button
          className={`tab-btn ${tab === 'admin' ? 'active' : ''}`}
          onClick={() => setTab('admin')}
        >
          <span>⚙️</span>
          <span>Productos</span>
        </button>
      </nav>

      {/* Toast */}
      <div className={`toast ${toast.visible ? 'visible' : ''}`}>{toast.msg}</div>
    </div>
  )
}
