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
    if (profile?.persona_id) {
      return profile.persona_id;
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
  }, [overrideProfesionalId, profile?.persona_id, profile?.id_profesional, user?.id_profesional, user?.id]);

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
    const result = names
      .map((value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase())
      .some((value) => value === 'admin' || value === 'administrador');
    return result;
  }, [profile?.es_admin, user?.es_admin, user?.rol_nombre, user?.roles]);

  const isProfesional = useMemo(() => {
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
      .map((value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase())
      .some((value) => value === 'profesional');
  }, [user?.rol_nombre, user?.roles]);

  const isRecepcion = useMemo(() => {
    const names = [];
    if (user?.rol_nombre) names.push(user.rol_nombre);
    if (Array.isArray(user?.roles)) {
      names.push(
        ...user.roles
          .map((role) => role?.nombre)
          .filter((value) => typeof value === "string")
      );
    }
    const result = names
      .map((value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase())
      .some((value) => value === 'recepcion' || value === 'secretaria');
    return result;
  }, [user?.rol_nombre, user?.roles]);

  const currentUserId = user?.id ?? null;

  return (
    <div className="turnos-page">
      <TurnosGrid
        loggedInProfesionalId={loggedInProfesionalId}
        isAdmin={isAdmin}
        isRecepcion={isRecepcion}
        currentUserId={currentUserId}
      />
    </div>
  );
}
