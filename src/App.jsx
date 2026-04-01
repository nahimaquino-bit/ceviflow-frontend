import { useState, useEffect, useCallback } from 'react'

const API = (import.meta.env.VITE_API_URL || '') + '/api'


export default function App() {
  const [tab, setTab] = useState('calculator') // 'calculator' | 'admin'
  const [dishes, setDishes] = useState([])
  const [quantities, setQuantities] = useState({})
  const [amountPaid, setAmountPaid] = useState('')
  const [toast, setToast] = useState({ msg: '', visible: false })

  // Admin state
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')

  // Fetch dishes from backend
  const fetchDishes = useCallback(async () => {
    try {
      const res = await fetch(`${API}/dishes`)
      const data = await res.json()
      setDishes(data)
    } catch {
      // fallback: keep existing
    }
  }, [])

  useEffect(() => { fetchDishes() }, [fetchDishes])

  // Show toast notification
  const showToast = (msg) => {
    setToast({ msg, visible: true })
    setTimeout(() => setToast({ msg: '', visible: false }), 2500)
  }

  // ===== Calculator Logic =====
  const adjustQty = (id, delta) => {
    setQuantities(prev => {
      const current = prev[id] || 0
      const next = Math.max(0, current + delta)
      return { ...prev, [id]: next }
    })
  }

  const orderItems = dishes
    .map(d => ({ ...d, qty: quantities[d.id] || 0 }))
    .filter(d => d.qty > 0)

  const total = orderItems.reduce((sum, d) => sum + d.price * d.qty, 0)

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
        body: JSON.stringify({ name: newName.trim(), price: newPrice })
      })
      if (res.ok) {
        await fetchDishes()
        setNewName('')
        setNewPrice('')
        showToast('✅ Plato agregado')
      }
    } catch { showToast('❌ Error al agregar') }
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
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditPrice('')
  }

  const saveEdit = async (id) => {
    if (!editName.trim() || !editPrice) return
    try {
      const res = await fetch(`${API}/dishes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), price: editPrice })
      })
      if (res.ok) {
        await fetchDishes()
        cancelEdit()
        showToast('✏️ Plato actualizado')
      }
    } catch { showToast('❌ Error al actualizar') }
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="logo-wrapper">
          <div className="logo-glow-ring" />
          <img
            src="/logo.png"
            alt="CeviFlow Logo"
            className="logo-img"
          />
          <div className="logo-text">
            <span className="cevi">CEVI</span><span className="flow">FLOW</span>
          </div>
          <div className="logo-tagline">Calculadora de cevichería</div>
        </div>
      </header>


      {/* Tab Navigation */}
      <nav className="tab-nav">
        <button
          className={`tab-btn ${tab === 'calculator' ? 'active' : ''}`}
          onClick={() => setTab('calculator')}
        >
          🧮 Calcular
        </button>
        <button
          className={`tab-btn ${tab === 'admin' ? 'active' : ''}`}
          onClick={() => setTab('admin')}
        >
          ⚙️ Platos
        </button>
      </nav>

      {/* ===== CALCULATOR SCREEN ===== */}
      {tab === 'calculator' && (
        <main className="screen">
          {dishes.length === 0 ? (
            <div className="no-dishes">
              <div style={{ fontSize: 48, marginBottom: 12 }}>🍋</div>
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: 6 }}>
                Aún no tienes platos
              </strong>
              Ve a la pestaña <strong>⚙️ Platos</strong> para agregar tu menú y sus precios.
            </div>
          ) : (
            <>
              {/* Dish Counters */}
              <div className="dish-list">
                {dishes.map(dish => {
                  const qty = quantities[dish.id] || 0
                  return (
                    <div key={dish.id} className={`dish-row ${qty > 0 ? 'has-quantity' : ''}`}>
                      <div className="dish-info">
                        <div className="dish-name">{dish.name}</div>
                        <div className="dish-price">${Number(dish.price).toFixed(2)} c/u</div>
                        {qty > 0 && (
                          <div className="dish-subtotal">
                            = ${(dish.price * qty).toFixed(2)}
                          </div>
                        )}
                      </div>
                      <div className="counter">
                        <button
                          className="counter-btn minus"
                          onClick={() => adjustQty(dish.id, -1)}
                          disabled={qty === 0}
                          aria-label={`Reducir ${dish.name}`}
                        >−</button>
                        <span className="counter-value">{qty}</span>
                        <button
                          className="counter-btn"
                          onClick={() => adjustQty(dish.id, 1)}
                          aria-label={`Agregar ${dish.name}`}
                        >+</button>
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
                      <div key={item.id} className="order-summary-item">
                        <span>{item.name} × {item.qty}</span>
                        <span>${(item.price * item.qty).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 14 }}>
                    Agrega platos con los botones + para ver el total
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
            <div className="section-title">Agregar plato</div>
            <div className="section-subtitle">Escribe el nombre y precio del plato</div>
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
              <button className="btn-primary" type="submit">
                + Agregar plato
              </button>
            </form>
          </div>

          {/* Dish list */}
          <div>
            <div className="section-title" style={{ marginBottom: 12 }}>
              Mis platos ({dishes.length})
            </div>
            {dishes.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🍽️</div>
                <div className="empty-state-text">No hay platos todavía</div>
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
                        <div className="edit-actions">
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

      {/* Toast */}
      <div className={`toast ${toast.visible ? 'visible' : ''}`}>{toast.msg}</div>
    </div>
  )
}
