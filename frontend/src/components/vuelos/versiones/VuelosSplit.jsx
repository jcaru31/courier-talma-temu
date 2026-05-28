import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import DetalleVueloInline from '../DetalleVueloInline.jsx';
import ManifiestoModal from '../ManifiestoModal.jsx';
import FiltrosVuelos from '../FiltrosVuelos.jsx';
import TooltipVueloRuta from '../TooltipVueloRuta.jsx';
import RichTooltipTrigger from '../RichTooltip.jsx';
import { IconoAlerta } from '../alertaIconos.jsx';
import { totalAlertas, countdownArribo, tonoHitos } from './vuelosVariantHelpers.js';

const HITO_LABEL_LARGO = {
  aerolinea:     'Trasmisión Aerolínea',
  recepcion:     'Recepción',
  transmisiones: 'Trasmisión Almacén',
  facturacion:   'Facturación',
  despacho:      'Despacho',
};

const ALERTA_INFO = {
  faltantes:  { key: 'guias_faltantes',     label: 'Faltantes',   desc: 'Manifestadas que no arribaron al terminal.', cls: 'text-slate-300' },
  inmov:      { key: 'guias_con_inmov',     label: 'Inmovilizadas', desc: 'Sin autorización de salida: requiere levante.', cls: 'text-orange-300' },
  mal_estado: { key: 'guias_con_mal_estado', label: 'Mal estado',  desc: 'Bultos con daño reportado en acta.', cls: 'text-red-300' },
  parciales:  { key: 'guias_parciales',     label: 'Parciales',   desc: 'Arribaron con menos bultos de lo manifestado.', cls: 'text-amber-300' },
};

/**
 * VARIANTE 2 — Master-detail (split pane).
 * Lista compacta y seleccionable a la izquierda; panel de detalle fijo a la
 * derecha. La fila de la lista resume el vuelo de forma jerárquica: manifiesto
 * arriba, vuelo, origen (el destino siempre es LIM), arribo (ATA real o ETA
 * estimada con cuenta regresiva) y avance de guías. Las alertas NO se detallan
 * aquí: solo un punto animado invita a abrir el detalle, donde se desglosan.
 */
// Categorías del buscador. La placeholder y el comportamiento de filtrado
// cambian según la seleccionada. La opción activa se envía como `buscar_tipo`
// al backend para restringir la búsqueda a esa categoría.
const CATEGORIAS = [
  { key: 'vuelo',      label: 'Vuelo',     placeholder: 'Ej. 5Y 8676' },
  { key: 'manifiesto', label: 'Manifiesto', placeholder: 'Ej. 2026-20107' },
  { key: 'guia',       label: 'Guía',       placeholder: 'AWB o últimos 4 dígitos' },
];

