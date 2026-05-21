import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconoAlerta } from '../alertaIconos.jsx';
import DetalleVueloInline from '../DetalleVueloInline.jsx';
import ManifiestoModal from '../ManifiestoModal.jsx';
import FiltrosVuelos from '../FiltrosVuelos.jsx';
import TooltipVueloRuta from '../TooltipVueloRuta.jsx';
import { resumenAlertas, countdownArribo, ALERTA_TEXT } from './vuelosVariantHelpers.js';

/**
 * VARIANTE 2 — Master-detail (split pane).
 * Lista compacta y seleccionable a la izquierda; panel de detalle fijo a la
 * derecha. Al elegir un vuelo, el panel derecho muestra el detalle (resumen +
 * guías) sin tapar la lista ni empujar el contenido. Cero acordeón/modales.
 */
export default function VuelosSplit({ items, loading, prefilterQuery, filtros = {}, onBuscar, onFiltrosChange }) {
  const [sel, setSel] = useState(null);

  // Auto-selecciona el primer vuelo cuando cambia la lista.
  useEffect(() => {
    if (items?.length && !items.some((v) => v.manifiesto === sel)) {
      setSel(items[0].manifiesto);
    }
    if (!items?.length) setSel(null);
  }, [items, sel]);

  if (loading) {
    return <div className="card p-12 text-center text-muted">Cargando vuelos...</div>;
  }
  if (!items?.length) {
    return <div className="card p-12 text-center text-muted">No se encontraron vuelos</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-3 lg:h-[calc(100vh-7rem)]">
      {/* Master: lista */}
      <div className="card overflow-hidden flex flex-col min-h-0">
        {/* Cabecera: buscador + icono de filtros dentro del segmento de vuelos */}
        <div className="px-2.5 py-2 border-b border-border bg-slate-50 space-y-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1 min-w-0">
              <input
                type="text"
                value={filtros.buscar || ''}
                onChange={(e) => onBuscar?.(e.target.value)}
                placeholder="Buscar vuelo, aerolínea, guía..."
                className="w-full pl-7 pr-2 py-1.5 text-[12px] border border-border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-navy/30"
              />
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
            </div>
            {onFiltrosChange && (
              <FiltrosVuelos filtros={filtros} onChange={onFiltrosChange} iconOnly />
            )}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">
            {items.length} vuelos
          </div>
        </div>
        <div className="overflow-auto divide-y divide-border flex-1 min-h-0 max-h-[72vh] lg:max-h-none">
          {items.map((v) => (
            <ItemMaster
              key={v.manifiesto}
              v={v}
              activo={v.manifiesto === sel}
              onClick={() => setSel(v.manifiesto)}
            />
          ))}
        </div>
      </div>

      {/* Detail: panel */}
      <div className="min-w-0 lg:h-full lg:min-h-0">
        {sel ? (
          <DetalleVueloInline manifiesto={sel} prefilterQuery={prefilterQuery} fillHeight />
        ) : (
          <div className="card p-12 text-center text-muted">Selecciona un vuelo</div>
        )}
      </div>
    </div>
  );
}

function ItemMaster({ v, activo, onClick }) {
  const alertas = resumenAlertas(v);
  const countdown = countdownArribo(v);
  const [manifiestoAbierto, setManifiestoAbierto] = useState(false);
  const [hoverRect, setHoverRect] = useState(null);

  const estado = v.estado_ruta?.estado || 'PROGRAMADO';
  const enVuelo = estado === 'EN_VUELO';
  const programado = estado === 'PROGRAMADO';
  const ata = v.sla?.ata;
  const sinArribo = !ata; // sin arribo real → mostramos ETA y habilitamos tracker
  const arribo = formatFechaHoraCorta(ata || v.eta);

  // Progreso = % de guías entregadas (hito Despacho de la trazabilidad).
  const despacho = (v.trazabilidad || []).find((t) => t.key === 'despacho');
  const entregadas = despacho?.completados ?? 0;
  const totalGuias = despacho?.total ?? v.total_awbs ?? 0;
  const pctEntregadas = totalGuias > 0 ? Math.round((entregadas / totalGuias) * 100) : 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }
      }}
      className={`w-full text-left px-3.5 py-3 transition relative cursor-pointer outline-none ${
        activo ? 'bg-blue-50/70' : 'hover:bg-slate-50'
      }`}
    >
      {activo && <span className="absolute left-0 top-0 bottom-0 w-1 bg-navy rounded-r" />}

      {/* Fila 1: vuelo (izq) · alertas icono+conteo (der, a la altura del nombre) */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-slate-800 tabular-nums">{v.vuelo}</span>
        {alertas.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            {alertas.map((al) => (
              <span
                key={al.tipo}
                className={`inline-flex items-center gap-0.5 ${ALERTA_TEXT[al.color]}`}
                title={`${al.label}: ${al.count}`}
              >
                <IconoAlerta tipo={al.tipo} size={13} />
                <span className="text-[12px] font-bold tabular-nums">{al.count}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Ruta + arribo (fecha/hora) + estado + guías. Al pasar el cursor sobre
          un vuelo aún en ruta, aparece el tracker de posición. */}
      <div
        className={`mt-1 ${sinArribo ? '-mx-1 px-1 rounded-md hover:bg-sky-50/70 transition' : ''}`}
        onMouseEnter={sinArribo ? (e) => setHoverRect(e.currentTarget.getBoundingClientRect()) : undefined}
        onMouseLeave={sinArribo ? () => setHoverRect(null) : undefined}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-700">
            <span>{v.origen}</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="13 6 19 12 13 18" />
            </svg>
            <span>{v.destino}</span>
          </div>
          <span className="text-[11px] tabular-nums text-slate-500 shrink-0">{arribo}</span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-1">
          <span className="leading-none">
            {enVuelo ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-sky-500" />
                </span>
                {countdown || 'En vuelo'}
              </span>
            ) : programado ? (
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Programado</span>
            ) : (
              <span />
            )}
          </span>
          <span className="text-[11px] text-slate-500 shrink-0">
            <span className="font-bold text-slate-700 tabular-nums">{v.total_awbs}</span> guías
          </span>
        </div>
      </div>

      {/* Barra de progreso = % de guías entregadas */}
      <div className="mt-2.5 flex items-center gap-2" title={`${entregadas} de ${totalGuias} guías entregadas`}>
        <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all"
            style={{ width: `${pctEntregadas}%` }}
          />
        </div>
        <span className="text-[10px] text-slate-400 tabular-nums shrink-0 font-medium">
          {entregadas}/{totalGuias} entreg.
        </span>
      </div>

      {/* Chip del Nº de manifiesto (sin texto "MNF") → abre el modal */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setManifiestoAbierto(true); }}
        className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 bg-slate-50 border border-border rounded-md px-2 py-1 hover:text-navy hover:border-navy/40 hover:bg-blue-50 transition"
        title="Ver numeración del manifiesto de carga"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="6" y="4" width="12" height="17" rx="2" />
          <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
          <path d="M9 11h6M9 15h4" />
        </svg>
        <span className="tabular-nums">{v.manifiesto}</span>
      </button>

      {manifiestoAbierto &&
        createPortal(
          <ManifiestoModal vuelo={v} onClose={() => setManifiestoAbierto(false)} />,
          document.body
        )}
      {hoverRect &&
        createPortal(<TooltipVueloRuta vuelo={v} anchorRect={hoverRect} />, document.body)}
    </div>
  );
}

function formatFechaHoraCorta(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
