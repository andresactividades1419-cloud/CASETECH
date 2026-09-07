/**
 * pages/RecipesPage.jsx — Administración de Recetas BOM por tipo de casetón (Issue #88).
 *
 * Antes de esta pantalla no existía ningún camino en el sistema para
 * configurar qué materiales lleva cada tipo de casetón, salvo insertar
 * filas directo en la base de datos.
 */

import React, { useCallback, useEffect, useState } from 'react';
import recipesApi from '../api/recipesApi';
import materialsApi from '../api/materialsApi';
import productTypesApi from '../api/productTypesApi';
import RecipeModal from '../components/recipes/RecipeModal';

function Toast({ toast, onDismiss }) {
  if (!toast) return null;
  const isError = toast.type === 'error';
  return (
    <div style={{
      position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 200,
      display: 'flex', alignItems: 'center', gap: '0.6rem',
      padding: '0.85rem 1.1rem', borderRadius: '10px',
      backgroundColor: isError ? 'rgba(239,68,68,0.15)' : 'rgba(52,211,153,0.15)',
      border: `1px solid ${isError ? 'rgba(239,68,68,0.4)' : 'rgba(52,211,153,0.4)'}`,
      boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
    }}>
      <span style={{ fontSize: '1.1rem' }}>{isError ? '⚠️' : '✅'}</span>
      <span style={{ fontSize: '0.85rem', color: isError ? '#fca5a5' : '#6ee7b7' }}>{toast.message}</span>
      <button onClick={onDismiss} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', marginLeft: 'auto' }}>×</button>
    </div>
  );
}

