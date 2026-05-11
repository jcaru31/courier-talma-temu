# Talma Courier Tracking - Importaciones Temu

Sistema web de tracking courier para importaciones en Talma (terminal de carga aereo, Lima - Peru), orientado al cliente Temu. Replica el estilo visual del sistema "Tclick".

## Stack

- Backend: Node.js + Express
- Frontend: React + Vite + Tailwind CSS
- Data: `backend/data/courier_data.json` (fuente unica de verdad)
- Mensajeria: Gmail API + WhatsApp Cloud API (modo MOCK por defecto)

## Estructura

```
backend/   API Express, lee/escribe courier_data.json
frontend/  SPA React con Tailwind
```

## Setup inicial

```powershell
# 1. Backend
cd backend
npm install
copy .env.example .env
npm run dev   # http://localhost:4000

# 2. Frontend (nueva terminal)
cd frontend
npm install
npm run dev   # http://localhost:5173
```

El frontend proxea `/api/*` al backend en 4000.

## Endpoints v1

- `GET  /api/health`
- `GET  /api/awb-masters?status=&canal=&con_alertas=true&page=1&limit=10`
- `GET  /api/awb-masters/:id`
- `GET  /api/alertas?estado=ACTIVA&tipo=ACE`
- `POST /api/alertas/:id/notificar`
- `POST /api/alertas/sincronizar-notificaciones`
- `GET  /api/notificaciones`

## Edicion manual de data

Para simular cambios en desarrollo, edita `backend/data/courier_data.json` directamente. El backend lee el archivo en cada request.

Si agregas/marcas una alerta `ACTIVA` con `notificado: false`, llama a:

```
POST /api/alertas/sincronizar-notificaciones
```

para disparar email + WhatsApp (en MOCK por defecto).

## Notificaciones reales

1. Configura las credenciales en `backend/.env` (Gmail OAuth y WhatsApp Cloud)
2. Cambia `NOTIFICATIONS_MOCK=false`
3. Reinicia el backend
