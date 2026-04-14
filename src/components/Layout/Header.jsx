import React from 'react';

const Header = ({ theme, toggleTheme, onLogout }) => {
  return (
    <header className="header" style={{ paddingBottom: '10px' }}>
      <div className="logo-container">
        <img 
          src="/logo.png" 
          alt="Logo" 
          style={{ height: '100px', width: 'auto', borderRadius: '8px' }}
          onError={(e) => e.target.style.display = 'none'} 
        />
        <div className="logo-text">
          <span className="reelbet">REELBET</span><span className="app-text">APP</span>
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
