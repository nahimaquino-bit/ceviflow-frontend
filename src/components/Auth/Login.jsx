import React, { useState } from 'react';
import { supabase } from '../../utils/supabaseClient';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      // Session will be updated by listener in App.jsx
    } catch (err) {
      setError(err.message === 'Invalid login credentials' 
        ? 'Correo o contraseña incorrectos' 
        : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card card">
        <div className="logo-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', marginBottom: '30px' }}>
          <img 
            src="/logo.png" 
            alt="Logo" 
            style={{ height: '240px', width: 'auto', borderRadius: '16px', filter: 'drop-shadow(0 0 20px rgba(197, 160, 89, 0.2))' }}
            onError={(e) => e.target.style.display = 'none'} 
          />
          <div className="logo-text" style={{ fontSize: '40px', letterSpacing: '-0.05em' }}>
            <span className="reelbet">REELBET</span><span className="app-text">APP</span>
          </div>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px', textAlign: 'center' }}>
          Inicia sesión para gestionar tu negocio
        </p>

        <form onSubmit={handleLogin} className="admin-form">
          <div className="form-field">
            <label className="form-label">Correo Electrónico</label>
            <input
              type="email"
              className="form-input"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-field" style={{ marginTop: '16px' }}>
            <label className="form-label">Contraseña</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="error-message" style={{ 
              color: 'var(--danger)', 
              fontSize: '13px', 
              marginTop: '12px',
              textAlign: 'center',
              background: 'rgba(255, 59, 48, 0.1)',
              padding: '8px',
              borderRadius: '8px'
            }}>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading}
            style={{ marginTop: '24px', height: '50px' }}
          >
            {loading ? 'Cargando...' : 'Entrar a Reelbet App'}
          </button>
        </form>

        <div style={{ marginTop: '30px', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
          Reelbet App - v1.0
        </div>
      </div>
    </div>
  );
};

export default Login;
