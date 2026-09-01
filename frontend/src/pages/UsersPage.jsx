/**
 * pages/UsersPage.jsx — Gestión de Cuentas de Usuario (HU02, HU14).
 *
 * Exclusivo para el rol ADMINISTRADOR.
 * Permite listar, registrar, editar roles, activar/desactivar y actualizar contraseñas.
 */

import React, { useCallback, useEffect, useState } from 'react';
import usersApi from '../api/usersApi';
import { useAuth } from '../context/AuthContext';

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null = nuevo usuario, objeto = editar
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    nombre_completo: '',
    email: '',
    password: '',
    rol_id: 2,
    activo: true,
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await usersApi.getUsers();
      setUsers(data.items || []);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Error al cargar la lista de usuarios.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Abrir modal de creación
  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData({
      nombre_completo: '',
      email: '',
      password: '',
      rol_id: 2,
      activo: true,
    });
    setModalError('');
    setModalOpen(true);
  };

  // Abrir modal de edición
  const handleOpenEdit = (u) => {
    setEditingUser(u);
    setFormData({
      nombre_completo: u.nombre_completo,
      email: u.email,
      password: '',
      rol_id: u.rol_id,
      activo: u.activo,
    });
    setModalError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError('');

    try {
      if (editingUser) {
        const payload = {
          nombre_completo: formData.nombre_completo,
          email: formData.email,
          rol_id: Number(formData.rol_id),
          activo: formData.activo,
        };
        if (formData.password.trim()) {
          payload.password = formData.password.trim();
        }
        await usersApi.updateUser(editingUser.id, payload);
        setSuccessMsg(`Usuario ${formData.email} actualizado correctamente.`);
      } else {
        if (!formData.password.trim()) {
          setModalError('La contraseña es requerida para nuevos usuarios.');
          setSubmitting(false);
          return;
        }
        await usersApi.createUser({
          nombre_completo: formData.nombre_completo,
          email: formData.email,
          password: formData.password.trim(),
          rol_id: Number(formData.rol_id),
          activo: formData.activo,
        });
        setSuccessMsg(`Usuario ${formData.email} registrado exitosamente.`);
      }

      setModalOpen(false);
      fetchUsers();
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Ocurrió un error al procesar la solicitud.';
      setModalError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (u) => {
    if (u.id === currentUser?.id && u.activo) {
      alert('No puede desactivar su propia cuenta de Administrador.');
      return;
    }

    try {
      await usersApi.updateUser(u.id, { activo: !u.activo });
      setSuccessMsg(`Usuario ${u.email} ${!u.activo ? 'activado' : 'desactivado'}.`);
      fetchUsers();
    } catch (err) {
      alert(err?.response?.data?.detail || 'Error al cambiar estado del usuario.');
    }
  };

  const total = users.length;
  const adminsCount = users.filter((u) => u.rol_nombre === 'ADMINISTRADOR' || u.rol_id === 1).length;
  const operariosCount = users.filter((u) => u.rol_nombre === 'OPERARIO' || u.rol_id === 2).length;
  const activosCount = users.filter((u) => u.activo).length;

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.nombre_completo.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole =
      roleFilter === 'ALL' ||
      (roleFilter === 'ADMIN' && (u.rol_nombre === 'ADMINISTRADOR' || u.rol_id === 1)) ||
      (roleFilter === 'OPERARIO' && (u.rol_nombre === 'OPERARIO' || u.rol_id === 2));
    return matchesSearch && matchesRole;
  });

  return (
    <div style={{ color: '#f8fafc' }}>
      {successMsg && (
        <div style={{
          backgroundColor: '#064e3b',
          border: '1px solid #059669',
          borderRadius: '10px',
          padding: '0.85rem 1.25rem',
          color: '#6ee7b7',
          marginBottom: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.88rem',
        }}>
          <span>✓ {successMsg}</span>
          <button
            onClick={() => setSuccessMsg('')}
            style={{ background: 'none', border: 'none', color: '#6ee7b7', cursor: 'pointer', fontSize: '1.1rem' }}
          >
            ×
          </button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '800', color: '#f8fafc' }}>
            👥 Gestión de Cuentas de Usuario
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.88rem' }}>
            Administración de credenciales, roles y acceso al sistema CASETECH ERP
          </p>
        </div>
        <button
          id="btn-nuevo-usuario"
          onClick={handleOpenCreate}
          style={{
            padding: '0.65rem 1.25rem',
            backgroundColor: '#0284c7',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.88rem',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <span>➕</span>
          <span>Nuevo Usuario</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '600' }}>Total Cuentas</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#f8fafc', marginTop: '0.25rem' }}>{total}</div>
        </div>
        <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.78rem', color: '#a78bfa', textTransform: 'uppercase', fontWeight: '600' }}>Administradores</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#c084fc', marginTop: '0.25rem' }}>{adminsCount}</div>
        </div>
        <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.78rem', color: '#38bdf8', textTransform: 'uppercase', fontWeight: '600' }}>Operarios</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#38bdf8', marginTop: '0.25rem' }}>{operariosCount}</div>
        </div>
        <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.78rem', color: '#34d399', textTransform: 'uppercase', fontWeight: '600' }}>Cuentas Activas</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#34d399', marginTop: '0.25rem' }}>{activosCount}</div>
        </div>
      </div>

      <div style={{
        backgroundColor: '#111827',
        border: '1px solid #1f2937',
        borderRadius: '12px',
        padding: '0.85rem 1.25rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: '240px' }}>
          <input
            type="text"
            placeholder="🔍 Buscar por nombre o correo electrónico..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: '#0b0f19',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '0.5rem 0.85rem',
              color: '#f8fafc',
              fontSize: '0.85rem',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['ALL', 'ADMIN', 'OPERARIO'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: roleFilter === r ? '#38bdf8' : '#334155',
                backgroundColor: roleFilter === r ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                color: roleFilter === r ? '#38bdf8' : '#94a3b8',
                fontSize: '0.78rem',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              {r === 'ALL' ? 'Todos los roles' : r === 'ADMIN' ? 'Administradores' : 'Operarios'}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        backgroundColor: '#111827',
        border: '1px solid #1f2937',
        borderRadius: '12px',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '60px 1.5fr 1.5fr 120px 100px 130px 150px',
          padding: '0.85rem 1.25rem',
          backgroundColor: '#0b0f19',
          borderBottom: '1px solid #1f2937',
          color: '#94a3b8',
          fontSize: '0.75rem',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          gap: '0.5rem',
        }}>
          <span>ID</span>
          <span>Nombre Completo</span>
          <span>Email</span>
          <span>Rol</span>
          <span>Estado</span>
          <span>Registrado</span>
          <span style={{ textAlign: 'right' }}>Acciones</span>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{
              width: '32px', height: '32px', border: '3px solid #1f2937',
              borderTopColor: '#38bdf8', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite', margin: '0 auto 0.75rem',
            }} />
            <p style={{ margin: 0, fontSize: '0.88rem' }}>Cargando usuarios...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#f87171' }}>
            ⚠️ {error}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <p style={{ margin: 0, fontSize: '0.95rem' }}>No se encontraron usuarios con los criterios actuales.</p>
          </div>
        ) : (
          filteredUsers.map((u, idx) => {
            const isAdminRole = u.rol_nombre === 'ADMINISTRADOR' || u.rol_id === 1;
            return (
              <div
                key={u.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '60px 1.5fr 1.5fr 120px 100px 130px 150px',
                  padding: '0.85rem 1.25rem',
                  borderBottom: '1px solid #1a2332',
                  backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.85rem',
                }}
              >
                <span style={{ color: '#64748b', fontFamily: 'monospace' }}>#{u.id}</span>
                <span style={{ fontWeight: '600', color: '#f8fafc' }}>{u.nombre_completo}</span>
                <span style={{ color: '#cbd5e1' }}>{u.email}</span>

                <div>
                  <span style={{
                    padding: '0.2rem 0.55rem',
                    borderRadius: '9999px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    backgroundColor: isAdminRole ? 'rgba(168, 85, 247, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                    color: isAdminRole ? '#c084fc' : '#38bdf8',
                    border: `1px solid ${isAdminRole ? 'rgba(168, 85, 247, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`,
                  }}>
                    {isAdminRole ? '👑 ADMIN' : '🛠️ OPERARIO'}
                  </span>
                </div>

                <div>
                  <span style={{
                    padding: '0.2rem 0.5rem',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    backgroundColor: u.activo ? 'rgba(52, 211, 153, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    color: u.activo ? '#34d399' : '#f87171',
                    border: `1px solid ${u.activo ? 'rgba(52, 211, 153, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                  }}>
                    {u.activo ? '● Activo' : '○ Inactivo'}
                  </span>
                </div>

                <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
                  {new Date(u.created_at).toLocaleDateString('es-CO')}
                </span>

                <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => handleOpenEdit(u)}
                    title="Editar usuario"
                    style={{
                      padding: '0.3rem 0.6rem',
                      backgroundColor: 'rgba(56, 189, 248, 0.1)',
                      border: '1px solid rgba(56, 189, 248, 0.25)',
                      borderRadius: '6px',
                      color: '#38bdf8',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    ✏️ Editar
                  </button>

                  <button
                    onClick={() => handleToggleActive(u)}
                    title={u.activo ? 'Desactivar cuenta' : 'Activar cuenta'}
                    style={{
                      padding: '0.3rem 0.6rem',
                      backgroundColor: u.activo ? 'rgba(239, 68, 68, 0.1)' : 'rgba(52, 211, 153, 0.1)',
                      border: `1px solid ${u.activo ? 'rgba(239, 68, 68, 0.25)' : 'rgba(52, 211, 153, 0.25)'}`,
                      borderRadius: '6px',
                      color: u.activo ? '#f87171' : '#34d399',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    {u.activo ? '🔒 Desactivar' : '🔓 Activar'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {modalOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget && !submitting) setModalOpen(false); }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(4px)',
            zIndex: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
        >
          <div style={{
            backgroundColor: '#111827',
            border: '1px solid #1f2937',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #1f2937',
              backgroundColor: '#0f172a',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#f8fafc' }}>
                {editingUser ? `Editar Usuario: ${editingUser.email}` : 'Registrar Nuevo Usuario'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                disabled={submitting}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '1.4rem', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              {modalError && (
                <div style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  color: '#fca5a5',
                  fontSize: '0.82rem',
                }}>
                  ⚠️ {modalError}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#94a3b8', marginBottom: '0.35rem' }}>
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nombre_completo}
                  onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
                  style={{
                    width: '100%',
                    backgroundColor: '#0b0f19',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '0.6rem 0.85rem',
                    color: '#f8fafc',
                    fontSize: '0.85rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#94a3b8', marginBottom: '0.35rem' }}>
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{
                    width: '100%',
                    backgroundColor: '#0b0f19',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '0.6rem 0.85rem',
                    color: '#f8fafc',
                    fontSize: '0.85rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#94a3b8', marginBottom: '0.35rem' }}>
                  {editingUser ? 'Nueva Contraseña (dejar en blanco para no cambiar)' : 'Contraseña * (mín 8 chars, 1 mayúscula, 1 número)'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  placeholder={editingUser ? '••••••••' : 'Contraseña segura'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  style={{
                    width: '100%',
                    backgroundColor: '#0b0f19',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '0.6rem 0.85rem',
                    color: '#f8fafc',
                    fontSize: '0.85rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#94a3b8', marginBottom: '0.35rem' }}>
                    Rol del Usuario *
                  </label>
                  <select
                    value={formData.rol_id}
                    onChange={(e) => setFormData({ ...formData, rol_id: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      backgroundColor: '#0b0f19',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '0.6rem 0.85rem',
                      color: '#f8fafc',
                      fontSize: '0.85rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value={1}>ADMINISTRADOR</option>
                    <option value={2}>OPERARIO</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#94a3b8', marginBottom: '0.35rem' }}>
                    Estado de la Cuenta
                  </label>
                  <select
                    value={formData.activo ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, activo: e.target.value === 'true' })}
                    style={{
                      width: '100%',
                      backgroundColor: '#0b0f19',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '0.6rem 0.85rem',
                      color: '#f8fafc',
                      fontSize: '0.85rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                  style={{
                    padding: '0.6rem 1.25rem',
                    backgroundColor: 'transparent',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#94a3b8',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '0.6rem 1.5rem',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    cursor: submitting ? 'wait' : 'pointer',
                  }}
                >
                  {submitting ? 'Guardando...' : editingUser ? 'Guardar Cambios' : 'Registrar Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UsersPage;
