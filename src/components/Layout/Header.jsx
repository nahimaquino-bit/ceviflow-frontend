import React from 'react';

const Header = ({ theme, toggleTheme, onLogout }) => {
  return (
    <header className="header" style={{ paddingBottom: '10px' }}>
      <div className="logo-wrapper">
        <div className="logo-text" style={{ fontSize: '24px', marginTop: '0' }}>
          <span className="cevi">CEVI</span><span className="flow">FLOW</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button className="theme-toggle" onClick={toggleTheme} aria-label="Cambiar tema">
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        {onLogout && (
          <button className="theme-toggle" onClick={onLogout} aria-label="Cerrar sesión" title="Salir">
            🚪
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
