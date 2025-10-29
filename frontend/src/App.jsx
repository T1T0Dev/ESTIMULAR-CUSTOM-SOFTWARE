import { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import axios from "axios";

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
import useAuthStore from "./store/useAuthStore";

function ProtectedRoute({ children, allowIncompleteProfile = false }) {
  const token = useAuthStore((state) => state.token);
  const needsProfile = useAuthStore((state) => state.needsProfile);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!allowIncompleteProfile && needsProfile) {
    return <Navigate to="/primer-registro" replace />;
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
        <Route path="profesionales" element={<EquipoEstimular />} />
        <Route path="entrevistas" element={<AsignarEntrevista />} />
        <Route path="obras-sociales" element={<ObrasSociales />} />
        <Route
          path="turnos"
          element={<div className="p-24">Turnos (placeholder)</div>}
        />
        <Route
          path="pacientes"
          element={<div className="p-24">Pacientes (placeholder)</div>}
        />
        <Route path="responsables" element={<Responsables />} />
      </Routes>
    </DashboardLayout>
  );
}

export default function App() {
  const token = useAuthStore((state) => state.token);
  const setProfile = useAuthStore((state) => state.setProfile);
  const setUser = useAuthStore((state) => state.setUser);
  const setNeedsProfile = useAuthStore((state) => state.setNeedsProfile);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const fetchProfile = async () => {
      try {
        const { data } = await axios.get("http://localhost:5000/api/login/me");
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

  return (
    <Router>
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
          path="/dashboard/*"
          element={
            <ProtectedRoute>
              <DashboardRoutes />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}
