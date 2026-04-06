import { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from 'react'
import { API_URL } from './utils/helpers'
import { supabase } from './utils/supabaseClient'

// Lazy loaded components
const Header = lazy(() => import('./components/Layout/Header'))
const TabNavigation = lazy(() => import('./components/Layout/TabNavigation'))
const Calculator = lazy(() => import('./components/Calculator/Calculator'))
const SalesHistory = lazy(() => import('./components/Sales/SalesHistory'))
const AdminPanel = lazy(() => import('./components/Admin/AdminPanel'))
const Login = lazy(() => import('./components/Auth/Login'))

// Loading component
const ScreenLoader = () => (
  <div className="screen-loader" style={{ display: 'grid', placeItems: 'center', height: '100vh' }}>
    <div className="spinner">🍋</div>
  </div>
)

export default function App() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [tab, setTab] = useState('calculator') 
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
  }) 
  const [amountPaid, setAmountPaid] = useState('')
  const [toast, setToast] = useState({ msg: '', visible: false })
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark')

  // Support state for Admin
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newCategory, setNewCategory] = useState('Plato')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editCategory, setEditCategory] = useState('Plato')

  // Sales state
  const [sales, setSales] = useState([])
  const [paymentMethod, setPaymentMethod] = useState('Efectivo')
  const [isSaving, setIsSaving] = useState(false)

  const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA'), [])
  const [filterStartDate, setFilterStartDate] = useState(todayStr)
  const [filterEndDate, setFilterEndDate] = useState(todayStr)

  const lastFetchedSalesRange = useRef({ start: '', end: '' })
  const hasLoadedDishes = useRef(false)

  // Auth Listener
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light')
  const handleLogout = () => supabase.auth.signOut()

  useEffect(() => {
    localStorage.setItem('currentOrder', JSON.stringify(quantities))
  }, [quantities])

  const showToast = (msg) => {
    setToast({ msg, visible: true })
    setTimeout(() => setToast({ msg: '', visible: false }), 2500)
  }

  const fetchDishes = useCallback(async (force = false) => {
    if (!session) return
    if (hasLoadedDishes.current && !force && dishes.length > 0) return
    try {
      const res = await fetch(`${API_URL}/dishes`)
      if (res.ok) {
        const data = await res.json()
        setDishes(data)
        localStorage.setItem('cachedDishes', JSON.stringify(data))
        hasLoadedDishes.current = true
      } else {
        showToast(`❌ Error: ${res.status} al cargar platos`)
      }
    } catch (err) {
      showToast('❌ No se pudo conectar con el servidor')
    }
  }, [dishes.length, session])

  useEffect(() => { 
    if (session && (dishes.length === 0 || tab === 'admin')) fetchDishes() 
  }, [fetchDishes, tab, dishes.length, session])

  const fetchSales = useCallback(async (force = false) => {
    if (!session) return
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
      
      const res = await fetch(`${API_URL}/sales?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setSales(data)
        lastFetchedSalesRange.current = { start: filterStartDate, end: filterEndDate }
      }
    } catch (err) {
      console.error('Error fetching sales:', err)
    }
  }, [filterStartDate, filterEndDate, sales.length, session])

  useEffect(() => {
    if (session && tab === 'ventas') fetchSales()
  }, [tab, fetchSales, session])

  // --- Calculations (Memoized for Optimization) ---
  const orderItems = useMemo(() => {
    return dishes
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
  }, [dishes, quantities])


  const subtotal = useMemo(() => orderItems.reduce((sum, d) => sum + d.price * d.totalQty, 0), [orderItems])
  
  const toGoTotal = useMemo(() => {
    const toGoFee = 0.25
    return orderItems.reduce((sum, d) => {
      return d.category === 'Otro' ? sum : sum + (d.qtyToGo * toGoFee)
    }, 0)
  }, [orderItems])

  const total = useMemo(() => subtotal + toGoTotal, [subtotal, toGoTotal])
  const paid = parseFloat(amountPaid) || 0
  const change = useMemo(() => paid - total, [paid, total])

  const adjustQty = (id, type, delta) => {
    setQuantities(prev => {
      const key = String(id);
      const val = prev[key];
      const current = (val && typeof val === 'object') ? val : { here: 0, toGo: 0 };
      const nextVal = Math.max(0, (current[type] || 0) + delta);
      if ("vibrate" in navigator) navigator.vibrate(12);

      return { ...prev, [key]: { ...current, [type]: nextVal } };
    });
  }

  const resetOrder = () => {
    setQuantities({})
    localStorage.removeItem('currentOrder')
    setAmountPaid('')
    setPaymentMethod('Efectivo')
  }

  const finalizeSale = async () => {
    if (total <= 0 || isSaving) return
    setIsSaving(true)
    const saleData = {
      items: orderItems,
      subtotal,
      togo_fee: toGoTotal,
      total,
      payment_method: paymentMethod,
      amount_paid: paid,
      change_given: Math.max(0, change)
    }

    try {
      const res = await fetch(`${API_URL}/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleData)
      })

      if (res.ok) {
        if ("vibrate" in navigator) navigator.vibrate([40, 10, 40]);
        const savedSale = await res.json()
        setSales(prev => [savedSale, ...prev])
        showToast('✅ Venta guardada correctamente')
        resetOrder()
      } else {
        showToast('❌ Error al guardar la venta')
      }
    } catch (err) {
      showToast('❌ Error de conexión')
    } finally {
      setIsSaving(false)
    }
  }

  const addDish = async (e) => {
    e.preventDefault()
    if (!newName.trim() || !newPrice) return
    try {
      const res = await fetch(`${API_URL}/dishes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), price: newPrice, category: newCategory })
      })
      if (res.ok) {
        await fetchDishes(true)
        setNewName(''); setNewPrice(''); setNewCategory('Plato')
        showToast('✅ Producto agregado')
      }
    } catch { showToast('❌ Error al guardar') }
  }

  const deleteDish = async (id) => {
    try {
      await fetch(`${API_URL}/dishes/${id}`, { method: 'DELETE' })
      await fetchDishes(true)
      setQuantities(prev => { const n = { ...prev }; delete n[id]; return n })
      showToast('🗑️ Plato eliminado')
    } catch { showToast('❌ Error al eliminar') }
  }

  const startEdit = (dish) => {
    setEditingId(dish.id); setEditName(dish.name); setEditPrice(dish.price.toString()); setEditCategory(dish.category || 'Plato')
  }

  const cancelEdit = () => {
    setEditingId(null); setEditName(''); setEditPrice(''); setEditCategory('Plato')
  }

  const saveEdit = async (id) => {
    if (!editName.trim() || !editPrice) return
    try {
      const res = await fetch(`${API_URL}/dishes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), price: editPrice, category: editCategory })
      })
      if (res.ok) {
        await fetchDishes(true)
        cancelEdit()
        showToast('✏️ Producto actualizado')
      }
    } catch { showToast('❌ Error al actualizar') }
  }

  const exportToExcel = () => {
    if (sales.length === 0) { showToast('⚠️ No hay ventas'); return }
    const BOM = "\ufeff"
    const headers = ["FECHA", "HORA", "DETALLE", "SUBTOTAL", "ENVASES", "TOTAL", "METODO"]
    const rows = sales.map(s => {
      const d = new Date(s.created_at)
      return [
        d.toLocaleDateString(),
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        `"${s.items.map(it => `${it.name} x${it.qtyHere + it.qtyToGo}`).join(' • ')}"`,
        Number(s.subtotal).toFixed(2),
        Number(s.togo_fee).toFixed(2),
        Number(s.total).toFixed(2),
        s.payment_method.toUpperCase()
      ]
    })
    const csvContent = [headers, ...rows].map(r => r.join(",")).join("\n")
    const blob = new Blob([BOM + csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a"); link.href = url; link.download = `Reporte_${filterStartDate}.csv`; link.click()
    showToast('📊 Reporte generado')
  }

  return (
    <div className="app">
      <Suspense fallback={<ScreenLoader />}>
        {authLoading ? (
          <ScreenLoader />
        ) : !session ? (
          <Login />
        ) : (
          <>
            <Header theme={theme} toggleTheme={toggleTheme} onLogout={handleLogout} />
            
            {tab === 'calculator' && (
              <Calculator 
                dishes={dishes}
                quantities={quantities}
                adjustQty={adjustQty}
                orderItems={orderItems}
                subtotal={subtotal}
                toGoTotal={toGoTotal}
                total={total}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                amountPaid={amountPaid}
                setAmountPaid={setAmountPaid}
                paid={paid}
                change={change}
                resetOrder={resetOrder}
                finalizeSale={finalizeSale}
                isSaving={isSaving}
              />
            )}

            {tab === 'ventas' && (
              <SalesHistory 
                sales={sales}
                filterStartDate={filterStartDate}
                setFilterStartDate={setFilterStartDate}
                filterEndDate={filterEndDate}
                setFilterEndDate={setFilterEndDate}
                fetchSales={fetchSales}
                exportToExcel={exportToExcel}
                todayStr={todayStr}
              />
            )}

            {tab === 'admin' && (
              <AdminPanel 
                dishes={dishes}
                addDish={addDish}
                newName={newName}
                setNewName={setNewName}
                newPrice={newPrice}
                setNewPrice={setNewPrice}
                newCategory={newCategory}
                setNewCategory={setNewCategory}
                deleteDish={deleteDish}
                startEdit={startEdit}
                editingId={editingId}
                editName={editName}
                setEditName={setEditName}
                editPrice={editPrice}
                setEditPrice={setEditPrice}
                editCategory={editCategory}
                setEditCategory={setEditCategory}
                saveEdit={saveEdit}
                cancelEdit={cancelEdit}
              />
            )}

            <TabNavigation tab={tab} setTab={setTab} />
          </>
        )}
      </Suspense>

      <div className={`toast ${toast.visible ? 'visible' : ''}`}>{toast.msg}</div>
    </div>
  )
}


