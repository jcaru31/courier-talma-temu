import { useEffect } from 'react';

/**
 * Modal de Verificación Aduanera (solo lectura): muestra la hora de
 * verificación y el documento de salida (DAM) de una guía ya verificada.
 */
export default function VerificacionModal({ awb, onClose }) {
  useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose]);

  if (!awb) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-xl border border-border shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3 border-b border-border flex items-center gap-3">
          <span className="text-navy">
            <IconDoc size={20} />
          </span>
          <div>
            <div className="text-base font-bold text-slate-900 leading-tight">
              Verificación Aduanera
            </div>
            <div className="text-[11px] text-muted tabular-nums">Guía {awb.awb}</div>
          </div>
          <button
            onClick={onClose}
            className="ml-auto w-8 h-8 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-500"
            aria-label="Cerrar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="6" y1="18" x2="18" y2="6" />
            </svg>
          </button>
        </div>

        {/* Información (solo lectura) */}
        <div className="p-5 space-y-4">
          <Campo label="Hora de verificación" valor={formatFechaHora(horaVerificacion(awb))} mono />
          <Campo label="Documento de salida (DAM)" valor={awb.dam} mono />
        </div>

        {/* Acción */}
        <div className="px-5 py-3 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-navy text-white rounded-md text-sm font-semibold hover:bg-navy-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function Campo({ label, valor, mono = false }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-1">
        {label}
      </div>
      <div className={`text-sm font-bold text-slate-800 ${mono ? 'tabular-nums' : ''}`}>
        {valor || <span className="text-slate-300 font-normal">— sin registrar —</span>}
      </div>
    </div>
  );
}

// Hora de verificación = fecha del último subevento de aduanas completado.
// Si la guía verificada no tiene eventos de aduanas registrados, se usa el
// último evento de todo su recorrido (una guía verificada siempre tiene
// historial), de modo que el campo nunca quede vacío.
function horaVerificacion(awb) {
  const tl = awb.timeline || {};
  const ultima = (subs) => {
    const f = (subs || [])
      .filter((s) => s.estado === 'COMPLETADO' && s.fecha)
      .map((s) => s.fecha);
    return f.length ? f.reduce((a, b) => (new Date(a) > new Date(b) ? a : b)) : null;
  };
  const aduanas = ultima(tl.aduanas?.subeventos);
  if (aduanas) return aduanas;
  return ultima(Object.values(tl).flatMap((sec) => sec?.subeventos || []));
}

function formatFechaHora(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function IconDoc({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  );
}
