import { useMemo } from "react";
import TurnosGrid from "../components/TurnosGrid";
import useAuthStore from "../store/useAuthStore";

export default function Turnos({ loggedInProfesionalId: overrideProfesionalId }) {
  const profile = useAuthStore((state) => state.profile);
  const user = useAuthStore((state) => state.user);

  const loggedInProfesionalId = useMemo(() => {
    if (overrideProfesionalId !== undefined && overrideProfesionalId !== null) {
      return overrideProfesionalId;
    }
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
  }, [overrideProfesionalId, profile?.id_profesional, user?.id_profesional, user?.id]);

  const isAdmin = useMemo(() => {
    if (profile?.es_admin || user?.es_admin) {
      return true;
    }
    const names = [];
    if (user?.rol_nombre) names.push(user.rol_nombre);
    if (Array.isArray(user?.roles)) {
      names.push(
        ...user.roles
          .map((role) => role?.nombre)
          .filter((value) => typeof value === "string")
      );
    }
    return names
      .map((value) => value.toLowerCase())
      .some((value) => value.includes("admin") || value.includes("administr"));
  }, [profile?.es_admin, user?.es_admin, user?.rol_nombre, user?.roles]);

  const currentUserId = user?.id ?? null;

  return (
    <div className="turnos-page">
      <TurnosGrid
        loggedInProfesionalId={loggedInProfesionalId}
        isAdmin={isAdmin}
        currentUserId={currentUserId}
      />
    </div>
  );
}
