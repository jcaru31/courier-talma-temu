import { useEffect, useState } from 'react';
import { IconoAlerta } from './alertaIconos.jsx';
import { alertaHandlingPendiente } from '../../utils/handlingAlerta.js';

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
// (estado_tracking). Los key coinciden con ETAPA_A_ESTADOS de DetalleVueloInline.
// `zona` agrupa la responsabilidad operativa:
//   TALMA   → operación física en el almacén (aerolínea, recepción, almacén)
//   COURIER → gestión documental y retiro (facturación, despacho)
const HITOS = [
  { key: 'aerolinea',     label: 'Trasmisión Aerolínea', idx: 0, clickable: true, zona: 'TALMA' },
  { key: 'recepcion',     label: 'Recepción',            idx: 1, clickable: true, zona: 'TALMA' },
  { key: 'transmisiones', label: 'Trasmisión Almacén',   idx: 2, clickable: true, zona: 'TALMA' },
  { key: 'facturacion',   label: 'Facturación',          idx: 3, clickable: true, zona: 'COURIER' },
  { key: 'despacho',      label: 'Despacho',             idx: 4, clickable: true, zona: 'COURIER' },
];

// Etapa (índice) del HITO ACTUAL de cada guía. Las faltantes se excluyen del
// avance (son anomalía con su propia alerta). El estado terminal "entregada"
// no es un hito aparte: viene como flag `a.entregada` y se usa solo para el
// check verde de Despacho.
const STAGE = {
  TRASMISION_AEROLINEA: 0,
  MANIFESTADO: 1,
  TRANSMISIONES: 2,
  FACTURACION: 3,
  DESPACHO: 4,
};

