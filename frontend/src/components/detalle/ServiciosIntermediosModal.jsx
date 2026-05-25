import { useEffect, useMemo } from 'react';

/**
 * Modal de "Servicios Intermedios" de una guía. Solo muestra, como detalle, los
 * servicios adicionales que se le dieron a la carga (no se gestionan aquí).
 * Columnas tomadas del módulo real de TALMA:
 *   Fecha de solicitud · Agente de aduana / Despachador · Nº Guía / Nº Volante ·
 *   Descripción del servicio · Estado.
 *
 * Los datos son de demostración: se derivan de forma DETERMINISTA del id de la
 * guía (mismas filas en cada apertura). Algunas guías no tienen servicios
 * ("No hay servicios disponibles"), igual que en el sistema real.
 */

// Catálogo de servicios intermedios (referencia del módulo de TALMA).
const CATALOGO = [
  'AFORO PARA TURNO DE DUA SIMPLIFICADA',
  'AFORO PARA TURNOS GENERALES DE DAM',
  'AFORO PARA VISTAS DE COMAT',
  'AFORO PARA VISTAS TEMPORALES',
  'ESTIBA ESPECIALIZADA DE SERVICIOS INTERMEDIOS',
  'INSPECCIÓN DE ENTIDADES',
  'OPERACIONES USUALES',
  'PRIORIDAD A LA CARGA',
  'SERVICIO DE FISCALIZACIÓN',
  'SERVICIO DE FOTOGRAFÍA',
  'SERVICIO DE SEPARACIÓN',
];

const ESTADOS = ['SOLICITADO', 'EN PROCESO', 'ATENDIDO', 'FACTURADO'];

// PRNG determinista (mulberry32) a partir de una semilla entera.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function semillaDe(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pad(n) { return String(n).padStart(2, '0'); }
function fmtFecha(d) {
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Genera los servicios intermedios de la guía (0 a 4, deterministas).
function generarServicios(awb) {
  const rnd = mulberry32(semillaDe(awb.id || awb.awb || 'x'));
  // ~35% de las guías sin servicios.
  if (rnd() < 0.35) return [];

  const cantidad = 1 + Math.floor(rnd() * 4); // 1..4
  const base = awb.timeline?.recepcion?.fecha_inicio
    ? new Date(awb.timeline.recepcion.fecha_inicio)
    : new Date();
  const agente = awb.canal_dam?.agencia_aduana || awb.agente_carga || '—';

  const indices = [...CATALOGO.keys()];
  // Barajado determinista (Fisher–Yates con el mismo PRNG).
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  return indices.slice(0, cantidad).map((idx, k) => {
    const fecha = new Date(base.getTime() + (k + 1) * (2 + Math.floor(rnd() * 20)) * 3600 * 1000);
    return {
      id: `${awb.id}-SI-${k}`,
      fecha: fmtFecha(fecha),
      agente,
      descripcion: CATALOGO[idx],
      estado: ESTADOS[Math.floor(rnd() * ESTADOS.length)],
    };
  });
}

const ESTADO_CLS = {
  SOLICITADO:  'bg-slate-100 text-slate-600 border-slate-300',
  'EN PROCESO':'bg-amber-50 text-amber-700 border-amber-300',
  ATENDIDO:    'bg-emerald-50 text-emerald-700 border-emerald-300',
  FACTURADO:   'bg-blue-50 text-navy border-navy/30',
};

export default function ServiciosIntermediosModal({ awb, onClose }) {
  useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose]);

  const servicios = useMemo(() => (awb ? generarServicios(awb) : []), [awb]);
  if (!awb) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
      aria-modal="true"
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3 border-b border-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-blue-50 border border-navy/15 flex items-center justify-center text-navy shrink-0">
            <IconServicios />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">
              Servicios intermedios
            </div>
            <h2 className="text-base font-bold text-slate-800 leading-tight">
              Guía {awb.awb}
              {awb.consignatario?.nombre && (
                <span className="text-slate-400 font-normal"> · {awb.consignatario.nombre}</span>
              )}
            </h2>
          </div>
          <span className="text-[11px] text-slate-500 mr-1">
            <span className="font-semibold tabular-nums text-slate-700">{servicios.length}</span> servicio{servicios.length === 1 ? '' : 's'}
          </span>
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-500"
            aria-label="Cerrar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="6" y1="18" x2="18" y2="6" />
            </svg>
          </button>
        </div>

        {/* Cuerpo */}
        <div className="overflow-auto">
          {servicios.length === 0 ? (
            <div className="py-16 text-center text-muted text-sm">
              No hay servicios disponibles
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr className="text-left text-[10px] tracking-wider uppercase text-muted font-semibold border-b border-border">
                  <Th>Fecha de solicitud</Th>
                  <Th>Agente de aduana / Despachador</Th>
                  <Th>Nº Guía / Nº Volante</Th>
                  <Th>Descripción del servicio</Th>
                  <Th className="text-center">Estado</Th>
                </tr>
              </thead>
              <tbody>
                {servicios.map((s) => (
                  <tr key={s.id} className="border-b border-border hover:bg-slate-50/60">
                    <Td className="tabular-nums text-[12px] text-slate-600 whitespace-nowrap">{s.fecha}</Td>
                    <Td className="text-[12px] font-medium text-slate-700">{s.agente}</Td>
                    <Td className="text-[12px] tabular-nums">
                      <div className="font-semibold text-slate-800">{awb.awb}</div>
                      <div className="text-slate-400">{awb.volante || '—'}</div>
                    </Td>
                    <Td className="text-[12px] font-semibold text-slate-800">{s.descripcion}</Td>
                    <Td className="text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${ESTADO_CLS[s.estado]}`}>
                        {s.estado}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function Th({ children, className = '' }) {
  return <th className={`px-4 py-2.5 font-semibold leading-tight ${className}`}>{children}</th>;
}
function Td({ children, className = '' }) {
  return <td className={`px-4 py-2.5 align-middle ${className}`}>{children}</td>;
}
function IconServicios() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}
