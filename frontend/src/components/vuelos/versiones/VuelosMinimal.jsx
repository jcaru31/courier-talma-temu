import { useState } from 'react';
import { IconoAlerta } from '../alertaIconos.jsx';
import DetalleVueloInline from '../DetalleVueloInline.jsx';
import {
  resumenAlertas, estadoRutaInfo, countdownArribo, progresoHitos, ALERTA_TEXT,
} from './vuelosVariantHelpers.js';

/**
 * VARIANTE 1 — Minimal / Progressive disclosure.
 * Lista vertical muy aireada: cada fila colapsada muestra solo lo crítico
 * (vuelo, ruta, una barra de avance, alertas como puntos). El detalle pesado
 * (resumen + guías) se revela al expandir, un vuelo a la vez. Combate
 * directamente la sensación de "pantalla sobrecargada".
 */
export default function VuelosMinimal({ items, loading, prefilterQuery }) {
  const [abierto, setAbierto] = useState(null);

  if (loading) return <SkeletonList />;
  if (!items?.length) {
    return <div className="card p-12 text-center text-muted">No se encontraron vuelos</div>;
  }

  return (
    <div className="space-y-2.5">
      {items.map((v) => (
        <FilaMinimal
          key={v.manifiesto}
          v={v}
          abierto={abierto === v.manifiesto}
          onToggle={() => setAbierto((cur) => (cur === v.manifiesto ? null : v.manifiesto))}
          prefilterQuery={prefilterQuery}
        />
      ))}
    </div>
  );
}

function FilaMinimal({ v, abierto, onToggle, prefilterQuery }) {
  const ruta = estadoRutaInfo(v);
  const countdown = countdownArribo(v);
  const prog = progresoHitos(v);
  const alertas = resumenAlertas(v);

  return (
    <div className={`card overflow-hidden transition ${abierto ? 'ring-1 ring-navy/20' : ''}`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-5 px-5 py-4 hover:bg-slate-50/70 transition text-left"
      >
        {/* Vuelo + ruta */}
        <div className="min-w-[150px]">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-slate-800 tabular-nums">{v.vuelo}</span>
            <span className={`w-2 h-2 rounded-full ${ruta.dot}`} title={ruta.label} />
          </div>
          <div className="text-[12px] text-slate-500 mt-0.5">
            {v.origen} <span className="text-slate-300">→</span> {v.destino}
            <span className="text-slate-300"> · </span>
            <span className={countdown ? 'text-sky-600 font-medium' : ''}>
              {countdown || ruta.label}
            </span>
          </div>
        </div>

        {/* Avance — una sola barra + hito en curso */}
        <div className="flex-1 max-w-md">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-slate-500 font-medium">{prog.enCursoLabel}</span>
            <span className="text-slate-400 tabular-nums">{prog.completos}/{prog.total} hitos</span>
          </div>
          <BarraAvance pct={prog.pct} />
        </div>

        {/* Guías */}
        <div className="text-center min-w-[64px]">
          <div className="text-lg font-bold text-slate-800 tabular-nums leading-none">{v.total_awbs}</div>
          <div className="text-[10px] uppercase tracking-wide text-slate-400 mt-0.5">guías</div>
        </div>

        {/* Alertas como puntos compactos */}
        <div className="min-w-[120px] flex items-center justify-end gap-1.5">
          {alertas.length === 0 ? (
            <span className="text-[11px] text-emerald-600 font-medium">Sin alertas</span>
          ) : (
            alertas.map((a) => (
              <span
                key={a.tipo}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold ${ALERTA_TEXT[a.color]}`}
                title={`${a.count} ${a.label}`}
              >
                <IconoAlerta tipo={a.tipo} size={13} />
                <span className="tabular-nums">{a.count}</span>
              </span>
            ))
          )}
        </div>

        {/* Chevron */}
        <svg
          width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
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
  );
}

function BarraAvance({ pct }) {
  return (
    <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-navy to-sky-500 transition-all"
        style={{ width: `${Math.max(3, pct)}%` }}
      />
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card px-5 py-4 flex items-center gap-5 animate-pulse">
          <div className="w-32 h-8 bg-slate-100 rounded" />
          <div className="flex-1 h-2 bg-slate-100 rounded" />
          <div className="w-16 h-8 bg-slate-100 rounded" />
        </div>
      ))}
    </div>
  );
}
