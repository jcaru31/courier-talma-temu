import { useState } from 'react';
import EtapaIcono from '../../vuelos/EtapaIconos.jsx';
import AlertasEtiquetas from '../AlertasEtiquetas.jsx';
import ActaMalEstadoModal from '../../inventario/ActaMalEstadoModal.jsx';
import VolanteModal from '../../vuelos/VolanteModal.jsx';

/**
 * Bloques de UI compartidos por las 3 variantes de la Vista 3 (detalle de
 * guía). Centralizar aquí el banner de alertas, los datos en "pills", la
 * carga con barras y la tarjeta de evento mantiene las tres vistas
 * visualmente consistentes: solo cambia cómo se organizan los hitos.
 */

/* ------------------------------------------------------------------ */
/* Formateo de fechas                                                  */
/* ------------------------------------------------------------------ */
function pad(n) { return String(n).padStart(2, '0'); }

export function fmtFechaHora(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function fmtHora(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function fmtNum(n) {
  if (n == null) return '—';
  return n.toLocaleString('es-PE', { minimumFractionDigits: 2 });
}

/* ------------------------------------------------------------------ */
/* Estados → estilos                                                   */
/* ------------------------------------------------------------------ */
// Estado de cada HITO (los 5 macro-pasos).
export const HITO_META = {
  COMPLETADO: { dot: 'bg-ok',         text: 'text-ok',         chip: 'bg-emerald-50 ring-emerald-200' },
  EN_CURSO:   { dot: 'bg-warn',       text: 'text-amber-600',  chip: 'bg-amber-50 ring-amber-200' },
  PENDIENTE:  { dot: 'bg-slate-300',  text: 'text-slate-400',  chip: 'bg-slate-50 ring-slate-200' },
  FALTANTE:   { dot: 'bg-slate-400',  text: 'text-slate-500',  chip: 'bg-slate-100 ring-slate-200' },
};

// Estado de cada SUB-evento.
export const SUB_META = {
  COMPLETADO: { label: 'Completado', pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', border: 'border-l-ok',        title: 'text-navy' },
  EN_CURSO:   { label: 'En curso',   pill: 'bg-amber-50 text-amber-700 border-amber-200',       border: 'border-l-warn',      title: 'text-amber-700' },
  ACTIVA:     { label: 'Alerta',     pill: 'bg-red-50 text-danger border-red-200',              border: 'border-l-danger',    title: 'text-danger' },
  PENDIENTE:  { label: 'Pendiente',  pill: 'bg-slate-100 text-slate-400 border-slate-200',      border: 'border-l-slate-200', title: 'text-slate-400' },
};

/* ------------------------------------------------------------------ */
/* Datos de la guía (pills)                                            */
/* ------------------------------------------------------------------ */
export function DatosGuiaCard({ awb }) {
  // Acta de mal estado: si la guía la tiene, la etiqueta "Mal estado" abre el
  // modal con el acta (datos + fotos + PDF).
  const [actaAbierta, setActaAbierta] = useState(false);
  const campos = [
    { label: 'Shipper', value: awb.shipper },
    { label: 'Fecha de emisión', value: fmtFechaHora(awb.fecha_emision), mono: true },
    { label: 'Tipo almacén', value: awb.tipo_almacenamiento },
    { label: 'Agente de carga', value: awb.agente_carga },
    { label: 'Volante', value: awb.volante, mono: true },
    { label: 'RUC consignatario', value: awb.consignatario?.ruc, mono: true },
  ];
  return (
    <div className="card p-4 h-full">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="label-xs">Datos de la guía</span>
        <AlertasEtiquetas
          alertas={awb.alertas_activas}
          onMalEstado={awb.acta_mal_estado ? () => setActaAbierta(true) : null}
        />
      </div>
      {actaAbierta && (
        <ActaMalEstadoModal
          acta={awb.acta_mal_estado}
          awb={awb.awb}
          onClose={() => setActaAbierta(false)}
        />
      )}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
        {campos.map((c) => (
          <div key={c.label} className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 flex flex-col leading-tight">
            <span className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">{c.label}</span>
            <span className={`text-[13px] font-bold text-slate-800 mt-0.5 break-words ${c.mono ? 'tabular-nums' : ''}`}>
              {c.value || '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Carga (barras de progreso)                                          */
/* ------------------------------------------------------------------ */
export function CargaCard({ awb }) {
  return (
    <div className="card p-4 h-full">
      <div className="label-xs mb-3 flex items-center gap-1.5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
          <path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
        </svg>
        Detalle de carga
      </div>
      <BarraCarga label="Bultos" rec={awb.bultos_recibidos} man={awb.bultos_esperados} />
      <div className="mt-4">
        <BarraCarga label="Kilos" rec={awb.kgs_recibidos} man={awb.kgs_esperados} format={fmtNum} />
      </div>
      {awb.handling_pagado === false && (
        <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-fuchsia-50 border border-fuchsia-300 text-fuchsia-700">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 6v12" />
            <path d="M16 9c0-1.5-1.8-2.5-4-2.5s-4 1-4 2.5 1.8 2 4 2.5 4 1 4 2.5-1.8 2.5-4 2.5-4-1-4-2.5" />
          </svg>
          <span className="text-[10px] font-bold uppercase tracking-wider leading-tight">
            Pago Handling pendiente
          </span>
        </div>
      )}
    </div>
  );
}

function BarraCarga({ label, rec, man, format = (x) => x }) {
  const pct = man > 0 ? Math.min(100, Math.round(((rec ?? 0) / man) * 100)) : 0;
  const completo = (rec ?? 0) >= (man ?? 0) && man > 0;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">{label}</span>
        <span className="text-sm tabular-nums">
          <span className="font-bold text-slate-900">{rec != null ? format(rec) : '—'}</span>
          <span className="text-slate-400 font-medium"> / {man != null ? format(man) : '—'} man</span>
        </span>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${completo ? 'bg-ok' : 'bg-amber-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Chip de hito (ícono en cuadro redondeado)                           */
/* ------------------------------------------------------------------ */
export function HitoChip({ hito, selected, onClick }) {
  const meta = HITO_META[hito.estado] || HITO_META.PENDIENTE;
  const activo = hito.estado === 'COMPLETADO' || hito.estado === 'EN_CURSO';
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`flex flex-col items-center text-center gap-1.5 ${onClick ? 'cursor-pointer group' : ''}`}
    >
      <span
        className={`relative w-12 h-12 rounded-2xl flex items-center justify-center ring-2 transition ${meta.chip} ${
          selected ? 'ring-navy shadow-md scale-105' : onClick ? 'group-hover:ring-navy/40' : ''
        }`}
      >
        <EtapaIcono etapa={hito.key} activo={activo} size={26} />
        <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full ring-2 ring-white ${meta.dot}`} />
      </span>
      <span className={`text-[10px] font-bold uppercase tracking-wide leading-tight ${selected ? 'text-navy' : meta.text}`}>
        {hito.label}
      </span>
      <span className="text-[10px] text-slate-400 tabular-nums">
        {hito.fecha ? fmtFechaHora(hito.fecha) : '—'}
      </span>
    </Tag>
  );
}

/** Tira horizontal de los 5 hitos con línea de progreso conectora. */
export function HitosStrip({ hitos, selectedKey, onSelect }) {
  return (
    <div className="card p-5">
      <div className="label-xs mb-4">Hitos de la guía</div>
      <div className="relative grid grid-cols-5 gap-2">
        {hitos.map((h, i) => {
          const completado = h.estado === 'COMPLETADO';
          const next = hitos[i + 1];
          const lineaOk = completado && next && (next.estado === 'COMPLETADO' || next.estado === 'EN_CURSO');
          return (
            <div key={h.key} className="relative flex justify-center">
              {/* conector hacia el siguiente */}
              {i < hitos.length - 1 && (
                <span
                  className={`absolute top-6 left-1/2 h-1 -translate-y-1/2 ${lineaOk ? 'bg-ok' : 'bg-slate-200'}`}
                  style={{ width: '100%' }}
                />
              )}
              <span className="relative z-10">
                <HitoChip
                  hito={h}
                  selected={onSelect ? selectedKey === h.key : false}
                  onClick={onSelect ? () => onSelect(h.key) : undefined}
                />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tarjeta de sub-evento (borde lateral + pill de estado)              */
/* ------------------------------------------------------------------ */
export function EventoItem({ subevento, awb = null }) {
  const { nombre, fecha, estado, detalle, ocultarFecha } = subevento;
  const meta = SUB_META[estado] || SUB_META.PENDIENTE;
  // Emisión / Envío de Volante completado → botón que abre el modal del volante
  // (aviso de llegada + conciliación + PDF). Requiere el awb del contexto.
  const [volanteAbierto, setVolanteAbierto] = useState(false);
  const esVolante = awb && /volante/i.test(nombre) && estado === 'COMPLETADO';
  return (
    <div className={`rounded-lg border border-slate-200 border-l-4 bg-white px-3.5 py-2.5 ${meta.border}`}>
      <div className="flex items-start justify-between gap-2">
        <span className={`text-[13px] font-semibold leading-tight ${meta.title}`}>{nombre}</span>
        {!ocultarFecha && (
          <span className="text-[11px] text-slate-400 tabular-nums shrink-0">{fmtHora(fecha)}</span>
        )}
      </div>
      {detalle && (
        <div className="mt-1 text-[11px] text-slate-500 space-y-0.5">
          {Object.entries(detalle).map(([k, v]) => (
            <div key={k}>
              <span className="uppercase">{k.replace(/_/g, ' ')}:</span>{' '}
              <span className="font-semibold text-slate-700">{String(v)}</span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-1.5 flex items-center justify-between gap-2 flex-wrap">
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wide ${meta.pill}`}>
          <EstadoIcono estado={estado} />
          {meta.label}
        </span>
        {esVolante && (
          <button
            type="button"
            onClick={() => setVolanteAbierto(true)}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-navy/30 bg-blue-50 text-navy text-[11px] font-semibold hover:bg-blue-100 transition"
            title="Ver volante (aviso de llegada)"
          >
            <IconVolanteSm />
            Ver volante
          </button>
        )}
      </div>
      {volanteAbierto && (
        <VolanteModal awb={awb} onClose={() => setVolanteAbierto(false)} />
      )}
    </div>
  );
}

function IconVolanteSm() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="13" y2="17" />
    </svg>
  );
}

function EstadoIcono({ estado }) {
  if (estado === 'COMPLETADO') {
    return (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }
  if (estado === 'ACTIVA') {
    return (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2 1 21h22L12 2zm0 6 7 11H5l7-11z" />
      </svg>
    );
  }
  if (estado === 'EN_CURSO') {
    return <span className="w-2 h-2 rounded-full bg-current inline-block" />;
  }
  return <span className="w-2 h-2 rounded-full border-2 border-current inline-block" />;
}

/** Encabezado de sección con nombre del hito + contador de eventos. */
export function EventosHeader({ label, total }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <span className="text-[12px] font-bold uppercase tracking-wider text-slate-600">
        Eventos de {label}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        Total {total}
      </span>
    </div>
  );
}

/** Hito que el usuario verá seleccionado por defecto: el primero en curso,
 * o el primero no completado, o el último si todo está completo. */
export function hitoInicial(hitos) {
  const enCurso = hitos.find((h) => h.estado === 'EN_CURSO');
  if (enCurso) return enCurso.key;
  const pendiente = hitos.find((h) => h.estado !== 'COMPLETADO');
  if (pendiente) return pendiente.key;
  return hitos[hitos.length - 1]?.key;
}