export default function VuelosSplit({ items, loading, prefilterQuery, filtros = {}, onFiltrosChange }) {
  const [sel, setSel] = useState(null);

  // Al abrir el tablero no se preselecciona ningun vuelo: la vista detalle
  // queda en su estado vacio hasta que el usuario elija un vuelo. Si la
  // seleccion actual deja de existir tras cambiar filtros, la limpiamos.
  useEffect(() => {
    if (sel && !items?.some((v) => v.manifiesto === sel)) {
      setSel(null);
    }
  }, [items, sel]);

  // Buscador con debounce (300ms). El input mantiene su valor local para no
  // perder foco/posición mientras el usuario tipea; solo después de la pausa
  // se dispara onFiltrosChange (y por ende el fetch).
  const [qLocal, setQLocal] = useState(filtros.buscar || '');
  const [categoria, setCategoria] = useState(filtros.buscar_tipo || 'vuelo');

  // Si filtros.buscar cambia desde afuera (limpieza, otra ruta) sincronizamos.
  useEffect(() => { setQLocal(filtros.buscar || ''); }, [filtros.buscar]);

  // Debounce: 300ms tras la última pulsación, propagamos cambios.
  useEffect(() => {
    const valorActual = filtros.buscar || '';
    const tipoActual = filtros.buscar_tipo || 'vuelo';
    if (qLocal === valorActual && categoria === tipoActual) return;
    const id = setTimeout(() => {
      onFiltrosChange?.({ ...filtros, buscar: qLocal, buscar_tipo: categoria });
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qLocal, categoria]);

  const cat = CATEGORIAS.find((c) => c.key === categoria) || CATEGORIAS[0];

  if (loading && !items?.length) {
    return <div className="card p-12 text-center text-muted">Cargando vuelos...</div>;
  }

  const vacio = !items?.length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-3 lg:h-[calc(100vh-7rem)]">
      {/* Master: lista */}
      <div className="card flex flex-col min-h-0">
        {/* Cabecera: selector de categoría + buscador + icono de filtros */}
        <div className="px-2.5 py-2 border-b border-border bg-slate-50 space-y-1.5 shrink-0 rounded-t-lg">
          {/* Segmented control para elegir la categoría de búsqueda */}
          <div className="flex items-center gap-1 p-0.5 rounded-md bg-white border border-border">
            {CATEGORIAS.map((c) => {
              const activo = c.key === categoria;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCategoria(c.key)}
                  className={`flex-1 px-1.5 py-1 text-[11px] font-semibold rounded transition tracking-wide ${
                    activo
                      ? 'bg-navy text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5">
            <div className="relative flex-1 min-w-0">
              <input
                type="text"
                value={qLocal}
                onChange={(e) => setQLocal(e.target.value)}
                placeholder={`Buscar por ${cat.label.toLowerCase()} — ${cat.placeholder}`}
                className="w-full pl-7 pr-7 py-1.5 text-[12px] border border-border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-navy/30"
              />
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              {qLocal && (
                <button
                  type="button"
                  onClick={() => setQLocal('')}
                  title="Limpiar"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
            {onFiltrosChange && (
              <FiltrosVuelos filtros={filtros} onChange={onFiltrosChange} iconOnly />
            )}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted font-semibold flex items-center gap-1.5">
            {items?.length || 0} vuelos
            {loading && (
              <span className="inline-block w-2 h-2 rounded-full bg-navy/40 animate-pulse" title="Actualizando" />
            )}
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
  return ['dia', 'aerolinea', 'fecha_desde', 'fecha_hasta', 'buscar'].some(
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
  // Tracker tooltip: hover muestra; clic ancla (persiste hasta clic afuera).
  const [hoverRect, setHoverRect] = useState(null);
  const [pinnedRect, setPinnedRect] = useState(null);
  const triggerRef = useRef(null);

  const countAlertas = totalAlertas(v);
  const hayAlertas = countAlertas > 0;

  const estado = v.estado_ruta?.estado || 'PROGRAMADO';
  const enVuelo = estado === 'EN_VUELO';
  const ata = v.sla?.ata;
  const sinArribo = !ata; // sin arribo real → mostramos ETA y habilitamos tracker
  const countdown = countdownArribo(v);

  // Cierra el tooltip anclado al hacer clic fuera de él o del disparador.
  useEffect(() => {
    if (!pinnedRect) return;
    const onDown = (e) => {
      if (triggerRef.current?.contains(e.target)) return;
      setPinnedRect(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [pinnedRect]);

  const handleTriggerClick = (e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setPinnedRect((cur) => (cur ? null : rect));
    setHoverRect(null);
  };
  const handleTriggerEnter = (e) => {
    if (pinnedRect) return;
    setHoverRect(e.currentTarget.getBoundingClientRect());
  };
  const handleTriggerLeave = () => {
    if (pinnedRect) return;
    setHoverRect(null);
  };

  // Avance de guías: entregadas (hito Despacho) sobre las realmente recibidas
  // (manifestadas − faltantes). La brecha manifestadas vs recibidas evidencia
  // por sí sola si hubo guías faltantes.
  const despacho = (v.trazabilidad || []).find((t) => t.key === 'despacho');
  const entregadas = despacho?.completados ?? 0;
  const manifestadas = v.total_awbs ?? 0;
  const recibidas = Math.max(0, manifestadas - (v.guias_faltantes || 0));

  // Resaltado por responsabilidad: las cards de vuelos con TALMA en curso
  // llevan un sutil tinte ámbar + barra lateral pulsante para que destaquen.
  // Solo pasa a rojo si TALMA lleva 8h+ sin cerrar (umbral propio, no usa el
  // SLA del backend). El estilo "activo" (azul) tiene prioridad para no
  // perder la selección.
  const esTalma = v.sla?.responsabilidad === 'TALMA' && !v.sla?.vuelo_cerrado;
  const talmaExcedido = esTalma && (v.sla?.minutos_transcurridos || 0) >= TALMA_RED_MIN;
  const tinteCard = activo
    ? 'bg-blue-50/70'
    : talmaExcedido
    ? 'bg-rose-50/60 hover:bg-rose-50/80'
    : esTalma
    ? 'bg-amber-50/50 hover:bg-amber-50/70'
    : 'hover:bg-slate-50';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }
      }}
      className={`w-full text-left px-3 py-2.5 transition relative cursor-pointer outline-none ${tinteCard}`}
    >
      {/* Barra lateral: activa (navy) tiene prioridad; sino, TALMA en curso
          pinta una barra ámbar pulsante; TALMA excedido la pinta rosa. */}
      {activo ? (
        <span className="absolute left-0 top-0 bottom-0 w-1 bg-navy rounded-r" />
      ) : talmaExcedido ? (
        <span className="absolute left-0 top-0 bottom-0 w-1 bg-rose-400 rounded-r animate-pulse" />
      ) : esTalma ? (
        <span className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400 rounded-r animate-pulse" />
      ) : null}

      {/* Cabecera del card: dos columnas. Izquierda con identificación del
          vuelo (3 líneas: MFTO · vuelo+aerolinea · origen); derecha alineada
          con esas líneas (tag de arribo · fecha · countdown). */}
      <div className="flex items-start gap-2">
        {/* Columna IZQUIERDA */}
        <div className="flex-1 min-w-0">
          {/* L1: icono manifiesto + MFTO. número */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setManifiestoAbierto(true); }}
              className="inline-flex items-center justify-center w-6 h-6 rounded-md text-slate-500 bg-slate-100 hover:text-navy hover:bg-blue-50 transition shrink-0"
              title="Ver numeración del manifiesto de carga"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="4" width="12" height="17" rx="2" />
                <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
                <path d="M9 11h6M9 15h4" />
              </svg>
            </button>
            <span className="inline-flex items-baseline gap-1 text-[11px] font-semibold text-slate-500 tabular-nums">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">MFTO.</span>
              {v.manifiesto}
            </span>
          </div>
          {/* L2: vuelo + aerolínea */}
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-[15px] font-bold text-slate-800 tabular-nums leading-none">{v.vuelo}</span>
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">
              {v.aerolinea_short || v.aerolinea}
            </span>
          </div>
          {/* L3: origen */}
          <div className="mt-1.5 inline-flex items-center gap-1 text-[11px]">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Origen</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="-rotate-90">
              <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
            </svg>
            <span className="font-bold text-slate-700">{v.origen}</span>
          </div>
        </div>

        {/* Columna DERECHA apilada. Cuando hay alerta, ocupa la línea superior
            y empuja el resto hacia abajo (así no se confunde con un conteo del
            ATA). Sin alerta, el tag sube al tope (donde habitualmente vivían
            las alertas). */}
        <div className="shrink-0 flex flex-col items-end gap-1.5">
          {hayAlertas && <AlertaDot vuelo={v} count={countAlertas} />}
          <ArriboTag ata={ata} eta={v.eta} />
          <span className={`text-[12px] tabular-nums leading-none ${ata ? 'font-semibold text-slate-700' : 'font-medium text-slate-500 italic'}`}>
            {fmtFechaHora(ata || v.eta)}
          </span>
          {!ata && enVuelo && (
            <CountdownArriboBtn
              countdown={countdown}
              triggerRef={triggerRef}
              pinned={!!pinnedRect}
              onClick={handleTriggerClick}
              onEnter={handleTriggerEnter}
              onLeave={handleTriggerLeave}
            />
          )}
        </div>
      </div>

      {/* Fila: pill responsabilidad + conteo entregadas — solo si vuelo arribó
          o ya hay entregas. Antes del arribo se omite para evitar huecos. */}
      {(ata || entregadas > 0) && (
        <div className="mt-2 flex items-center gap-2">
          {ata && <SlaResponsabilidad sla={v.sla} />}
          <span className="ml-auto text-[10px] text-slate-400 tabular-nums">
            <span className="font-bold text-slate-600">{entregadas}</span>/{recibidas} entreg. · {manifestadas} man.
          </span>
        </div>
      )}
      <div className="mt-2">
        <SegmentBar trazabilidad={v.trazabilidad} />
      </div>

      {manifiestoAbierto &&
        createPortal(
          <ManifiestoModal vuelo={v} onClose={() => setManifiestoAbierto(false)} />,
          document.body
        )}
      {(hoverRect || pinnedRect) &&
        createPortal(
          <TooltipVueloRuta
            vuelo={v}
            anchorRect={pinnedRect || hoverRect}
            pinned={!!pinnedRect}
            onClose={() => setPinnedRect(null)}
          />,
          document.body
        )}
    </div>
  );
}

// Umbral simple para pintar en rojo cuando TALMA aún no cierra: 8h desde ATA.
const TALMA_RED_MIN = 8 * 60;

/**
 * Pill de responsabilidad operativa post-ATA. Tooltip rico al hover.
 *  - TALMA en curso: ámbar (rojo si pasó 8h) — tooltip muestra solo el
 *    tiempo transcurrido.
 *  - COURIER (vuelo cerrado): azul con check — tooltip muestra hora y
 *    duración del cierre.
 */
function SlaResponsabilidad({ sla }) {
  if (!sla?.ata) return null;
  const cerrado = !!sla.vuelo_cerrado;
  const resp = sla.responsabilidad || (cerrado ? 'COURIER' : 'TALMA');
  // Etiqueta visible: la zona "COURIER" se renombra a "ESSER" en UI.
  const respLabel = resp === 'COURIER' ? 'ESSER' : resp;
  const transcurridos = sla.minutos_transcurridos || 0;

  if (cerrado) {
    const cierreExcedido = transcurridos >= TALMA_RED_MIN;
    return (
      <RichTooltipTrigger
        title="ESSER"
        rows={[
          { label: 'Hora de cierre', valor: formatHora(sla.cierre_iso) },
          {
            label: 'Duración de cierre',
            valor: cierreExcedido ? 'Se superaron las 8 horas' : formatHM(transcurridos),
          },
        ]}
        width={cierreExcedido ? 280 : 240}
      >
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider border-sky-300 bg-sky-50 text-sky-700">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="opacity-70">Resp.:</span>
          <span>{respLabel}</span>
        </span>
      </RichTooltipTrigger>
    );
  }

  const excedido = transcurridos >= TALMA_RED_MIN;
  const cls = excedido
    ? 'border-rose-300 bg-rose-50 text-rose-700'
    : 'border-amber-300 bg-amber-50 text-amber-700';
  return (
    <RichTooltipTrigger
      title="TALMA"
      rows={[{
        label: 'Tiempo transcurrido',
        valor: excedido ? 'Se superaron las 8 horas' : formatHM(transcurridos),
      }]}
      width={excedido ? 260 : 220}
    >
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${cls}`}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 7 12 12 15 14" />
        </svg>
        <span className="opacity-70">Resp.:</span>
        <span>{resp}</span>
      </span>
    </RichTooltipTrigger>
  );
}

function formatHM(minutos) {
  const m = Math.max(0, Math.round(minutos || 0));
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h > 0 ? `${h}h ${String(r).padStart(2, '0')}min` : `${r}min`;
}
function formatHora(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * Etiqueta de arribo: ATA (sólida) si ya aterrizó, ETA (contorneada) si no.
 * Solo el tag; la fecha y el countdown viven en filas separadas de la columna.
 */
function ArriboTag({ ata }) {
  if (ata) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-700 text-white">
        ATA
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border border-sky-300 bg-sky-50 text-sky-700">
      ETA
    </span>
  );
}

/**
 * Botón de cuenta regresiva al arribo. Hover muestra el tracker de ruta;
 * clic lo ancla (persiste hasta clic afuera).
 */
function CountdownArriboBtn({ countdown, triggerRef, pinned, onClick, onEnter, onLeave }) {
  return (
    <button
      ref={triggerRef}
      type="button"
      onClick={onClick}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      title={pinned ? 'Clic para cerrar el tracker' : 'Clic para anclar · hover para ver el tracker'}
      className={`inline-flex items-center gap-1 text-[11px] font-semibold whitespace-nowrap rounded-md px-1.5 py-0.5 transition border ${
        pinned
          ? 'bg-navy/10 text-navy border-navy/40'
          : 'border-transparent text-sky-600 hover:bg-sky-50 hover:border-sky-200'
      }`}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${pinned ? 'bg-navy/40' : 'bg-sky-400'}`} />
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${pinned ? 'bg-navy' : 'bg-sky-500'}`} />
      </span>
      {countdown || 'En vuelo'}
    </button>
  );
}

/**
 * Barra de avance segmentada por los 5 hitos. Usa la MISMA regla binaria
 * que la trazabilidad del detalle (helper `tonoHitos`):
 *   verde → todas las guías superaron el hito (c === total)
 *   gris  → cualquier otro caso (no existe estado "en curso")
 * Cada segmento es un trigger de tooltip rico con el nombre del hito, el
 * estado y el conteo de guías que pasaron / faltan.
 */
function SegmentBar({ trazabilidad }) {
  const segs = trazabilidad || [];
  if (segs.length === 0) return null;
  const tonos = tonoHitos(
    segs.map((s) => s.completados),
    segs.map((s) => s.total),
  );
  return (
    <div className="mt-1.5 flex gap-1">
      {segs.map((h, i) => {
        const tone = tonos[i];
        const fill = tone === 'verde' ? 'bg-ok' : '';
        const estadoTxt = tone === 'verde' ? 'Completado' : 'Pendiente';
        const totalH = h.total || 0;
        const pasaron = h.completados || 0;
        const faltan = Math.max(0, totalH - pasaron);
        const tipText = tone === 'verde'
          ? `Todas las guías superaron este hito (${pasaron}/${totalH}).`
          : `${pasaron}/${totalH} guías ya lo pasaron · ${faltan} pendientes.`;
        return (
          <RichTooltipTrigger
            key={h.key}
            title={HITO_LABEL_LARGO[h.key] || h.label}
            rows={[
              { label: 'Estado', valor: estadoTxt },
              { label: 'Avance', valor: `${pasaron} / ${totalH}`, desc: tipText },
            ]}
            width={240}
            className="flex-1"
          >
            <div className="h-2 flex-1 w-full rounded-sm bg-slate-200 overflow-hidden">
              {fill && <div className={`h-full w-full rounded-sm transition-all duration-700 ease-out ${fill}`} />}
            </div>
          </RichTooltipTrigger>
        );
      })}
    </div>
  );
}

/**
 * Indicador de alerta prominente: círculo rosa con conteo, ping animado.
 * Al pasar el cursor abre un tooltip con el desglose por tipo de alerta.
 */
function AlertaDot({ vuelo, count }) {
  const rows = Object.entries(ALERTA_INFO)
    .map(([tipo, info]) => ({ tipo, info, n: vuelo[info.key] || 0 }))
    .filter((x) => x.n > 0)
    .map((x) => ({
      icon: <IconoAlerta tipo={x.tipo} size={14} />,
      iconCls: x.info.cls,
      label: x.info.label,
      valor: String(x.n),
      desc: x.info.desc,
    }));

  return (
    <RichTooltipTrigger
      title={`${count} ${count === 1 ? 'guía' : 'guías'} con alertas`}
      rows={rows}
      width={264}
    >
      <span className="relative inline-flex items-center justify-center">
        <span
          className="animate-ping absolute inline-flex h-5 w-5 rounded-full bg-rose-400 opacity-60"
          style={{ animationDuration: '2s' }}
        />
        <span className="relative inline-flex items-center justify-center h-5 w-5 rounded-full bg-rose-500 ring-2 ring-white shadow-sm text-white text-[10px] font-bold tabular-nums">
          {count > 9 ? '9+' : count}
        </span>
      </span>
    </RichTooltipTrigger>
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
