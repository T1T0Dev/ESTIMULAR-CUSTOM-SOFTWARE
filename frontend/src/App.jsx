import { useEffect, useMemo } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import axios from "axios";
import API_BASE_URL from "./constants/api";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import PrimerRegistro from "./pages/PrimerRegistro";
import Entrevista from "./pages/Entrevista";
import DashboardLayout from "./layouts/DashboardLayout";
import Ninos from "./pages/Ninos";
import MainDashboard from "./pages/MainDashboard";
import EditarProfesional from "./pages/EditarProfesional";
import ObrasSociales from "./pages/ObrasSociales";
import Responsables from "./pages/Responsables";
import AsignarEntrevista from "./pages/AsignarEntrevista";
import EquipoEstimular from "./pages/EquipoEstimular";
import Turnos from "./pages/Turnos";
import PanelFinanciero from "./pages/PanelFinanciero";
import PagosDashboard from "./pages/PagosDashboard";
import useAuthStore from "./store/useAuthStore";
import { NotificacionProvider } from "./context/NotificacionContext";

function ProtectedRoute({ children, allowIncompleteProfile = false, allowedRoles = [] }) {
  const token = useAuthStore((state) => state.token);
  const needsProfile = useAuthStore((state) => state.needsProfile);
  const user = useAuthStore((state) => state.user);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!allowIncompleteProfile && needsProfile) {
    return <Navigate to="/primer-registro" replace />;
  }

  if (user?.es_admin) {
    return children;
  }

  if (allowedRoles.length > 0) {
    const userRoles = (user?.roles || []).map(role => role.nombre?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()).filter(Boolean);
    const hasAccess = allowedRoles.some(role => userRoles.includes(role));
    if (!hasAccess) {
      return <div>No tienes acceso a esta página.</div>;
    }
  }

  return children;
}

function PublicOnlyRoute({ children }) {
  const token = useAuthStore((state) => state.token);
  const needsProfile = useAuthStore((state) => state.needsProfile);
  if (token) {
    return (
      <Navigate to={needsProfile ? "/primer-registro" : "/dashboard"} replace />
    );
  }
  return children;
}

function DashboardRoutes() {
  return (
    <DashboardLayout>
      <Routes>
        <Route index element={<MainDashboard />} />
        <Route path="ninos" element={<Ninos />} />
        <Route path="editar-profesional" element={<EditarProfesional />} />
        <Route
          path="usuarios"
          element={<div className="p-24">Usuarios (placeholder)</div>}
        />
        <Route path="profesionales" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <EquipoEstimular />
          </ProtectedRoute>
        } />
        <Route path="entrevistas" element={
          <ProtectedRoute>
            <AsignarEntrevista />
          </ProtectedRoute>
        } />
        <Route path="obras-sociales" element={<ObrasSociales />} />
        <Route path="turnos" element={<Turnos />} />
        <Route
          path="pacientes"
          element={<div className="p-24">Pacientes (placeholder)</div>}
        />
        <Route path="responsables" element={<Responsables />} />
        <Route path="pagos" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <PagosDashboard />
          </ProtectedRoute>
        } />
        <Route path="panel-financiero" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <PanelFinanciero />
          </ProtectedRoute>
        } />
      </Routes>
    </DashboardLayout>
  );
}

export default function App() {
  const token = useAuthStore((state) => state.token);
  const profile = useAuthStore((state) => state.profile);
  const user = useAuthStore((state) => state.user);
  const setProfile = useAuthStore((state) => state.setProfile);
  const setUser = useAuthStore((state) => state.setUser);
  const setNeedsProfile = useAuthStore((state) => state.setNeedsProfile);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const fetchProfile = async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/login/me`);
        if (cancelled || !data) return;
        if (data.profile && typeof setProfile === "function") {
          setProfile(data.profile);
        }
        if (data.user && typeof setUser === "function") {
          setUser(data.user);
        }
        if (
          typeof setNeedsProfile === "function" &&
          data.needsProfile !== undefined
        ) {
          setNeedsProfile(!!data.needsProfile);
        }
      } catch (err) {
        console.warn("No se pudo actualizar la sesión", err);
      }
    };

    fetchProfile();

    return () => {
      cancelled = true;
    };
  }, [token, setProfile, setUser, setNeedsProfile]);

  const loggedInProfesionalId = useMemo(() => {
    if (profile?.id_profesional) {
      return profile.id_profesional;
    }
    if (user?.id_profesional) {
      return user.id_profesional;
    }
    if (user?.id) {
      return user.id;
    }
    return null;
  }, [profile?.id_profesional, user?.id_profesional, user?.id]);

  return (
    <Router>
      <NotificacionProvider loggedInProfesionalId={loggedInProfesionalId}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/formulario-entrevista" element={<Entrevista />} />
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/primer-registro"
            element={
              <ProtectedRoute allowIncompleteProfile>
                <PrimerRegistro />
              </ProtectedRoute>
            }
          />
          <Route
            path="/turnos"
            element={
              <ProtectedRoute>
                <Navigate to="/dashboard/turnos" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute>
                <DashboardRoutes />
              </ProtectedRoute>
            }
          />
        </Routes>
      </NotificacionProvider>
    </Router>
  );
}
