import { useState } from 'react';
import VuelosTable from '../components/vuelos/VuelosTable.jsx';
import LeyendaTabla from '../components/vuelos/LeyendaTabla.jsx';
import AutoRefreshCounter from '../components/shared/AutoRefreshCounter.jsx';
import { useAutoRefresh } from '../hooks/useAutoRefresh.js';
import { useVuelos } from '../hooks/useVuelos.js';

export default function AvanceVuelos() {
  const [page, setPage] = useState(1);
  const limit = 10;

  const { items, total, total_pages, loading, error, refetch } = useVuelos({}, page, limit);
  const { minutos, segundos, reset } = useAutoRefresh(() => refetch());

  const handleManualRefresh = () => { refetch(); reset(); };

  const desde = total === 0 ? 0 : (page - 1) * limit + 1;
  const hasta = Math.min(page * limit, total);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <IconAvionBig />
          <h1 className="text-base font-semibold tracking-wide text-slate-700 uppercase">
            Avance de vuelos importaciones - TEMU
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <AutoRefreshCounter minutos={minutos} segundos={segundos} />
          <button
            onClick={handleManualRefresh}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-md text-sm font-medium hover:bg-slate-50"
          >
            <IconRefresh /> Actualizar
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 border border-navy text-navy rounded-md text-sm font-medium hover:bg-blue-50"
            disabled
            title="Pendiente"
          >
            <IconFilter /> Filtros
            <span className="w-2 h-2 bg-ok rounded-full"></span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 text-sm text-muted">
        <span>{desde} - {hasta} de {total}</span>
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="w-7 h-7 rounded-md border border-border flex items-center justify-center disabled:opacity-40 hover:bg-slate-50"
        >‹</button>
        <button
          onClick={() => setPage((p) => Math.min(total_pages, p + 1))}
          disabled={page >= total_pages}
          className="w-7 h-7 rounded-md bg-navy text-white flex items-center justify-center disabled:opacity-40"
        >›</button>
      </div>

      {error && (
        <div className="card p-4 border-danger text-danger text-sm">Error: {error}</div>
      )}

      <LeyendaTabla />

      <VuelosTable items={items} loading={loading} />
    </div>
  );
}

function IconAvionBig() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0D2B6B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
    </svg>
  );
}
function IconRefresh() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 1 3 6.7L3 16M3 21v-5h5" />
    </svg>
  );
}
function IconFilter() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}
