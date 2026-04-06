import React from 'react';

const AdminPanel = ({ 
  dishes, 
  addDish, 
  newName, 
  setNewName, 
  newPrice, 
  setNewPrice, 
  newCategory, 
  setNewCategory, 
  deleteDish, 
  startEdit, 
  editingId, 
  editName, 
  setEditName, 
  editPrice, 
  setEditPrice, 
  editCategory, 
  setEditCategory, 
  saveEdit, 
  cancelEdit 
}) => {
  return (
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
  );
};

export default AdminPanel;
