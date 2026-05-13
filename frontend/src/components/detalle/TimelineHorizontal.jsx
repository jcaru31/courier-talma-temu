import EtapaIcono from '../vuelos/EtapaIconos.jsx';
import { buildHitosAwb } from '../../utils/hitosAwb.js';

/**
 * Timeline horizontal de la guia con los 5 hitos del proceso, alineados con
 * Vista 1 (tabla) y Vista 2 (detalle vuelo): Traslado / Recepcion /
 * Transmisiones / Facturacion / Despacho.
 */
export default function TimelineHorizontal({ awb }) {
  const hitos = buildHitosAwb(awb);

  return (
    <div className="card p-6">
      <div className="grid grid-cols-5 gap-2">
        {hitos.map((hito, i) => {
          const completado = hito.estado === 'COMPLETADO';
          const enCurso = hito.estado === 'EN_CURSO';
          const faltante = hito.estado === 'FALTANTE';
          const activo = completado || enCurso;
          const nextActivo = i < hitos.length - 1 && (hitos[i + 1].estado === 'COMPLETADO' || hitos[i + 1].estado === 'EN_CURSO');

          return (
            <div key={hito.key} className="flex flex-col items-center text-center relative">
              {/* Icono */}
              <div className={`p-3 rounded-full ${activo ? 'bg-blue-50' : ''}`}>
                <EtapaIcono etapa={hito.key} activo={activo} size={48} />
              </div>

              {/* Label */}
              <div
                className={`mt-2 font-bold text-sm uppercase tracking-wider ${
                  faltante ? 'text-violet-700' : activo ? 'text-navy' : 'text-slate-400'
                }`}
              >
                {hito.label}
              </div>

              {/* Lineas + punto */}
              <div className="relative w-full flex items-center justify-center mt-3 h-6">
                {i > 0 && (
                  <div
                    className={`absolute left-0 top-1/2 -translate-y-1/2 h-1 ${
                      completado ? 'bg-ok' : 'bg-slate-200'
                    }`}
                    style={{ width: '50%' }}
                  />
                )}
                {i < hitos.length - 1 && (
                  <div
                    className={`absolute right-0 top-1/2 -translate-y-1/2 h-1 ${
                      completado && nextActivo ? 'bg-ok' : 'bg-slate-200'
                    }`}
                    style={{ width: '50%' }}
                  />
                )}
                <CircleEstado estado={hito.estado} />
              </div>

              {/* Timestamp */}
              <div className="mt-2 text-[11px] font-semibold text-slate-700 tabular-nums">
                {hito.fecha ? formatFechaHora(hito.fecha) : <span className="text-slate-300">—</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CircleEstado({ estado }) {
  if (estado === 'COMPLETADO') {
    return (
      <div className="relative z-10 w-6 h-6 rounded-full bg-ok flex items-center justify-center shadow-sm ring-4 ring-white">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    );
  }
  if (estado === 'EN_CURSO') {
    return (
      <div className="relative z-10 w-6 h-6 rounded-full bg-warn flex items-center justify-center shadow-sm ring-4 ring-white">
        <div className="w-2 h-2 bg-white rounded-full" />
      </div>
    );
  }
  if (estado === 'FALTANTE') {
    return (
      <div className="relative z-10 w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center shadow-sm ring-4 ring-white">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="6" y1="18" x2="18" y2="6" />
        </svg>
      </div>
    );
  }
  return (
    <div className="relative z-10 w-6 h-6 rounded-full bg-white border-2 border-slate-300 ring-4 ring-white" />
  );
}

function formatFechaHora(iso) {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function pad(n) { return String(n).padStart(2, '0'); }
