const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  listAwbMasters: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/awb-masters${qs ? `?${qs}` : ''}`);
  },
  getAwbMaster: (id) => request(`/awb-masters/${id}`),
  getStats: () => request('/awb-masters/stats'),
  listVuelos: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/vuelos${qs ? `?${qs}` : ''}`);
  },
  getVuelo: (manifiesto) => request(`/vuelos/${encodeURIComponent(manifiesto)}`),
  listInventario: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/inventario${qs ? `?${qs}` : ''}`);
  },
  listAlertas: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/alertas${qs ? `?${qs}` : ''}`);
  },
  notificarAlerta: (id) =>
    request(`/alertas/${id}/notificar`, { method: 'POST' }),
  sincronizarNotificaciones: () =>
    request(`/alertas/sincronizar-notificaciones`, { method: 'POST' }),
  listNotificaciones: () => request('/notificaciones'),
  health: () => request('/health'),

  // Panel de SIMULACION (vuelo 5Y 8676)
  getSimulacionTemplates: () => request('/simulacion/templates'),
  getSimulacionVuelo: () => request('/simulacion/vuelo/5Y8676'),
  simularNotificacion: async ({ tipoAlerta, telefono, guia }) => {
    // No usa `request` porque necesitamos preservar el body en errores
    // (codigo + hint de Meta) y no solo el mensaje.
    const res = await fetch('/api/simulacion/vuelo/notificar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipoAlerta, telefono, guia }),
    });
    const body = await res.json().catch(() => ({ ok: false, error: 'Respuesta invalida' }));
    return { httpStatus: res.status, ...body };
  },
};
