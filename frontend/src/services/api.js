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
};
