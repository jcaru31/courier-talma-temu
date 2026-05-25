import { IconoAlerta } from './alertaIconos.jsx';
import { tonoHitos } from './versiones/vuelosVariantHelpers.js';

/**
 * Encabezado del detalle de vuelo (Vista 2) — versión optimizada para Split.
 * NO repite la identificación del vuelo (vuelo, aerolínea, origen, ATA/ETA,
 * estado de ruta): eso ya vive en la fila seleccionada de la lista. Aquí van:
 *   · fila superior: métricas de carga (bultos/kilos) y, al costado, las alertas
 *   · debajo: la gráfica de trazabilidad — los 5 hitos estipulados (los mismos
 *     que en el detalle de la guía). Cada hito completo se marca con check verde
 *     (Despacho verde = entregado). Los hitos del proceso son clicables y
 *     filtran las guías que están en ese estado.
 */

const ALERTAS = [
  { tipo: 'faltantes',  key: 'guias_faltantes',      label: 'Faltantes',  tile: 'bg-slate-200 text-slate-600', active: 'ring-slate-400 bg-slate-100' },
  { tipo: 'inmov',      key: 'guias_con_inmov',       label: 'Inmoviliz.', tile: 'bg-orange-100 text-orange-700', active: 'ring-orange-500 bg-orange-50' },
  { tipo: 'mal_estado', key: 'guias_con_mal_estado',  label: 'Mal estado', tile: 'bg-red-100 text-danger',         active: 'ring-red-500 bg-red-50' },
  { tipo: 'parciales',  key: 'guias_parciales',       label: 'Parciales',  tile: 'bg-amber-100 text-amber-700',    active: 'ring-amber-500 bg-amber-50' },
];

// Los 5 hitos estipulados. `etapa` es el índice del estado en que está la guía
// (estado_tracking). La aerolínea (idx 0) no filtra: toda guía ya está
// manifestada. Los key coinciden con ETAPA_A_ESTADOS de DetalleVueloInline.
const HITOS = [
  { key: 'aerolinea',     label: 'Trasmisión Aerolínea', idx: 0, clickable: false },
  { key: 'recepcion',     label: 'Recepción',            idx: 1, clickable: true },
  { key: 'transmisiones', label: 'Trasmisión Almacén',   idx: 2, clickable: true },
  { key: 'facturacion',   label: 'Facturación',          idx: 3, clickable: true },
  { key: 'despacho',      label: 'Despacho',             idx: 4, clickable: true },
];

// Etapa (índice) en que está cada guía según su estado_tracking. Las faltantes
// se excluyen del avance (son una anomalía con su propia alerta).
const STAGE = { MANIFESTADO: 1, TRANSMISIONES: 2, FACTURACION: 3, DESPACHO: 4, ENTREGADA: 5 };

