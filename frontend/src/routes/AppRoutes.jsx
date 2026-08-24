/**
 * routes/AppRoutes.jsx — Configuración central de rutas de CASETECH ERP.
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import MainLayout from '../components/layout/MainLayout';
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import ProvidersPage from '../pages/ProvidersPage';

export function AppRoutes() {
  return (
    <Routes>
      {/* Ruta Pública */}
      <Route path="/login" element={<LoginPage />} />

      {/* Rutas Privadas / Protegidas */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/providers" element={<ProvidersPage />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;
