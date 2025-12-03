import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import MainDashboard from './pages/MainDashboard';
import FormularioEntrevista from './components/FormularioEntrevista';
import Ninos from './pages/Ninos';
import Turnos from './pages/Turnos';
import Entrevista from './pages/Entrevista';
import EquipoEstimular from './pages/EquipoEstimular';
import Responsables from './pages/Responsables';
import ObrasSociales from './pages/ObrasSociales';
import PagosDashboard from './pages/PagosDashboard';
import PanelFinanciero from './pages/PanelFinanciero';
import RegistroUsuario from './pages/RegistroUsuario';
import PrimerRegistro from './pages/PrimerRegistro';
import EditarProfesional from './pages/EditarProfesional';

// Components
import CrearNino from './components/CrearNino';
import CrearResponsable from './components/CrearResponsable';
import CrearObraSocial from './components/CrearObraSocial';
import CrearIntegrante from './components/CrearIntegrante';

// Store
import useAuthStore from './store/useAuthStore';

function AppContent() {
  const { user, token } = useAuthStore();
  const isAuthenticated = !!token;

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<RegistroUsuario />} />
          <Route path="/primer-registro" element={<PrimerRegistro />} />
          <Route path="/formulario-entrevista" element={<FormularioEntrevista />} />

          {/* Protected dashboard routes */}
          <Route
            path="/dashboard"
            element={
              isAuthenticated ? (
                <DashboardLayout>
                  <MainDashboard />
                </DashboardLayout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/dashboard/ninos"
            element={
              isAuthenticated ? (
                <DashboardLayout title="Niños">
                  <Ninos />
                </DashboardLayout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/dashboard/turnos"
            element={
              isAuthenticated ? (
                <DashboardLayout title="Turnos">
                  <Turnos />
                </DashboardLayout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/dashboard/entrevistas"
            element={
              isAuthenticated ? (
                <DashboardLayout title="Entrevistas">
                  <Entrevista />
                </DashboardLayout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/dashboard/profesionales"
            element={
              isAuthenticated ? (
                <DashboardLayout title="Equipo Estimular">
                  <EquipoEstimular />
                </DashboardLayout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/dashboard/responsables"
            element={
              isAuthenticated ? (
                <DashboardLayout title="Padres/Tutores">
                  <Responsables />
                </DashboardLayout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/dashboard/obras-sociales"
            element={
              isAuthenticated ? (
                <DashboardLayout title="Obras Sociales">
                  <ObrasSociales />
                </DashboardLayout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/dashboard/pagos"
            element={
              isAuthenticated ? (
                <DashboardLayout title="Pagos">
                  <PagosDashboard />
                </DashboardLayout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/dashboard/finanzas"
            element={
              isAuthenticated ? (
                <DashboardLayout title="Panel Financiero">
                  <PanelFinanciero />
                </DashboardLayout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/dashboard/editar-profesional"
            element={
              isAuthenticated ? (
                <DashboardLayout title="Editar perfil profesional">
                  <EditarProfesional />
                </DashboardLayout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
      </div>
    </Router>
  );
}

function App() {
  return <AppContent />;
}

export default App;