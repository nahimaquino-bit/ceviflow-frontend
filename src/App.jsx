import { useState, useEffect, useCallback, useRef } from 'react'

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
  const [dishes, setDishes] = useState(() => {
    try {
      const saved = localStorage.getItem('cachedDishes')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [quantities, setQuantities] = useState(() => {
    try {
      const saved = localStorage.getItem('currentOrder')
      return saved ? JSON.parse(saved) : {}
    } catch { return {} }
  }) // { id: { here: 0, toGo: 0 } }
  const [amountPaid, setAmountPaid] = useState('')
  const [toast, setToast] = useState({ msg: '', visible: false })

  // Theme state
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light')

  // Admin state
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newCategory, setNewCategory] = useState('Plato')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editCategory, setEditCategory] = useState('Plato')

  // Sales History state
  const [sales, setSales] = useState([])
  const [paymentMethod, setPaymentMethod] = useState('Efectivo') // 'Efectivo' | 'Transferencia'
  const [isSaving, setIsSaving] = useState(false)

  // Persistence: Save current order (quantities) to localStorage
  useEffect(() => {
    localStorage.setItem('currentOrder', JSON.stringify(quantities))
  }, [quantities])

  // Filter state (default today)
  const todayStr = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD
  const [filterStartDate, setFilterStartDate] = useState(todayStr)
  const [filterEndDate, setFilterEndDate] = useState(todayStr)

  // Tracking last fetch to avoid redundant calls
  const lastFetchedSalesRange = useRef({ start: '', end: '' })
  const hasLoadedDishes = useRef(false)

  // Fetch dishes from backend
  const fetchDishes = useCallback(async (force = false) => {
    // Cache: return if already loaded and not forced
    if (hasLoadedDishes.current && !force && dishes.length > 0) return
    
    try {
      const res = await fetch(`${API}/dishes`)
      if (res.ok) {
        const data = await res.json()
        setDishes(data)
        localStorage.setItem('cachedDishes', JSON.stringify(data)) // Save to persistent cache
        hasLoadedDishes.current = true
      } else {
        showToast(`❌ Error: ${res.status} al cargar platos`)
      }
    } catch (err) {
      showToast('❌ No se pudo conectar con el servidor')
    }
  }, [dishes.length])

  useEffect(() => { 
    // Auto-fetch only if empty or explicitly in admin to ensure sync
    if (dishes.length === 0 || tab === 'admin') {
      fetchDishes() 
    }
  }, [fetchDishes, tab, dishes.length])

  const fetchSales = useCallback(async (force = false) => {
    // Cache: Avoid fetching if dates haven't changed, unless forced
    if (!force && 
        lastFetchedSalesRange.current.start === filterStartDate && 
        lastFetchedSalesRange.current.end === filterEndDate &&
        sales.length > 0) {
      return
    }

    try {
      const params = new URLSearchParams()
      if (filterStartDate) params.append('startDate', filterStartDate)
      if (filterEndDate) params.append('endDate', filterEndDate)
      
      const res = await fetch(`${API}/sales?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setSales(data)
        lastFetchedSalesRange.current = { start: filterStartDate, end: filterEndDate }
      }
    } catch (err) {
      console.error('Error fetching sales:', err)
    }
  }, [filterStartDate, filterEndDate, sales.length])

  useEffect(() => {
    if (tab === 'ventas') fetchSales()
  }, [tab, fetchSales])

  // Show toast notification
  const showToast = (msg) => {
    setToast({ msg, visible: true })
    setTimeout(() => setToast({ msg: '', visible: false }), 2500)
  }

  // ===== Export Excel Logic =====
  const exportToExcel = () => {
    if (sales.length === 0) {
      showToast('⚠️ No hay ventas para exportar')
      return
    }
    
    // 1. Report Header (Organized for Excel)
    const reportHeader = [
      ["REPORTE DE VENTAS - CEVIFLOW"],
      [`Desde: ${filterStartDate} | Hasta: ${filterEndDate}`],
      [`Fecha de generación: ${new Date().toLocaleString()}`],
      [] // Empty line separator
    ]

    // 2. Table Headers
    const tableHeaders = ["FECHA", "HORA", "DETALLE DE PRODUCTOS", "SUBTOTAL ($)", "ENVASES ($)", "TOTAL COBRADO ($)", "MÉTODO"]
    
    // 3. Data Rows
    const rows = sales.map(s => {
      const dateObj = new Date(s.created_at)
      const dateStr = dateObj.toLocaleDateString()
      const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      
      // Better product list formatting
      const itemsStr = s.items.map(it => {
        const totalQty = it.qtyHere + it.qtyToGo
        let detailStr = `${it.name} x${totalQty}`
        if (it.qtyToGo > 0) detailStr += ` (📦${it.qtyToGo} para llevar)`
        return detailStr
      }).join(' • ')
      
      return [
        dateStr,
        timeStr,
        `"${itemsStr}"`,
        Number(s.subtotal).toFixed(2),
        Number(s.togo_fee).toFixed(2),
        Number(s.total).toFixed(2),
        s.payment_method.toUpperCase()
      ]
    })

    // 4. Totals Row
    const totalRev = sales.reduce((acc, s) => acc + Number(s.total), 0).toFixed(2)
    const totalSub = sales.reduce((acc, s) => acc + Number(s.subtotal), 0).toFixed(2)
    const totalEnv = sales.reduce((acc, s) => acc + Number(s.togo_fee), 0).toFixed(2)
    
    const summaryRows = [
      [],
      ["", "", "TOTALES", totalSub, totalEnv, totalRev, ""],
      ["", "", `PEDIDOS TOTALES: ${sales.length}`, "", "", "", ""]
    ]

    // 5. Build CSV Content with BOM for Excel compatibility (accents/emojis)
    const BOM = "\ufeff"
    const finalData = [...reportHeader, tableHeaders, ...rows, ...summaryRows]
    const csvContent = finalData.map(row => row.join(",")).join("\n")
    
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    
    // 6. Create download link
    const link = document.body.appendChild(document.createElement("a"))
    link.href = url
    link.download = `CeviFlow_Reporte_${filterStartDate}_a_${filterEndDate}.csv`
    link.click()
    document.body.removeChild(link)
    
    showToast('📊 Reporte generado con éxito')
  }

  // ===== Calculator Logic =====
  const adjustQty = (id, type, delta) => {
    setQuantities(prev => {
      const key = String(id);
      const val = prev[key];
      const current = (val && typeof val === 'object') ? val : { here: 0, toGo: 0 };
      const nextVal = Math.max(0, (current[type] || 0) + delta);
      
      // Haptic Feedback (Vibration) - subtle pulse
      if ("vibrate" in navigator) {
        navigator.vibrate(12);
      }

      const newState = { 
        ...prev, 
        [key]: { 
          ...current, 
          [type]: nextVal 
        } 
      };
      
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
    localStorage.removeItem('currentOrder') // Clear persistence
    setAmountPaid('')
    setPaymentMethod('Efectivo')
  }

  const finalizeSale = async () => {
    if (total <= 0 || isSaving) return
    
    setIsSaving(true)
    const saleData = {
      items: orderItems.map(item => ({
        id: item.id,
        name: item.name,
        qtyHere: item.qtyHere,
        qtyToGo: item.qtyToGo,
        price: item.price
      })),
      subtotal: subtotal,
      togo_fee: toGoTotal,
      total: total,
      payment_method: paymentMethod,
      amount_paid: paid,
      change_given: Math.max(0, change)
    }

    try {
      const res = await fetch(`${API}/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleData)
      })

      if (res.ok) {
        // Haptic Success Vibration
        if ("vibrate" in navigator) {
          navigator.vibrate([40, 10, 40]);
        }

        // Success: Instead of fetching, add the new sale locally to save credits
        const savedSale = await res.json()
        setSales(prev => [savedSale, ...prev])
        
        showToast('✅ Venta guardada correctamente')
        resetOrder()
        // No longer calling fetchSales(true) to save credits
      } else {
        showToast('❌ Error al guardar la venta')
      }
    } catch (err) {
      showToast('❌ Error de conexión')
    } finally {
      setIsSaving(false)
    }
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
        await fetchDishes(true) // Force refresh cache
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
      await fetchDishes(true) // Force refresh cache
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
        await fetchDishes(true) // Force refresh cache
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
        <button className="theme-toggle" onClick={toggleTheme} aria-label="Cambiar tema">
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
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
                    onClick={finalizeSale} 
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
      )}

      {/* ===== SALES HISTORY SCREEN ===== */}
      {tab === 'ventas' && (
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

          {/* Label Helper */}
          {(() => {
            const isToday = filterStartDate === todayStr && filterEndDate === todayStr;
            const rangeLabel = isToday ? 'Hoy' : 'del Rango';
            
            return (
              <>
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
              <div className="summary-val">${
                sales.reduce((acc, s) => acc + Number(s.total), 0).toFixed(2)
              }</div>
              <div className="summary-lab">Venta Total {rangeLabel}</div>
            </div>
            <div className="summary-box accent">
              <div className="summary-val">{sales.length}</div>
              <div className="summary-lab">Pedidos {rangeLabel}</div>
            </div>
          </div>
              </>
            );
          })()}

          <div className="payment-methods-summary" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <div className="card" style={{ flex: 1, padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>💵 EFECTIVO</div>
              <div style={{ fontWeight: '800', color: 'var(--mint)' }}>${
                sales
                  .filter(s => s.payment_method === 'Efectivo')
                  .reduce((acc, s) => acc + Number(s.total), 0).toFixed(2)
              }</div>
            </div>
            <div className="card" style={{ flex: 1, padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>📱 TRANSF.</div>
              <div style={{ fontWeight: '800', color: 'var(--mint)' }}>${
                sales
                  .filter(s => s.payment_method === 'Transferencia')
                  .reduce((acc, s) => acc + Number(s.total), 0).toFixed(2)
              }</div>
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
          className={`tab-btn ${tab === 'ventas' ? 'active' : ''}`}
          onClick={() => setTab('ventas')}
        >
          <span>📊</span>
          <span>Ventas</span>
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
