import { useState } from 'react';
import VuelosTable from '../components/vuelos/VuelosTable.jsx';
import FiltrosVuelos from '../components/vuelos/FiltrosVuelos.jsx';
import AutoRefreshCounter from '../components/shared/AutoRefreshCounter.jsx';
import { useAutoRefresh } from '../hooks/useAutoRefresh.js';
import { useVuelos } from '../hooks/useVuelos.js';

const TIPOS_ALERTA = [
  { tipo: 'faltantes',  label: 'Faltantes', accent: 'violet' },
  { tipo: 'parciales',  label: 'Parciales', accent: 'amber' },
  { tipo: 'inmov',      label: 'Inmov.',    accent: 'orange' },
  { tipo: 'mal_estado', label: 'Mal est.',  accent: 'red' },
];

export default function AvanceVuelos() {
  const [filtros, setFiltros] = useState({});
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState(null);
  const limit = 10;

  const { items, total, total_pages, rango, loading, error, refetch } = useVuelos(filtros, page, limit);
  const { minutos, segundos, reset } = useAutoRefresh(() => refetch());

  const handleManualRefresh = () => { refetch(); reset(); };
  const handleFiltrosChange = (f) => { setFiltros(f); setPage(1); };
  const handleBuscar = (v) => handleFiltrosChange({ ...filtros, buscar: v });
  const handleTipoAlerta = (tipo) => handleFiltrosChange({ ...filtros, tipo_alerta: tipo || '' });

  const handleDescargar = () => {
    setToast('La descarga de reportería histórica estará disponible próximamente.');
    setTimeout(() => setToast(null), 3500);
  };

  const desde = total === 0 ? 0 : (page - 1) * limit + 1;
  const hasta = Math.min(page * limit, total);
  const alertaActiva = filtros.tipo_alerta || null;

  return (
    <div className="p-6 space-y-3">
      {/* Fila 1: Titulo + (a la derecha) reloj + acciones */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <IconAvionBig />
          <div>
            <h1 className="text-lg font-bold tracking-wider text-slate-800 uppercase leading-tight">
              Avance de vuelos importaciones — TEMU
            </h1>
            {rango && (
              <div className="text-[11px] text-slate-500 mt-0.5 font-medium tracking-wide">
                <span className="uppercase text-slate-400 font-semibold">Mostrando </span>
                {formatRango(rango.desde, rango.hasta)}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <AutoRefreshCounter minutos={minutos} segundos={segundos} />
          <div className="w-px h-7 bg-border" />
          <button
            onClick={handleManualRefresh}
            className="flex items-center gap-2 px-3 py-2 border border-border rounded-md text-sm font-medium hover:bg-slate-50"
          >
            <IconRefresh /> Actualizar
          </button>
          <button
            onClick={handleDescargar}
            className="flex items-center gap-2 px-3 py-2 border border-navy text-navy bg-blue-50 rounded-md text-sm font-semibold hover:bg-blue-100"
            title="Descargar reportería histórica de vuelos"
          >
            <IconDownload /> Descargar reportería
          </button>
          <FiltrosVuelos filtros={filtros} onChange={handleFiltrosChange} />
        </div>
      </div>

      {/* Fila 2: Toolbar densa — buscador, leyenda, filtros alertas, paginación */}
      <div className="card px-3 py-2.5 flex items-center gap-x-5 gap-y-2 flex-wrap">
        {/* Buscador */}
        <div className="relative flex-shrink-0">
          <input
            type="text"
            value={filtros.buscar || ''}
            onChange={(e) => handleBuscar(e.target.value)}
            placeholder="Buscar Nº vuelo, aerolínea o manifiesto..."
            className="pl-8 pr-3 py-1.5 text-sm border border-border rounded-md w-72 focus:outline-none focus:ring-2 focus:ring-navy/30"
          />
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
            <IconSearch />
          </span>
        </div>

        <div className="w-px h-6 bg-border" />

        {/* Leyenda proceso */}
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] uppercase tracking-wider text-muted font-semibold">Proceso</span>
          <Dot color="bg-ok" label="Completo" />
          <Dot color="bg-warn" label="En proceso" />
          <Dot color="bg-slate-300" label="Pendiente" />
        </div>

        <div className="w-px h-6 bg-border" />

        {/* Filtros por categoría de alerta */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] uppercase tracking-wider text-muted font-semibold mr-1">
            Filtrar alertas
          </span>
          {TIPOS_ALERTA.map((t) => (
            <AlertaMini
              key={t.tipo}
              tipo={t.tipo}
              label={t.label}
              accent={t.accent}
              activa={alertaActiva === t.tipo}
              onClick={handleTipoAlerta}
            />
          ))}
          {alertaActiva && (
            <button
              onClick={() => handleTipoAlerta(null)}
              className="text-[11px] text-slate-500 hover:text-slate-900 underline font-medium ml-1"
            >
              Quitar
            </button>
          )}
        </div>

        {/* Paginación a la derecha */}
        <div className="ml-auto flex items-center gap-2 text-sm text-muted">
          <span className="tabular-nums">{desde}-{hasta} de {total}</span>
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
      </div>

      {error && (
        <div className="card p-4 border-danger text-danger text-sm">Error: {error}</div>
      )}

      <VuelosTable items={items} loading={loading} />

      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-3 rounded-md shadow-lg text-sm font-medium max-w-sm z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

function AlertaMini({ tipo, label, accent, activa, onClick }) {
  const STYLES = {
    violet: 'border-violet-300 bg-violet-50 text-violet-800 hover:bg-violet-100',
    amber:  'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100',
    orange: 'border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100',
    red:    'border-red-300 bg-red-50 text-danger hover:bg-red-100',
  };
  const RING = {
    violet: 'ring-2 ring-violet-500',
    amber:  'ring-2 ring-amber-500',
    orange: 'ring-2 ring-orange-500',
    red:    'ring-2 ring-red-500',
  };
  return (
    <button
      type="button"
      onClick={() => onClick(activa ? null : tipo)}
      className={`rounded-md border px-2 py-1 text-center transition ${STYLES[accent]} ${
        activa ? RING[accent] + ' shadow-sm' : ''
      }`}
      title={`Filtrar vuelos con ${label.toLowerCase()}`}
    >
      <span className="text-[11px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}

function Dot({ color, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-3 h-3 rounded-full ${color}`} />
      <span className="text-[12px] text-slate-600 font-medium">{label}</span>
    </div>
  );
}

function formatRango(desde, hasta) {
  if (!desde && !hasta) return '';
  if (desde === hasta) return formatFechaCorta(desde);
  return `${formatFechaCorta(desde)} → ${formatFechaCorta(hasta)}`;
}
function formatFechaCorta(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00-05:00');
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
function IconSearch() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
