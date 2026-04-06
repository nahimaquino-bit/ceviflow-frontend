import React from 'react';

const TabNavigation = ({ tab, setTab }) => {
  return (
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
  );
};

export default TabNavigation;
