import EtapaIcono from './EtapaIconos.jsx';

/**
 * Trazabilidad horizontal sobria, paleta navy + verde + amarillo + gris.
 * 6 etapas con icono, conteo y/x, circulo de estado y linea conectora.
 */
export default function MiniTrazabilidad({ trazabilidad }) {
  if (!trazabilidad || trazabilidad.length === 0) return null;

  return (
    <div>
      <div className="label-xs mb-3">Trazabilidad de proceso</div>
      <div className="grid grid-cols-6">
        {trazabilidad.map((etapa, i) => {
          const pct = etapa.total > 0 ? etapa.completados / etapa.total : 0;
          const completa = pct === 1;
          const parcial = pct > 0 && pct < 1;
          const vacia = pct === 0;

          const labelColor = completa
            ? 'text-navy'
            : parcial
            ? 'text-amber-700'
            : 'text-slate-400';
          const contadorColor = completa
            ? 'text-ok'
            : parcial
            ? 'text-warn'
            : 'text-slate-400';

          const isFirst = i === 0;
          const isLast = i === trazabilidad.length - 1;
          const nextPct =
            !isLast && trazabilidad[i + 1].total > 0
              ? trazabilidad[i + 1].completados / trazabilidad[i + 1].total
              : 0;
          const prevPct =
            !isFirst && trazabilidad[i - 1].total > 0
              ? trazabilidad[i - 1].completados / trazabilidad[i - 1].total
              : 0;

          const leftLine = prevPct > 0 && pct > 0 ? 'bg-ok' : 'bg-slate-200';
          const rightLine = pct > 0 && nextPct > 0 ? 'bg-ok' : 'bg-slate-200';

          return (
            <div key={etapa.key} className="flex flex-col items-center text-center px-1">
              {/* Icono */}
              <div className={`p-1.5 rounded-full ${completa || parcial ? 'bg-blue-50' : ''}`}>
                <EtapaIcono etapa={etapa.key} activo={completa || parcial} size={26} />
              </div>

              {/* Label */}
              <div className={`mt-1.5 text-[10px] font-semibold uppercase tracking-wide ${labelColor}`}>
                {etapa.label}
              </div>

              {/* Conteo */}
              <div className={`text-base font-bold tabular-nums leading-none mt-2 ${contadorColor}`}>
                {etapa.completados}<span className="text-slate-400 font-normal">/{etapa.total}</span>
              </div>

              {/* Linea + circle */}
              <div className="relative w-full flex items-center justify-center h-6 mt-2">
                {!isFirst && (
                  <div
                    className={`absolute left-0 top-1/2 -translate-y-1/2 w-1/2 h-[3px] ${leftLine}`}
                  />
                )}
                {!isLast && (
                  <div
                    className={`absolute right-0 top-1/2 -translate-y-1/2 w-1/2 h-[3px] ${rightLine}`}
                  />
                )}
                <Circle estado={completa ? 'OK' : parcial ? 'PARCIAL' : 'VACIO'} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Circle({ estado }) {
  if (estado === 'OK') {
    return (
      <div className="relative z-10 w-5 h-5 rounded-full bg-ok flex items-center justify-center shadow-sm ring-4 ring-white">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    );
  }
  if (estado === 'PARCIAL') {
    return (
      <div className="relative z-10 w-5 h-5 rounded-full bg-warn flex items-center justify-center shadow-sm ring-4 ring-white">
        <div className="w-1.5 h-1.5 bg-white rounded-full" />
      </div>
    );
  }
  return (
    <div className="relative z-10 w-5 h-5 rounded-full bg-white border-2 border-slate-300 ring-4 ring-white" />
  );
}