export default function DetalleVueloHeader({
  vuelo,
  etapaActiva = null,
  alertaActiva = null,
  onEtapa = () => {},
  onAlerta = () => {},
}) {
  const handlingPendientes = (vuelo.awbs || []).filter(alertaHandlingPendiente).length;
  const alertasActivas = ALERTAS.map((a) => ({ ...a, count: vuelo[a.key] || 0 })).filter((a) => a.count > 0);
  const sinAlertas = alertasActivas.length === 0 && handlingPendientes === 0;

  return (
    <div className="card p-3.5 space-y-3 shrink-0">
      {/* Métricas de carga (izq, apiladas) al costado de la trazabilidad.
          La trazabilidad ahora integra las zonas TALMA / COURIER y el
          cronómetro + hora de cierre directamente en sus cabeceras. */}
      <div className="flex items-stretch gap-4 flex-wrap">
        <div className="flex flex-col gap-2 shrink-0">
          <MetricCard label="Bultos" rec={vuelo.bultos_recibidos} man={vuelo.bultos_esperados} />
          <MetricCard label="Kilos" rec={fmtKg(vuelo.kgs_recibidos)} man={fmtKg(vuelo.kgs_esperados)} />
        </div>
        <div className="flex-1 min-w-[300px] flex items-center">
          <TrazabilidadFiltro
            awbs={vuelo.awbs}
            sla={vuelo.sla}
            etapaActiva={etapaActiva}
            onEtapa={onEtapa}
          />
        </div>
      </div>

      {/* Fila 2: alertas como FILTROS (incluye Pago handling). Solo se muestra
          si el vuelo ya arribó (post-ATA) y tiene alertas reales — un panel
          "Sin alertas" añade ruido visual sin aportar información accionable,
          y los vuelos programados o por arribar no pueden tener alertas. */}
      {vuelo.sla?.ata && !sinAlertas && (
        <div className="flex items-center gap-2 flex-wrap border-t border-border pt-2.5">
          <span className="text-[10px] uppercase tracking-wider text-muted font-bold mr-1">Alertas</span>
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
        </div>
      )}
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
 * Gráfica de trazabilidad. Cada nodo muestra N/D:
 *   N = guías que están en el hito + las que ya lo pasaron (suma acumulada).
 *   D = total de guías recibidas (sin faltantes).
 * Solo dos estados visuales: verde (cuando N === D, todas las recibidas ya
 * tocaron el hito) o gris (todavía faltan). El estado "en curso" pertenece a
 * la vista 3 (sub-eventos del hito), aquí no se pinta amarillo.
 *
 * El check ✓ del hito final (Despacho) aparece SOLO cuando todas las recibidas
 * están entregadas (no basta con haber llegado al hito).
 */
function TrazabilidadFiltro({ awbs, sla, etapaActiva, onEtapa }) {
  const recibidas = (awbs || []).filter((a) => a.estado_tracking !== 'FALTANTE');
  const stageOf = (a) => STAGE[a.estado_tracking] || 0;
  const total = recibidas.length;
  const tocaron = HITOS.map((h) => recibidas.filter((a) => stageOf(a) >= h.idx).length);
  const entregadas = recibidas.filter((a) => a.entregada).length;

  // Cierre verde por hito: para Despacho usamos "entregadas" (no basta con
  // haber llegado); para el resto, "todas las recibidas tocaron el hito".
  const doneAt = (i) => {
    if (total === 0) return false;
    return HITOS[i].key === 'despacho' ? entregadas === total : tocaron[i] === total;
  };

  // Construimos las dos zonas (TALMA, COURIER) preservando el índice global
  // del hito — eso mantiene la lógica de conectores entre hitos consecutivos.
  const zonas = [
    { key: 'TALMA',   indices: HITOS.map((h, i) => [h, i]).filter(([h]) => h.zona === 'TALMA') },
    { key: 'COURIER', indices: HITOS.map((h, i) => [h, i]).filter(([h]) => h.zona === 'COURIER') },
  ];

  // Color del fondo y borde de cada zona — sincronizado con los chips de
  // responsabilidad del listado de vuelos. COURIER siempre celeste; TALMA
  // cambia de tono según el estado del cronómetro.
  const transcurridosMin = sla?.minutos_transcurridos || 0;
  const excedeTalma = transcurridosMin > 8 * 60;
  const cerradoTalma = !!sla?.vuelo_cerrado;
  const tieneAta = !!sla?.ata;
  const skinTalma = !tieneAta
    ? 'border-amber-200 bg-amber-50/40'
    : excedeTalma
    ? 'border-rose-300 bg-rose-50'
    : cerradoTalma
    ? 'border-emerald-300 bg-emerald-50'
    : 'border-amber-300 bg-amber-50';
  const skinCourier = 'border-sky-300 bg-sky-50';

  return (
    <div className="flex items-stretch gap-2 w-full">
      {zonas.map((zona, zIdx) => (
        <div
          key={zona.key}
          className={`flex-1 rounded-md border ${
            zona.key === 'TALMA' ? skinTalma : skinCourier
          } p-1.5`}
          style={{ flexGrow: zona.indices.length }}
        >
          <ZonaHeader zona={zona.key} sla={sla} />
          <div className="grid items-start gap-1 mt-1" style={{ gridTemplateColumns: `repeat(${zona.indices.length}, minmax(0,1fr))` }}>
            {zona.indices.map(([h, i], localIdx) => {
              const n = tocaron[i];
              const isDone = doneAt(i);
              const activa = etapaActiva === h.key;
              // Conectores: ahora son LOCALES a la zona (no cruzan el borde).
              const isFirstLocal = localIdx === 0;
              const isLastLocal = localIdx === zona.indices.length - 1;
              const prevDone = !isFirstLocal && doneAt(zona.indices[localIdx - 1][1]);
              const nextDone = !isLastLocal && doneAt(zona.indices[localIdx + 1][1]);

              const Comp = h.clickable ? 'button' : 'div';
              return (
                <Comp
                  key={h.key}
                  {...(h.clickable ? { type: 'button', onClick: (e) => { e.stopPropagation(); onEtapa(activa ? null : h.key); } } : {})}
                  title={
                    `${h.label}: ${n}/${total} guía(s) recibidas tocaron este hito` +
                    (h.clickable ? ' — clic para filtrar' : '')
                  }
                  className={`flex flex-col items-center px-1 py-1 rounded-md transition ${
                    activa ? 'bg-blue-50 ring-2 ring-navy' : h.clickable ? 'hover:bg-white/60 cursor-pointer' : ''
                  }`}
                >
                  <span className="text-[12px] font-bold tabular-nums leading-none h-3.5 flex items-center gap-1">
                    <span className={isDone ? 'text-ok' : 'text-slate-700'}>{n}</span>
                    <span className="text-slate-300 font-medium">/</span>
                    <span className="text-slate-400 font-medium">{total}</span>
                  </span>
                  <span className="relative w-full flex items-center justify-center h-5 mt-1.5">
                    {!isFirstLocal && <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-1/2 h-[3px] ${prevDone && isDone ? 'bg-ok' : 'bg-slate-200'}`} />}
                    {!isLastLocal && <span className={`absolute right-0 top-1/2 -translate-y-1/2 w-1/2 h-[3px] ${isDone && nextDone ? 'bg-ok' : 'bg-slate-200'}`} />}
                    <NodoHito done={isDone} checkmark={h.key === 'despacho' && isDone} />
                  </span>
                  <span className={`mt-1 text-[9px] uppercase tracking-wide font-bold text-center leading-tight ${activa ? 'text-navy' : 'text-slate-500'}`}>
                    {h.label}
                  </span>
                </Comp>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Cabecera de cada zona de responsabilidad.
 *  - TALMA   → pill con el cronómetro (en curso / cerrado-con-hora / >8h)
 *  - COURIER → solo etiqueta de responsabilidad, sin estado.
 * Colores alineados con los chips del listado de vuelos (amber/rose/emerald
 * para TALMA, celeste fijo para COURIER).
 */
function ZonaHeader({ zona, sla }) {
  const [tickSeg, setTickSeg] = useState(0);
  const corriendo = zona === 'TALMA' && !!sla?.corriendo;
  useEffect(() => {
    if (!corriendo) { setTickSeg(0); return; }
    const loadedAt = Date.now();
    const id = setInterval(() => setTickSeg(Math.floor((Date.now() - loadedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [corriendo]);

  // Lado COURIER: solo la etiqueta de responsabilidad, sin pill.
  if (zona === 'COURIER') {
    return (
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="text-[9px] uppercase tracking-wider font-bold text-sky-700">
          Responsabilidad: Courier
        </span>
      </div>
    );
  }

  // Lado TALMA: cronómetro con tres variantes visuales.
  const tieneAta = !!sla?.ata;
  const cerrado = !!sla?.vuelo_cerrado;
  let estado = null; // 'curso' | 'cerrado' | 'excede' | null (pre-ATA)
  let tiempoStr = null;
  let cierreStr = null;
  if (tieneAta) {
    const transcurridosSeg = (sla.minutos_transcurridos || 0) * 60 + (corriendo ? tickSeg : 0);
    const excede = transcurridosSeg > 8 * 3600;
    estado = excede ? 'excede' : cerrado ? 'cerrado' : 'curso';
    tiempoStr = formatDuracion(transcurridosSeg);
    if (cerrado && sla.cierre_iso) cierreStr = formatHora(sla.cierre_iso);
  }

  const PILL = {
    curso:   'bg-amber-600 text-white',
    cerrado: 'bg-emerald-600 text-white',
    excede:  'bg-rose-600 text-white',
  };
  // Color del subtítulo "Responsabilidad: Talma" alineado al tono base del
  // recuadro de la zona — cambia con el estado del cronómetro.
  const LABEL_TALMA = {
    curso:   'text-amber-800',
    cerrado: 'text-emerald-800',
    excede:  'text-rose-800',
  };
  const labelCls = LABEL_TALMA[estado] || 'text-amber-800';

  return (
    <div className="flex items-center justify-between gap-2 px-1">
      <span className={`text-[9px] uppercase tracking-wider font-bold ${labelCls}`}>
        Responsabilidad: Talma
      </span>
      {tieneAta && (
        <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${PILL[estado]}`}>
          {estado === 'curso' && (
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" title="Cronómetro activo" />
          )}
          {estado === 'excede' ? (
            'Se superaron las 8h'
          ) : estado === 'cerrado' ? (
            <>
              Cerrado
              {cierreStr && <span className="tabular-nums opacity-95">· {cierreStr}</span>}
              <span className="tabular-nums opacity-95">· {tiempoStr}</span>
            </>
          ) : (
            <>
              En curso
              <span className="tabular-nums opacity-95">· {tiempoStr}</span>
            </>
          )}
        </span>
      )}
    </div>
  );
}

// Nodo del hito: verde si N=D; el ✓ solo aparece en Despacho cuando todas las
// recibidas están entregadas.
function NodoHito({ done, checkmark }) {
  if (done) {
    return (
      <span className="relative z-10 w-5 h-5 rounded-full bg-ok flex items-center justify-center shadow-sm ring-2 ring-white">
        {checkmark && (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
    );
  }
  return <span className="relative z-10 w-4 h-4 rounded-full shadow-sm bg-slate-300" />;
}

function fmtKg(n) {
  if (n == null) return '—';
  return n.toLocaleString('es-PE', { minimumFractionDigits: 1, maximumFractionDigits: 1, useGrouping: false });
}

// Formato estándar de duración en toda la app: "Xh YYmin" (alineado con
// formatHM de VuelosSplit). Para duraciones menores a 1h se muestra solo
// "YYmin".
function formatDuracion(seg) {
  const s = Math.max(0, Math.round(seg));
  const totalMin = Math.floor(s / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}min` : `${m}min`;
}
function formatHora(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
