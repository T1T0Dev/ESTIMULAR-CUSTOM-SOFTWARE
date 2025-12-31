# Estimular — Centro Terapéutico

Sistema fullstack para la gestión de un centro terapéutico: turnos, entrevistas, pacientes/niños, responsables, pagos, notificaciones y administración.

- **Backend:** Node.js + Express + Supabase
- **Frontend:** React + Vite

---

## Collage / Capturas del proyecto

### Opción A (recomendada): imagen dentro del repo
1. Crea la carpeta `docs/media/`.
2. Copia tu collage, por ejemplo: `docs/media/collage.png`.
3. Agrega esto al README:

```md
![Collage del proyecto](docs/media/collage.png)
```

### Opción B: URL externa

```md
![Collage del proyecto](https://url-de-tu-imagen/collage.png)
```

---

## Estructura

- `Estimular-Tesis/backend/` — API (Express), controladores, rutas, servicios.
- `Estimular-Tesis/frontend/` — SPA (React + Vite).
- `Estimular-Tesis/scripts/` — SQL/utilidades (cargas, dumps, helpers).
- `Estimular-Tesis/docs/` — documentación y recursos.

---

## Requisitos

- Node.js 18+
- npm (o yarn/pnpm)
- Proyecto en Supabase (URL y claves)
- (Opcional) SMTP para envío de correos

---

## Variables de entorno (importante)

Los archivos `.env` **no deben subirse** al repositorio (están ignorados en `.gitignore`).
Usa los `.env.example` como plantilla y crea tus `.env` locales.

### Backend

- Plantilla: `Estimular-Tesis/backend/.env.example`
- Archivo real (local): `Estimular-Tesis/backend/.env`

### Frontend

- Archivo real (local): `Estimular-Tesis/frontend/.env`
  
Ejemplo típico:

```env
VITE_API_URL=http://localhost:3001/api
```

---

## Instalación

### Backend

```bash
cd "Estimular-Tesis/backend"
npm install
```

### Frontend

```bash
cd "Estimular-Tesis/frontend"
npm install
```

---

## Desarrollo

### Levantar backend (API)

```bash
cd "Estimular-Tesis/backend"
npm run dev
```

### Levantar frontend (Vite)

```bash
cd "Estimular-Tesis/frontend"
npm run dev
```

---

## Build (producción)

### Frontend

```bash
cd "Estimular-Tesis/frontend"
npm run build
npm run preview
```

---

## Troubleshooting

### “Se sigue subiendo `backend/.env`”

Si alguna vez se commiteó, Git lo seguirá trackeando aunque esté en `.gitignore`. Para dejar de trackearlo:

```bash
cd "Estimular-Tesis"
git rm --cached backend/.env
git commit -m "Stop tracking backend env"
git push
```

---

## Seguridad

- No subas credenciales reales a GitHub.
- Si un secreto se expuso, **rotalo** (Supabase keys, SMTP, JWT, etc.).
