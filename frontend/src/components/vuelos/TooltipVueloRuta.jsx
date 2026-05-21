import { useLayoutEffect, useRef, useState } from 'react';
import MapaVueloRuta from './MapaVueloRuta.jsx';
import { nombrePuerto } from '../../utils/puertos.js';

/**
 * Hover-card flotante con el tracker de posición de un vuelo en ruta.
 * Se posiciona con `position: fixed` respecto al elemento ancla (la hora de
 * arribo) y hace flip si no cabe en pantalla — responsive.
 */
const ANCHO = 360;

export default function TooltipVueloRuta({ vuelo, anchorRect }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ left: -9999, top: -9999 });

  useLayoutEffect(() => {
    if (!anchorRect || !ref.current) return;
    const h = ref.current.offsetHeight;
    const margen = 10;
    let left = anchorRect.left;
    if (left + ANCHO > window.innerWidth - margen) {
      left = window.innerWidth - ANCHO - margen;
    }
    if (left < margen) left = margen;

    let top = anchorRect.bottom + 8;
    if (top + h > window.innerHeight - margen) {
      top = anchorRect.top - h - 8; // flip hacia arriba
    }
    if (top < margen) top = margen;
    setPos({ left, top });
  }, [anchorRect]);

  if (!vuelo) return null;
  const ruta = vuelo.estado_ruta || {};

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-card rounded-xl border border-border shadow-2xl overflow-hidden pointer-events-none"
      style={{ left: pos.left, top: pos.top, width: ANCHO }}
    >
      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-muted font-semibold">
          Tracker de ruta
        </span>
        <span className="text-[11px] text-muted ml-auto tabular-nums">{vuelo.matricula}</span>
      </div>

      <div className="p-3">
        <MapaVueloRuta origen={vuelo.origen} progreso={ruta.progreso ?? 0} />

        <div className="mt-2.5">
          <div className="flex justify-between text-[10px] font-semibold text-slate-500 mb-1">
            <span>{vuelo.origen}</span>
            <span className="text-navy">{ruta.progreso ?? 0}% recorrido</span>
            <span>LIM</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-navy rounded-full" style={{ width: `${ruta.progreso ?? 0}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3">
          <Stat label="Salida origen" valor={formatHora(vuelo.fecha_salida_origen)} sub={vuelo.origen} />
          <Stat label="Llega en" valor={formatRestante(ruta.minutos_para_arribo)} sub="aterrizaje" destacado />
          <Stat label="Arribo estimado" valor={formatHora(vuelo.eta)} sub="LIM" />
        </div>
        <div className="text-[10px] text-slate-400 mt-2 text-center truncate">
          Origen: {nombrePuerto(vuelo.origen)}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, valor, sub, destacado = false }) {
  return (
    <div className={`rounded-md border px-2 py-1.5 text-center ${destacado ? 'border-ok bg-emerald-50' : 'border-border bg-slate-50'}`}>
      <div className="text-[8px] uppercase tracking-wider text-muted font-semibold">{label}</div>
      <div className={`text-[13px] font-bold tabular-nums leading-tight ${destacado ? 'text-ok' : 'text-slate-900'}`}>
        {valor}
      </div>
      <div className="text-[9px] text-slate-500">{sub}</div>
    </div>
  );
}

function formatHora(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function formatRestante(min) {
  if (min == null) return '—';
  if (min <= 0) return 'Aterrizando';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${pad(m)}m` : `${m}m`;
}
function pad(n) { return String(n).padStart(2, '0'); }