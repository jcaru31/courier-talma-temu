import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import DetalleVueloInline from '../DetalleVueloInline.jsx';
import ManifiestoModal from '../ManifiestoModal.jsx';
import FiltrosVuelos from '../FiltrosVuelos.jsx';
import TooltipVueloRuta from '../TooltipVueloRuta.jsx';
import { totalAlertas, countdownArribo, tonoHitos } from './vuelosVariantHelpers.js';

/**
 * VARIANTE 2 — Master-detail (split pane).
 * Lista compacta y seleccionable a la izquierda; panel de detalle fijo a la
 * derecha. La fila de la lista resume el vuelo de forma jerárquica: manifiesto
 * arriba, vuelo, origen (el destino siempre es LIM), arribo (ATA real o ETA
 * estimada con cuenta regresiva) y avance de guías. Las alertas NO se detallan
 * aquí: solo un punto animado invita a abrir el detalle, donde se desglosan.
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

  const vacio = !items?.length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-3 lg:h-[calc(100vh-7rem)]">
      {/* Master: lista */}
      <div className="card flex flex-col min-h-0">
        {/* Cabecera: buscador + icono de filtros dentro del segmento de vuelos */}
        <div className="px-2.5 py-2 border-b border-border bg-slate-50 space-y-2 shrink-0 rounded-t-lg">
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
            {items?.length || 0} vuelos
          </div>
        </div>
        <div className="overflow-auto divide-y divide-border flex-1 min-h-0 max-h-[72vh] lg:max-h-none rounded-b-lg">
          {vacio ? (
            <ListaVacia conFiltros={tieneFiltrosActivos(filtros)} />
          ) : (
            items.map((v) => (
              <ItemMaster
                key={v.manifiesto}
                v={v}
                activo={v.manifiesto === sel}
                onClick={() => setSel(v.manifiesto)}
              />
            ))
          )}
        </div>
      </div>

      {/* Detail: panel */}
      <div className="min-w-0 lg:h-full lg:min-h-0">
        {sel ? (
          <DetalleVueloInline manifiesto={sel} prefilterQuery={prefilterQuery} fillHeight withHeader />
        ) : (
          <div className="card h-full flex flex-col items-center justify-center text-center p-12 text-muted">
            <IconAvionVacio />
            <p className="mt-3 text-sm">
              {vacio ? 'No se encontraron vuelos con los filtros actuales' : 'Selecciona un vuelo'}
            </p>
            {vacio && (
              <p className="mt-1 text-[12px] text-slate-400">
                Ajusta la búsqueda o los filtros para ver resultados.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function tieneFiltrosActivos(filtros) {
  return ['dia', 'aerolinea', 'tipo_alerta', 'fecha_desde', 'fecha_hasta', 'buscar'].some(
    (k) => filtros[k] && filtros[k] !== ''
  );
}

function ListaVacia({ conFiltros }) {
  return (
    <div className="px-4 py-10 text-center text-muted">
      <svg className="mx-auto text-slate-300" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <p className="mt-2 text-[13px] font-medium text-slate-500">Sin vuelos</p>
      <p className="mt-0.5 text-[11px] text-slate-400">
        {conFiltros ? 'No hay coincidencias con los filtros.' : 'No hay vuelos para mostrar.'}
      </p>
    </div>
  );
}

function ItemMaster({ v, activo, onClick }) {
  const [manifiestoAbierto, setManifiestoAbierto] = useState(false);
  const [hoverRect, setHoverRect] = useState(null);

  const countAlertas = totalAlertas(v);
  const hayAlertas = countAlertas > 0;

  const estado = v.estado_ruta?.estado || 'PROGRAMADO';
  const enVuelo = estado === 'EN_VUELO';
  const ata = v.sla?.ata;
  const sinArribo = !ata; // sin arribo real → mostramos ETA y habilitamos tracker
  const countdown = countdownArribo(v);

  // Avance de guías: entregadas (hito Despacho) sobre las realmente recibidas
  // (manifestadas − faltantes). La brecha manifestadas vs recibidas evidencia
  // por sí sola si hubo guías faltantes.
  const despacho = (v.trazabilidad || []).find((t) => t.key === 'despacho');
  const entregadas = despacho?.completados ?? 0;
  const manifestadas = v.total_awbs ?? 0;
  const recibidas = Math.max(0, manifestadas - (v.guias_faltantes || 0));

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

      {/* Fila 1: manifiesto (botón + número suelto) · punto de alerta */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setManifiestoAbierto(true); }}
          className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-500 bg-slate-100 hover:text-navy hover:bg-blue-50 transition shrink-0"
          title="Ver numeración del manifiesto de carga"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="6" y="4" width="12" height="17" rx="2" />
            <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
            <path d="M9 11h6M9 15h4" />
          </svg>
        </button>
        <span className="text-[12px] font-semibold text-slate-500 tabular-nums">{v.manifiesto}</span>
        {hayAlertas && (
          <span className="ml-auto">
            <AlertaDot count={countAlertas} />
          </span>
        )}
      </div>

      {/* Fila 2: vuelo + origen (izq) · arribo ATA/ETA (der) — distribuido a lo ancho */}
      <div className="mt-1.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold text-slate-800 tabular-nums leading-none">{v.vuelo}</span>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
              {v.aerolinea_short || v.aerolinea}
            </span>
          </div>
          {/* Origen (el destino siempre es LIM, así que se omite la ruta) */}
          <div
            className={`mt-1.5 inline-flex items-center gap-1.5 text-[12px] ${sinArribo ? '-mx-1 px-1 rounded-md hover:bg-sky-50/70 transition' : ''}`}
            onMouseEnter={sinArribo ? (e) => setHoverRect(e.currentTarget.getBoundingClientRect()) : undefined}
            onMouseLeave={sinArribo ? () => setHoverRect(null) : undefined}
          >
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Origen</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="-rotate-90">
              <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
            </svg>
            <span className="font-bold text-slate-700">{v.origen}</span>
          </div>
        </div>

        {/* Arribo — ATA (real, solo fecha) o ETA (estimada + cuenta regresiva) */}
        <div className="shrink-0">
          <ArriboInfo ata={ata} eta={v.eta} enVuelo={enVuelo} countdown={countdown} />
        </div>
      </div>

      {/* Fila 5: guías (manifestadas) + barra azul segmentada por hito */}
      <div className="mt-2.5">
        <div className="flex items-baseline justify-between text-[11px]">
          <span className="text-slate-500">
            <span className="font-bold text-slate-700 tabular-nums">{manifestadas}</span> g. manifestadas
          </span>
          <span className="text-slate-400 tabular-nums" title="Guías entregadas sobre las realmente recibidas (manifestadas − faltantes)">
            <span className="font-bold text-slate-600">{entregadas}</span>/{recibidas} entreg.
          </span>
        </div>
        <SegmentBar trazabilidad={v.trazabilidad} bultosRecibidos={v.bultos_recibidos} />
      </div>

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

/**
 * Arribo del vuelo. Distingue de un vistazo si es ATA (arribo real → etiqueta
 * sólida + solo fecha) o ETA (estimado → etiqueta contorneada + fecha + cuenta
 * regresiva mientras está en vuelo).
 */
function ArriboInfo({ ata, eta, enVuelo, countdown }) {
  if (ata) {
    return (
      <div className="flex flex-col items-end gap-0.5">
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-700 text-white">
          ATA
        </span>
        <span className="text-[12px] font-semibold text-slate-700 tabular-nums">{fmtFechaHora(ata)}</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-end gap-1">
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border border-sky-300 bg-sky-50 text-sky-700">
        ETA
      </span>
      <span className="text-[12px] font-medium text-slate-500 tabular-nums italic">{fmtFechaHora(eta)}</span>
      {enVuelo && (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 whitespace-nowrap">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-sky-500" />
          </span>
          {countdown || 'En vuelo'}
        </span>
      )}
    </div>
  );
}

/**
 * Barra de avance segmentada por los 5 hitos. Usa la MISMA regla que la
 * trazabilidad del detalle (helper `tonoHitos`), para que ambas cuadren:
 *   verde    → todas las guías superaron el hito
 *   amarillo → el hito ya inició y está en curso
 *   gris     → aún no inicia (p. ej. vuelo en el aire → recepción no arranca)
 */
function SegmentBar({ trazabilidad, bultosRecibidos }) {
  const segs = trazabilidad || [];
  if (segs.length === 0) return null;
  const total = segs[0]?.total ?? 0;
  const tonos = tonoHitos(segs.map((s) => s.completados), total, bultosRecibidos);
  return (
    <div className="mt-1.5 flex gap-1">
      {segs.map((h, i) => {
        const tone = tonos[i];
        const fill = tone === 'verde' ? 'bg-ok' : tone === 'amarillo' ? 'bg-warn' : '';
        return (
          <div
            key={h.key}
            className="h-2 flex-1 rounded-sm bg-slate-200 overflow-hidden"
            title={`${h.label}: ${tone === 'verde' ? 'completado' : tone === 'amarillo' ? 'en curso' : 'pendiente'}`}
          >
            {fill && <div className={`h-full w-full rounded-sm transition-all duration-700 ease-out ${fill}`} />}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Punto de alerta discreto: un círculo con ping lento (2s) que invita a abrir
 * el detalle sin saturar la vista. El desglose de alertas vive en Vista 2.
 */
function AlertaDot({ count }) {
  return (
    <span
      className="relative flex h-2.5 w-2.5"
      title={`${count} ${count === 1 ? 'guía' : 'guías'} con alertas — abre el detalle del vuelo`}
    >
      <span
        className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-60"
        style={{ animationDuration: '2s' }}
      />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
    </span>
  );
}

function IconAvionVacio() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
    </svg>
  );
}

function fmtFechaHora(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
