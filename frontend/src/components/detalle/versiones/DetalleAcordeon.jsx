import { useState } from 'react';
import { buildHitosAwb } from '../../../utils/hitosAwb.js';
import EtapaIcono from '../../vuelos/EtapaIconos.jsx';
import {
  DatosGuiaCard, CargaCard,
  EventoItem, HITO_META, fmtFechaHora, hitoInicial,
} from './comun.jsx';

/**
 * Variante 2 — Acordeón vertical. Los 5 hitos se apilan como filas
 * colapsables (sin scroll horizontal). Cada fila muestra ícono, estado y
 * fecha; al expandir se ven sus eventos. Por defecto se abre el hito en curso.
 */
export default function DetalleAcordeon({ awb }) {
  const hitos = buildHitosAwb(awb);
  const [abierto, setAbierto] = useState(() => hitoInicial(hitos));

  return (
    <div className="space-y-4">
      <DatosGuiaCard awb={awb} />
      <CargaCard awb={awb} />

      <div className="card divide-y divide-slate-100">
        <div className="label-xs px-4 pt-4 pb-2">Hitos de la guía</div>
        {hitos.map((h) => (
          <FilaHito
            key={h.key}
            hito={h}
            awb={awb}
            abierto={abierto === h.key}
            onToggle={() => setAbierto((cur) => (cur === h.key ? null : h.key))}
          />
        ))}
      </div>
    </div>
  );
}

function FilaHito({ hito, awb, abierto, onToggle }) {
  const meta = HITO_META[hito.estado] || HITO_META.PENDIENTE;
  const activo = hito.estado === 'COMPLETADO' || hito.estado === 'EN_CURSO';

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition"
      >
        <span className={`relative w-10 h-10 rounded-xl flex items-center justify-center ring-2 shrink-0 ${meta.chip}`}>
          <EtapaIcono etapa={hito.key} activo={activo} size={22} />
          <span className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full ring-2 ring-white ${meta.dot}`} />
        </span>

        <div className="flex-1 min-w-0">
          <div className={`text-[13px] font-bold uppercase tracking-wide leading-tight ${meta.text}`}>
            {hito.label}
          </div>
          <div className="text-[11px] text-slate-400 tabular-nums">
            {hito.fecha ? fmtFechaHora(hito.fecha) : 'Sin fecha'} · {hito.subeventos.length} evento{hito.subeventos.length === 1 ? '' : 's'}
          </div>
        </div>

        <svg
          className={`shrink-0 text-slate-400 transition-transform ${abierto ? 'rotate-180' : ''}`}
          width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {abierto && (
        <div className="px-4 pb-3 pl-[4.25rem]">
          {hito.subeventos.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 py-4 text-center text-[12px] text-slate-300 italic">
              Sin información para este hito
            </div>
          ) : (
            <div className="space-y-2">
              {hito.subeventos.map((s, i) => (
                <EventoItem key={i} subevento={s} awb={awb} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
