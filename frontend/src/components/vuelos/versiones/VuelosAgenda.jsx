import { useState } from 'react';
import { IconoAlerta } from '../alertaIconos.jsx';
import DetalleVueloInline from '../DetalleVueloInline.jsx';
import {
  resumenAlertas, estadoRutaInfo, countdownArribo, progresoHitos,
  formatHora, formatDiaLabel, agruparPorDia, ALERTA_TEXT,
} from './vuelosVariantHelpers.js';

/**
 * VARIANTE 3 — Agenda / timeline cronológico.
 * Los vuelos se agrupan por día (Hoy / Mañana / fecha) y se ordenan sobre una
 * línea de tiempo por hora de arribo. Pensado para el operador que razona en
 * términos de "qué llega y cuándo". Al hacer clic se expande el detalle.
 */
export default function VuelosAgenda({ items, loading, prefilterQuery, hoy, manana }) {
  const [abierto, setAbierto] = useState(null);

  if (loading) return <div className="card p-12 text-center text-muted">Cargando agenda...</div>;
  if (!items?.length) {
    return <div className="card p-12 text-center text-muted">No se encontraron vuelos</div>;
  }

  // Ordena por hora de arribo dentro de cada día.
  const grupos = agruparPorDia(items).map((g) => ({
    ...g,
    vuelos: [...g.vuelos].sort((a, b) => new Date(a.eta) - new Date(b.eta)),
  }));

  return (
    <div className="space-y-5">
      {grupos.map((g) => (
        <section key={g.fecha}>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-[12px] font-bold uppercase tracking-wider text-navy">
              {formatDiaLabel(g.fecha, hoy, manana)}
            </h3>
            <span className="text-[11px] text-slate-400">{g.vuelos.length} vuelos</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="space-y-2">
            {g.vuelos.map((v) => (
              <EntradaAgenda
                key={v.manifiesto}
                v={v}
                abierto={abierto === v.manifiesto}
                onToggle={() => setAbierto((c) => (c === v.manifiesto ? null : v.manifiesto))}
                prefilterQuery={prefilterQuery}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function EntradaAgenda({ v, abierto, onToggle, prefilterQuery }) {
  const ruta = estadoRutaInfo(v);
  const countdown = countdownArribo(v);
  const prog = progresoHitos(v);
  const alertas = resumenAlertas(v);

  return (
    <div className="flex gap-3">
      {/* Rail de tiempo */}
      <div className="flex flex-col items-center pt-3 w-16 shrink-0">
        <span className="text-[13px] font-bold text-slate-700 tabular-nums leading-none">
          {formatHora(v.eta)}
        </span>
        <span className={`mt-1.5 w-3 h-3 rounded-full border-2 border-white shadow ${ruta.dot}`} />
        <span className="flex-1 w-px bg-border mt-1" />
      </div>

      {/* Tarjeta */}
      <div className={`flex-1 card overflow-hidden mb-1 ${abierto ? 'ring-1 ring-navy/20' : ''}`}>
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center gap-4 px-4 py-3 hover:bg-slate-50/70 transition text-left"
        >
          <div className="min-w-[130px]">
            <div className="text-sm font-bold text-slate-800 tabular-nums">{v.vuelo}</div>
            <div className="text-[11px] text-slate-500">{v.origen} → {v.destino}</div>
          </div>

          <div className={`text-[11px] font-medium ${countdown ? 'text-sky-600' : ruta.text}`}>
            {countdown || ruta.label}
          </div>

          <div className="flex-1 max-w-xs ml-auto">
            <div className="flex items-center justify-between text-[10px] mb-1 text-slate-400">
              <span>{prog.enCursoLabel}</span>
              <span className="tabular-nums">{v.total_awbs} guías</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-navy to-sky-500" style={{ width: `${Math.max(3, prog.pct)}%` }} />
            </div>
          </div>

          <div className="flex items-center gap-1.5 min-w-[90px] justify-end">
            {alertas.map((a) => (
              <span
                key={a.tipo}
                className={`inline-flex items-center gap-0.5 text-[11px] font-bold ${ALERTA_TEXT[a.color]}`}
                title={`${a.count} ${a.label}`}
              >
                <IconoAlerta tipo={a.tipo} size={12} />
                {a.count}
              </span>
            ))}
          </div>

          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className={`text-slate-400 shrink-0 transition-transform ${abierto ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {abierto && (
          <div className="border-t border-border bg-slate-50/50 p-4">
            <DetalleVueloInline manifiesto={v.manifiesto} prefilterQuery={prefilterQuery} />
          </div>
        )}
      </div>
    </div>
  );
}