export default function DetalleVueloHeader({
  vuelo,
  etapaActiva = null,
  alertaActiva = null,
  onEtapa = () => {},
  onAlerta = () => {},
}) {
  const handlingPendientes = (vuelo.awbs || []).filter((a) => a.handling_pagado === false).length;
  const alertasActivas = ALERTAS.map((a) => ({ ...a, count: vuelo[a.key] || 0 })).filter((a) => a.count > 0);
  const sinAlertas = alertasActivas.length === 0 && handlingPendientes === 0;

  return (
    <div className="card p-3.5 space-y-3 shrink-0">
      {/* Fila 1: métricas de carga (izq, apiladas) al costado de la trazabilidad.
          Las métricas no compiten con las alertas: por más grandes que sean los
          números, las alertas viven en su propia fila debajo. */}
      <div className="flex items-stretch gap-4 flex-wrap">
        <div className="flex flex-col gap-2 shrink-0">
          <MetricCard label="Bultos" rec={vuelo.bultos_recibidos} man={vuelo.bultos_esperados} />
          <MetricCard label="Kilos" rec={fmtKg(vuelo.kgs_recibidos)} man={fmtKg(vuelo.kgs_esperados)} />
        </div>
        <div className="flex-1 min-w-[300px] flex items-center">
          <TrazabilidadFiltro awbs={vuelo.awbs} bultosRecibidos={vuelo.bultos_recibidos} etapaActiva={etapaActiva} onEtapa={onEtapa} />
        </div>
      </div>

      {/* Fila 2: alertas como FILTROS (incluye Pago handling) */}
      <div className="flex items-center gap-2 flex-wrap border-t border-border pt-2.5">
        <span className="text-[10px] uppercase tracking-wider text-muted font-bold mr-1">Alertas</span>
        {sinAlertas ? (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[12px] text-emerald-700 font-medium">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Sin alertas
          </span>
        ) : (
          <>
            {alertasActivas.map((a) => (
              <AlertaTile
                key={a.tipo}
                alerta={a}
                activa={alertaActiva === a.tipo}
                onClick={() => onAlerta(alertaActiva === a.tipo ? null : a.tipo)}
              />
            ))}
            {handlingPendientes > 0 && (
              <HandlingTile
                count={handlingPendientes}
                activa={alertaActiva === 'handling'}
                onClick={() => onAlerta(alertaActiva === 'handling' ? null : 'handling')}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, rec, man }) {
  return (
    <div className="rounded-lg border border-border bg-slate-50 px-3 py-1.5 flex items-center gap-2">
      <span className="text-[9px] uppercase tracking-wide text-slate-400 font-bold">{label}</span>
      <span className="text-base font-bold tabular-nums text-slate-800">
        {rec ?? '—'}<span className="text-slate-400 font-medium">/{man ?? '—'}</span>
      </span>
    </div>
  );
}

/** Tile de alerta compacto: icono grande + conteo + etiqueta.
 *  Clicable: filtra la tabla de guías por ese tipo de alerta. */
function AlertaTile({ alerta, activa, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${alerta.label}: ${alerta.count} — clic para filtrar`}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border transition ${
        activa ? `ring-2 ${alerta.active} border-transparent` : 'border-border hover:bg-slate-50'
      }`}
    >
      <span className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${alerta.tile}`}>
        <IconoAlerta tipo={alerta.tipo} size={17} />
      </span>
      <span className="flex flex-col leading-none items-start">
        <span className="text-base font-bold tabular-nums text-slate-800">{alerta.count}</span>
        <span className="text-[9px] uppercase tracking-wide text-slate-400 font-bold">{alerta.label}</span>
      </span>
    </button>
  );
}

// Tile de "Pago handling" — clicable como un filtro más (guías con el pago
// pendiente). Icono: moneda $ con un reloj de "pendiente" para que se entienda
// que es una acción que falta hacer.
function HandlingTile({ count, activa, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`Pago handling pendiente: ${count} — clic para filtrar`}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border transition ${
        activa ? 'ring-2 ring-fuchsia-500 bg-fuchsia-50 border-transparent' : 'border-border hover:bg-slate-50'
      }`}
    >
      <span className="relative w-8 h-8 rounded-md bg-fuchsia-100 text-fuchsia-700 flex items-center justify-center shrink-0">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 6v12" />
          <path d="M16 9c0-1.5-1.8-2.5-4-2.5s-4 1-4 2.5 1.8 2 4 2.5 4 1 4 2.5-1.8 2.5-4 2.5-4-1-4-2.5" />
        </svg>
        {/* badge "pendiente" (reloj) */}
        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-fuchsia-600 text-white flex items-center justify-center ring-2 ring-white">
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4l2.5 2" />
          </svg>
        </span>
      </span>
      <span className="flex flex-col leading-none items-start">
        <span className="text-base font-bold tabular-nums text-slate-800">{count}</span>
        <span className="text-[9px] uppercase tracking-wide text-slate-400 font-bold">Pago handling</span>
      </span>
    </button>
  );
}

/**
 * Gráfica de trazabilidad. UNA sola fuente: el estado en que está cada guía
 * (estado_tracking). El número de cada hito = guías que ESTÁN ahí ahora — lo
 * mismo que devuelve el filtro al hacer clic, y lo mismo que pinta la barra del
 * card. Las faltantes se excluyen (anomalía con su propia alerta).
 *   verde + ✓  → todas las guías ya superaron el hito (Despacho ✓ = entregadas)
 *   amarillo + nº → nº guías trabajándolo ahora
 *   gris + 0   → aún no se llega
 */
function TrazabilidadFiltro({ awbs, bultosRecibidos, etapaActiva, onEtapa }) {
  const recibidas = (awbs || []).filter((a) => a.estado_tracking !== 'FALTANTE');
  const stageOf = (a) => STAGE[a.estado_tracking] || 0;
  const total = recibidas.length;
  const aqui = (idx) => recibidas.filter((a) => stageOf(a) === idx).length;
  // completados[i] = guías que YA pasaron el hito i (su etapa es posterior).
  const completados = HITOS.map((h) => recibidas.filter((a) => stageOf(a) > h.idx).length);
  // Mismo criterio que la barra del card: un hito solo está "en curso" si ya
  // inició (recepción al llegar carga; el resto cuando el anterior tiene
  // completados). Así un vuelo en el aire NO pinta recepción en curso.
  const tonos = tonoHitos(completados, total, bultosRecibidos);

  return (
    <div className="grid items-start gap-1" style={{ gridTemplateColumns: `repeat(${HITOS.length}, minmax(0,1fr))` }}>
      {HITOS.map((h, i) => {
        const count = aqui(h.idx);
        const tone = tonos[i];
        const isDone = tone === 'verde';
        const activa = etapaActiva === h.key;

        const num = tone === 'amarillo' ? 'text-amber-600' : 'text-slate-400';
        const isFirst = i === 0;
        const isLast = i === HITOS.length - 1;
        const prevDone = !isFirst && tonos[i - 1] === 'verde';
        const nextDone = !isLast && tonos[i + 1] === 'verde';

        const Comp = h.clickable ? 'button' : 'div';
        return (
          <Comp
            key={h.key}
            {...(h.clickable ? { type: 'button', onClick: (e) => { e.stopPropagation(); onEtapa(activa ? null : h.key); } } : {})}
            title={
              (isDone ? `${h.label}: completado` : `${h.label}: ${count} guía(s) en este hito`) +
              (h.clickable ? ' — clic para filtrar' : '')
            }
            className={`flex flex-col items-center px-1 py-1 rounded-md transition ${
              activa ? 'bg-blue-50 ring-2 ring-navy' : h.clickable ? 'hover:bg-slate-100 cursor-pointer' : ''
            }`}
          >
            <span className={`text-[12px] font-bold tabular-nums leading-none h-3.5 flex items-center ${num}`}>
              {isDone ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00C853" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                count
              )}
            </span>
            <span className="relative w-full flex items-center justify-center h-5 mt-1.5">
              {!isFirst && <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-1/2 h-[3px] ${prevDone && isDone ? 'bg-ok' : 'bg-slate-200'}`} />}
              {!isLast && <span className={`absolute right-0 top-1/2 -translate-y-1/2 w-1/2 h-[3px] ${isDone && nextDone ? 'bg-ok' : 'bg-slate-200'}`} />}
              <NodoHito tone={tone} />
            </span>
            <span className={`mt-1 text-[9px] uppercase tracking-wide font-bold text-center leading-tight ${activa ? 'text-navy' : 'text-slate-500'}`}>
              {h.label}
            </span>
          </Comp>
        );
      })}
    </div>
  );
}

// Nodo del hito: verde con check (completado), amarillo (en curso) o gris (pendiente).
function NodoHito({ tone }) {
  if (tone === 'verde') {
    return (
      <span className="relative z-10 w-5 h-5 rounded-full bg-ok flex items-center justify-center shadow-sm ring-2 ring-white">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
    );
  }
  return (
    <span className={`relative z-10 w-4 h-4 rounded-full shadow-sm ${tone === 'amarillo' ? 'bg-warn' : 'bg-slate-300'}`} />
  );
}

function fmtKg(n) {
  if (n == null) return '—';
  return n.toLocaleString('es-PE', { minimumFractionDigits: 2 });
}
