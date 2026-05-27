import { useEffect, useState } from 'react';
import VuelosSplit from '../components/vuelos/versiones/VuelosSplit.jsx';
import { useVuelos } from '../hooks/useVuelos.js';
import { useInventarioModal } from '../context/InventarioModalContext.jsx';

// Solo simulamos refresco de la marca de tiempo (cada minuto el indicador
// avanza) para no recargar la pantalla y perder el foco/selección actual.
const TICK_TIMESTAMP_MS = 60 * 1000;

export default function AvanceVuelos() {
  const [filtros, setFiltros] = useState({});
  const [toast, setToast] = useState(null);

  // Sin paginación: para courier diario alcanza con ~10 vuelos visibles a la vez.
  const { items, loading, error, refetch } = useVuelos(filtros, 1, 100);
  const inventario = useInventarioModal();

  // Marca de tiempo de la última carga real de datos. El tick cosmético la
  // adelanta cada minuto (sin tocar la data), y el refetch manual la resetea.
  const [ultimaActualizacion, setUltimaActualizacion] = useState(() => new Date());
  useEffect(() => {
    if (!loading) setUltimaActualizacion(new Date());
  }, [loading]);
  useEffect(() => {
    const id = setInterval(() => setUltimaActualizacion(new Date()), TICK_TIMESTAMP_MS);
    return () => clearInterval(id);
  }, []);

  const handleManualRefresh = () => refetch();
  const handleFiltrosChange = (f) => setFiltros(f);

  const handleDescargar = () => {
    setToast('La exportación a Excel estará disponible próximamente.');
    setTimeout(() => setToast(null), 3500);
  };

  return (
    <div className="p-6 space-y-3">
      {/* Cabecera: título + acciones (En almacén, actualizar, exportar) */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <IconAvionBig />
          <h1 className="text-lg font-bold tracking-wider text-slate-800 uppercase leading-tight">
            Importación Carga Courier — TEMU
          </h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={inventario.open}
            className="flex items-center gap-2 pl-2.5 pr-2 py-1.5 rounded-md border border-border text-slate-700 hover:bg-slate-50 transition"
            title="Ver guías en almacén"
          >
            <IconAlmacen />
            <span className="text-[13px] font-semibold">En almacén</span>
            {inventario.total != null && (
              <span className="inline-flex items-center justify-center min-w-[22px] px-1.5 py-0.5 rounded bg-navy text-white text-[11px] font-bold tabular-nums">
                {inventario.total}
              </span>
            )}
          </button>
          <div className="w-px h-6 bg-border" />
          <button
            onClick={handleManualRefresh}
            className="group flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition"
            title="Actualizar ahora"
          >
            <span className="transition-transform duration-500 group-hover:rotate-180 group-active:rotate-180">
              <IconRefresh />
            </span>
            <span className="text-[11px] font-medium tabular-nums leading-none">
              {formatActualizacion(ultimaActualizacion)}
            </span>
          </button>
          <button
            onClick={handleDescargar}
            className="flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-md text-sm font-semibold shadow-sm hover:bg-navy/90 transition"
            title="Exportar la reportería de vuelos"
          >
            <IconDownload /> Exportar
          </button>
        </div>
      </div>

      {error && (
        <div className="card p-4 border-danger text-danger text-sm">Error: {error}</div>
      )}

      <VuelosSplit
        items={items}
        loading={loading}
        prefilterQuery={filtros.buscar || ''}
        filtros={filtros}
        onFiltrosChange={handleFiltrosChange}
      />

      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-3 rounded-md shadow-lg text-sm font-medium max-w-sm z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

// Etiqueta liviana de última actualización: "21/05 · 16:53" (hora Lima).
function formatActualizacion(d) {
  if (!d) return '—';
  const fecha = d.toLocaleDateString('es-PE', {
    timeZone: 'America/Lima', day: '2-digit', month: '2-digit',
  });
  const hora = d.toLocaleTimeString('es-PE', {
    timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', hour12: false,
  });
  return `${fecha} · ${hora}`;
}

function IconAvionBig() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0D2B6B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
    </svg>
  );
}
function IconAlmacen() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-5 9 5v11H3z" />
      <rect x="7" y="13" width="3" height="4" />
      <rect x="14" y="13" width="3" height="4" />
      <line x1="3" y1="20" x2="21" y2="20" />
    </svg>
  );
}
function IconRefresh() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 1 3 6.7L3 16M3 21v-5h5" />
    </svg>
  );
}
function IconDownload() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  );
}
