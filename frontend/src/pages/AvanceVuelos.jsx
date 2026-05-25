import { useState, useEffect } from 'react';
import VuelosTable from '../components/vuelos/VuelosTable.jsx';
import FiltrosVuelos from '../components/vuelos/FiltrosVuelos.jsx';
import VersionSwitcher from '../components/vuelos/versiones/VersionSwitcher.jsx';
import VuelosMinimal from '../components/vuelos/versiones/VuelosMinimal.jsx';
import VuelosSplit from '../components/vuelos/versiones/VuelosSplit.jsx';
import VuelosAgenda from '../components/vuelos/versiones/VuelosAgenda.jsx';
import { useAutoRefresh } from '../hooks/useAutoRefresh.js';
import { useVuelos } from '../hooks/useVuelos.js';
import { useInventarioModal } from '../context/InventarioModalContext.jsx';

const VERSION_KEY = 'vuelos_version';

export default function AvanceVuelos() {
  const [filtros, setFiltros] = useState({});
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState(null);
  const [version, setVersion] = useState(
    () => localStorage.getItem(VERSION_KEY) || 'clasica'
  );
  const limit = 10;

  const cambiarVersion = (v) => {
    setVersion(v);
    localStorage.setItem(VERSION_KEY, v);
  };

  const { items, total, total_pages, hoy, manana, awb_matches, loading, error, refetch } = useVuelos(filtros, page, limit);
  const { reset } = useAutoRefresh(() => refetch());
  const inventario = useInventarioModal();

  // Marca de tiempo de la última carga de datos: se actualiza cada vez que
  // termina un fetch (manual o por auto-refresh).
  const [ultimaActualizacion, setUltimaActualizacion] = useState(() => new Date());
  useEffect(() => {
    if (!loading) setUltimaActualizacion(new Date());
  }, [loading]);

  const handleManualRefresh = () => { refetch(); reset(); };
  const handleFiltrosChange = (f) => { setFiltros(f); setPage(1); };
  const handleBuscar = (v) => handleFiltrosChange({ ...filtros, buscar: v });

  const handleDescargar = () => {
    setToast('La exportación a Excel estará disponible próximamente.');
    setTimeout(() => setToast(null), 3500);
  };

  const desde = total === 0 ? 0 : (page - 1) * limit + 1;
  const hasta = Math.min(page * limit, total);

  return (
    <div className="p-6 space-y-3">
      {/* Fila 1: Titulo + (a la derecha) última actualización + acciones */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <IconAvionBig />
          <h1 className="text-lg font-bold tracking-wider text-slate-800 uppercase leading-tight">
            Importación Carga Courier — TEMU
          </h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <VersionSwitcher value={version} onChange={cambiarVersion} />
          <div className="w-px h-6 bg-border" />
          {/* En almacén: abre el modal con la tablita de guías en almacén */}
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
          {/* Actualizar: control discreto con icono que gira + fecha/hora inline */}
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

      {/* Fila 2: Toolbar densa — buscador (salvo split), filtros, paginación.
          En Split, buscador y filtros viven en el panel; si además no hay más
          de una página, la barra quedaría vacía, así que se oculta. */}
      {(version !== 'split' || total_pages > 1) && (
      <div className="card px-3 py-2.5 flex items-center gap-x-5 gap-y-2 flex-wrap">
        {/* En la vista Split el buscador y los filtros viven dentro del panel
            de vuelos, así que aquí solo se muestran para las demás vistas. */}
        {version !== 'split' && (
          <>
            <div className="relative flex-shrink-0">
              <input
                type="text"
                value={filtros.buscar || ''}
                onChange={(e) => handleBuscar(e.target.value)}
                placeholder="Buscar vuelo, aerolínea, manifiesto o guía (últimos 4 dígitos)..."
                className="pl-8 pr-3 py-1.5 text-sm border border-border rounded-md w-72 focus:outline-none focus:ring-2 focus:ring-navy/30"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                <IconSearch />
              </span>
            </div>

            <FiltrosVuelos filtros={filtros} onChange={handleFiltrosChange} />
          </>
        )}

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
      )}

      {error && (
        <div className="card p-4 border-danger text-danger text-sm">Error: {error}</div>
      )}

      {/* Chip de matches por AWB: cuando el usuario buscó (típicamente por los
          últimos 4 dígitos), enseña en qué vuelos aparece esa guía. Útil
          para guías parciales cuyo restante puede venir en otro vuelo. */}
      {filtros.buscar && (awb_matches?.length || 0) > 0 && (
        <div className="card px-3 py-2 flex items-center gap-2 flex-wrap text-[12px]">
          <span className="text-[10px] uppercase tracking-wider text-muted font-semibold">
            Resultado por guía
          </span>
          {awb_matches.map((m) => (
            <span
              key={m.awb}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-navy/30 bg-blue-50 text-navy"
            >
              <span className="text-[11px] font-bold tabular-nums">{m.awb}</span>
              <span className="text-[10px] uppercase tracking-wide opacity-70">
                {m.manifiestos.length === 1 ? 'vuelo:' : 'vuelos:'}
              </span>
              <span className="text-[11px] font-semibold">{m.manifiestos.join(', ')}</span>
            </span>
          ))}
        </div>
      )}

      {version === 'clasica' && (
        <VuelosTable items={items} loading={loading} prefilterQuery={filtros.buscar || ''} />
      )}
      {version === 'minimal' && (
        <VuelosMinimal items={items} loading={loading} prefilterQuery={filtros.buscar || ''} />
      )}
      {version === 'split' && (
        <VuelosSplit
          items={items}
          loading={loading}
          prefilterQuery={filtros.buscar || ''}
          filtros={filtros}
          onBuscar={handleBuscar}
          onFiltrosChange={handleFiltrosChange}
        />
      )}
      {version === 'agenda' && (
        <VuelosAgenda
          items={items}
          loading={loading}
          prefilterQuery={filtros.buscar || ''}
          hoy={hoy}
          manana={manana}
        />
      )}

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
function IconSearch() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
