import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import PrimerRegistro from "./pages/PrimerRegistro";
import Entrevista from "./pages/Entrevista";
import DashboardLayout from "./layouts/DashboardLayout";
import Ninos from "./pages/Ninos";
import EditarProfesional from "./pages/EditarProfesional";
import ObrasSociales from "./pages/ObrasSociales";
import Responsables from "./pages/Responsables";
import AsignarEntrevista from "./pages/AsignarEntrevista";
import EquipoEstimular from "./pages/EquipoEstimular";
import useAuthStore from "./store/useAuthStore";

function ProtectedRoute({ children }) {
  const token = useAuthStore((state) => state.token);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function PublicOnlyRoute({ children }) {
  const token = useAuthStore((state) => state.token);
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function DashboardRoutes() {
  return (
    <DashboardLayout>
      <Routes>
        <Route
          index
          element={<div className="p-24">Bienvenido al Dashboard</div>}
        />
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
            <ProtectedRoute>
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
