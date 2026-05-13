import { useState } from 'react';
import { buildHitosAwb } from '../../utils/hitosAwb.js';

/**
 * Subeventos detallados por cada uno de los 5 hitos del proceso.
 * Misma fuente que TimelineHorizontal: buildHitosAwb(awb).
 */
const VISIBLE_INICIAL = 3;

export default function SubeventosColumns({ awb }) {
  const hitos = buildHitosAwb(awb);

  return (
    <div className="grid grid-cols-5 gap-2">
      {hitos.map((hito) => (
        <Columna key={hito.key} subeventos={hito.subeventos} />
      ))}
    </div>
  );
}

function Columna({ subeventos }) {
  const [expandido, setExpandido] = useState(false);
  const visibles = expandido ? subeventos : subeventos.slice(0, VISIBLE_INICIAL);
  const hayMas = subeventos.length > VISIBLE_INICIAL;

  if (subeventos.length === 0) {
    return (
      <div className="border border-dashed border-slate-200 rounded-md p-3 text-center text-[11px] text-slate-300 italic">
        Sin información
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {visibles.map((s, i) => (
        <SubeventoCard key={i} subevento={s} />
      ))}
      {hayMas && (
        <button
          onClick={() => setExpandido((e) => !e)}
          className="flex items-center justify-center w-full py-2 text-muted hover:text-navy transition"
          aria-label={expandido ? 'Colapsar' : 'Expandir'}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform ${expandido ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      )}
    </div>
  );
}

function SubeventoCard({ subevento }) {
  const { nombre, fecha, estado, detalle } = subevento;
  const esActiva = estado === 'ACTIVA';
  const esCompletado = estado === 'COMPLETADO';
  const esPendiente = estado === 'PENDIENTE';

  const borde = esActiva
    ? 'border-danger bg-red-50'
    : esCompletado
    ? 'border-border bg-white'
    : 'border-dashed border-slate-200 bg-slate-50';

  return (
    <div className={`border rounded-md p-3 ${borde}`}>
      <div className="flex items-start gap-2">
        <CheckIcono estado={estado} />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-muted tabular-nums">
            {fecha ? formatFechaHora(fecha) : '—'}
          </div>
          <div
            className={`text-sm font-semibold ${
              esActiva ? 'text-danger' : esPendiente ? 'text-slate-400' : 'text-navy'
            }`}
          >
            {nombre}
          </div>
          {detalle && (
            <div className="mt-1 text-[11px] text-muted space-y-0.5">
              {Object.entries(detalle).map(([k, v]) => (
                <div key={k}>
                  <span className="uppercase">{k.replace(/_/g, ' ')}:</span>{' '}
                  <span className="font-semibold text-slate-700">{String(v)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CheckIcono({ estado }) {
  if (estado === 'COMPLETADO') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00C853" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }
  if (estado === 'ACTIVA') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="#D32F2F" className="mt-0.5 shrink-0">
        <path d="M12 2 1 21h22L12 2zm0 7 7 12H5l7-12zm-1 4v3h2v-3h-2zm0 4v2h2v-2h-2z" />
      </svg>
    );
  }
  return (
    <div className="w-4 h-4 rounded-full border-2 border-slate-300 mt-0.5 shrink-0" />
  );
}

function formatFechaHora(iso) {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function pad(n) { return String(n).padStart(2, '0'); }