export function RecipesPage() {
  const [productTypes, setProductTypes] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [activeTipoId, setActiveTipoId] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [recipeToEdit, setRecipeToEdit] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchTiposYMateriales = useCallback(async () => {
    try {
      const [tiposData, materialesData] = await Promise.all([
        productTypesApi.getProductTypes(),
        materialsApi.getMaterials({ limit: 200, activo: true }),
      ]);
      setProductTypes(tiposData.items || []);
      setMaterials(materialesData.items || []);
      if (!activeTipoId && tiposData.items?.length > 0) {
        setActiveTipoId(tiposData.items[0].id);
      }
    } catch (err) {
      console.error('Error al cargar tipos de caseton y materiales:', err);
      setError('No se pudieron cargar los tipos de casetón y materiales.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRecipes = useCallback(async (tipoId) => {
    if (!tipoId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await recipesApi.getRecipes({ tipo_caseton_id: tipoId });
      setRecipes(data.items || []);
    } catch (err) {
      console.error('Error al cargar recetas:', err);
      setError('No se pudo cargar la receta de este tipo de casetón.');
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTiposYMateriales(); }, [fetchTiposYMateriales]);
  useEffect(() => { if (activeTipoId) fetchRecipes(activeTipoId); }, [activeTipoId, fetchRecipes]);

  const activeTipo = productTypes.find((t) => t.id === activeTipoId);

  const handleOpenCreate = () => { setRecipeToEdit(null); setModalOpen(true); };
  const handleOpenEdit = (recipe) => { setRecipeToEdit(recipe); setModalOpen(true); };

  const handleModalSuccess = (message) => {
    showToast(message);
    fetchRecipes(activeTipoId);
  };

  const handleDelete = async (recipeId) => {
    try {
      setDeletingId(recipeId);
      await recipesApi.deleteRecipe(recipeId);
      showToast('Material eliminado de la receta.');
      setConfirmDeleteId(null);
      fetchRecipes(activeTipoId);
    } catch (err) {
      console.error('Error al eliminar receta:', err);
      showToast(err.response?.data?.detail || 'No se pudo eliminar el material de la receta.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.5rem' }}>
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#f8fafc', margin: 0 }}>
            🧾 Recetas BOM (Bill of Materials)
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#94a3b8', margin: '0.35rem 0 0 0' }}>
            Configura qué materiales y en qué cantidad lleva cada tipo de casetón. El motor de producción usa estos datos para descontar el inventario automáticamente.
          </p>
        </div>
        {activeTipoId && (
          <button
            onClick={handleOpenCreate}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem',
              backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '10px',
              fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)', whiteSpace: 'nowrap',
            }}
          >
            <span>➕</span>
            <span>Agregar Material</span>
          </button>
        )}
      </div>

      {/* Tabs por tipo de caseton */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #1f2937', flexWrap: 'wrap' }}>
        {productTypes.map((tipo) => {
          const active = tipo.id === activeTipoId;
          return (
            <button
              key={tipo.id}
              onClick={() => setActiveTipoId(tipo.id)}
              style={{
                padding: '0.75rem 1.25rem', border: 'none', background: 'none',
                borderBottom: active ? '2px solid #38bdf8' : '2px solid transparent',
                color: active ? '#38bdf8' : '#94a3b8', fontWeight: active ? '700' : '500',
                fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.15s ease',
              }}
            >
              {tipo.nombre}
              <span style={{
                marginLeft: '0.5rem', fontSize: '0.7rem', padding: '0.1rem 0.45rem', borderRadius: '9999px',
                backgroundColor: tipo.naturaleza === 'PERDIDO' ? 'rgba(251,191,36,0.15)' : 'rgba(52,211,153,0.15)',
                color: tipo.naturaleza === 'PERDIDO' ? '#fbbf24' : '#34d399',
              }}>
                {tipo.naturaleza}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tabla de la receta activa */}
      <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '14px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: '2rem', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</div>
            <p style={{ marginTop: '0.75rem', fontSize: '0.95rem' }}>Cargando receta...</p>
          </div>
        ) : error ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#ef4444' }}>
            <span style={{ fontSize: '2rem' }}>⚠️</span>
            <p style={{ marginTop: '0.5rem' }}>{error}</p>
          </div>
        ) : recipes.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
            <span style={{ fontSize: '2.5rem' }}>🧾</span>
            <p style={{ marginTop: '0.75rem', fontSize: '1rem', color: '#94a3b8' }}>
              {activeTipo?.nombre || 'Este tipo de casetón'} todavía no tiene materiales en su receta.
            </p>
            <button
              onClick={handleOpenCreate}
              style={{ marginTop: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
            >
              + Agregar el primer material
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#0d131f', borderBottom: '1px solid #1f2937', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: '700' }}>Material / Insumo</th>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: '700' }}>Cantidad por Unidad</th>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: '700' }}>Unidad</th>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: '700', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {recipes.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #1f2937' }}>
                    <td style={{ padding: '1rem 1.25rem', color: '#f1f5f9', fontWeight: '600' }}>{r.material_nombre}</td>
                    <td style={{ padding: '1rem 1.25rem', color: '#38bdf8', fontWeight: '700' }}>{Number(r.cantidad_por_unidad)}</td>
                    <td style={{ padding: '1rem 1.25rem', color: '#94a3b8' }}>{r.unidad_medida}</td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleOpenEdit(r)}
                          style={{ padding: '0.4rem 0.75rem', backgroundColor: 'rgba(56,189,248,0.12)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600' }}
                        >
                          ✏️ Editar
                        </button>
                        {confirmDeleteId === r.id ? (
                          <>
                            <button
                              onClick={() => handleDelete(r.id)}
                              disabled={deletingId === r.id}
                              style={{ padding: '0.4rem 0.75rem', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600' }}
                            >
                              {deletingId === r.id ? '...' : 'Confirmar'}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              style={{ padding: '0.4rem 0.75rem', backgroundColor: 'transparent', color: '#94a3b8', border: '1px solid #334155', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(r.id)}
                            style={{ padding: '0.4rem 0.75rem', backgroundColor: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600' }}
                          >
                            🗑️ Quitar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RecipeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleModalSuccess}
        tipoCasetonId={activeTipoId}
        tipoCasetonNombre={activeTipo?.nombre || ''}
        materials={materials.filter((m) => !recipes.some((r) => r.material_id === m.id))}
        recipeToEdit={recipeToEdit}
      />
    </div>
  );
}

export default RecipesPage;
