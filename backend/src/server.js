const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const env = require('./config/env');
const errorHandler = require('./middleware/errorHandler');

const awbMastersRoutes = require('./routes/awbMasters.routes');
const vuelosRoutes = require('./routes/vuelos.routes');
const inventarioRoutes = require('./routes/inventario.routes');
const alertasRoutes = require('./routes/alertas.routes');
const notificacionesRoutes = require('./routes/notificaciones.routes');

const app = express();

app.use(cors());
app.use(express.json());

// Fotos y PDFs originales de actas de mercancia en mal estado.
// Estructura esperada: backend/data/actas/photos/foto-{1..5}.jpg
// y backend/data/actas/acta-original.pdf (compartido en demo).
app.use('/actas', express.static(path.join(__dirname, '..', 'data', 'actas')));

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'courier-tracking-backend',
    mock_notifications: env.NOTIFICATIONS_MOCK,
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/awb-masters', awbMastersRoutes);
app.use('/api/vuelos', vuelosRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/alertas', alertasRoutes);
app.use('/api/notificaciones', notificacionesRoutes);

// API no encontrada → JSON (no debe caer en el fallback del frontend).
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada', path: req.path });
});

// En producción servimos el frontend ya compilado (frontend/dist) desde el
// mismo servicio. Así una sola URL pública entrega la API y la app. En
// desarrollo no existe `dist` (se usa el dev server de Vite), así que solo
// se activa cuando la carpeta está presente.
const FRONTEND_DIST = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  // SPA fallback: cualquier ruta no-API devuelve index.html para que el
  // router del cliente (React Router) maneje la navegación.
  app.get('*', (req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
} else {
  app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada', path: req.path });
  });
}

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`[backend] escuchando en http://localhost:${env.PORT}`);
  console.log(`[backend] modo notificaciones: ${env.NOTIFICATIONS_MOCK ? 'MOCK' : 'REAL'}`);
});
