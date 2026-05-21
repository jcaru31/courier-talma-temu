import { useEffect, useState } from 'react';
import { IconoAlerta } from '../alertaIconos.jsx';
import DetalleVueloInline from '../DetalleVueloInline.jsx';
import {
  resumenAlertas, estadoRutaInfo, countdownArribo, progresoHitos,
  ALERTA_TEXT,
} from './vuelosVariantHelpers.js';

/**
 * VARIANTE 2 — Master-detail (split pane).
 * Lista compacta y seleccionable a la izquierda; panel de detalle fijo a la
 * derecha. Al elegir un vuelo, el panel derecho muestra el detalle (resumen +
 * guías) sin tapar la lista ni empujar el contenido. Cero acordeón/modales.
 */
export default function VuelosSplit({ items, loading, prefilterQuery }) {
  const [sel, setSel] = useState(null);

  // Auto-selecciona el primer vuelo cuando cambia la lista.
  useEffect(() => {
    if (items?.length && !items.some((v) => v.manifiesto === sel)) {
      setSel(items[0].manifiesto);
    }
    if (!items?.length) setSel(null);
  }, [items, sel]);

  if (loading) {
    return <div className="card p-12 text-center text-muted">Cargando vuelos...</div>;
  }
  if (!items?.length) {
    return <div className="card p-12 text-center text-muted">No se encontraron vuelos</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-3 items-start">
      {/* Master: lista */}
      <div className="card overflow-hidden lg:sticky lg:top-3">
        <div className="px-3 py-2 border-b border-border bg-slate-50 text-[10px] uppercase tracking-wider text-muted font-semibold">
          {items.length} vuelos
        </div>
        <div className="overflow-auto divide-y divide-border" style={{ maxHeight: '72vh' }}>
          {items.map((v) => (
            <ItemMaster
              key={v.manifiesto}
              v={v}
              activo={v.manifiesto === sel}
              onClick={() => setSel(v.manifiesto)}
            />
          ))}
        </div>
      </div>

      {/* Detail: panel */}
      <div className="min-w-0">
        {sel ? (
          <DetalleVueloInline manifiesto={sel} prefilterQuery={prefilterQuery} />
        ) : (
          <div className="card p-12 text-center text-muted">Selecciona un vuelo</div>
        )}
      </div>
    </div>
  );
}

function ItemMaster({ v, activo, onClick }) {
  const ruta = estadoRutaInfo(v);
  const countdown = countdownArribo(v);
  const prog = progresoHitos(v);
  const alertas = resumenAlertas(v);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3.5 py-3 transition relative ${
        activo ? 'bg-blue-50/70' : 'hover:bg-slate-50'
      }`}
    >
      {activo && <span className="absolute left-0 top-0 bottom-0 w-1 bg-navy rounded-r" />}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-bold text-slate-800 tabular-nums">{v.vuelo}</span>
          <span className={`w-2 h-2 rounded-full shrink-0 ${ruta.dot}`} title={ruta.label} />
        </div>
      </div>
      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
        <span>{v.origen} → {v.destino}</span>
        <span className="text-slate-300">·</span>
        <span className={countdown ? 'text-sky-600' : ''}>{countdown || ruta.label}</span>
      </div>

      {/* Todas las alertas del vuelo: icono + número en el color de la alerta */}
      {alertas.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
          {alertas.map((al) => (
            <span
              key={al.tipo}
              className={`inline-flex items-center gap-1 ${ALERTA_TEXT[al.color]}`}
              title={`${al.label}: ${al.count}`}
            >
              <IconoAlerta tipo={al.tipo} size={13} />
              <span className="text-[12px] font-bold tabular-nums">{al.count}</span>
            </span>
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1 h-1 rounded-full bg-slate-200 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-navy to-sky-500" style={{ width: `${Math.max(3, prog.pct)}%` }} />
        </div>
        <span className="text-[10px] text-slate-400 tabular-nums shrink-0">{v.total_awbs} g.</span>
      </div>
    </button>
  );
}
