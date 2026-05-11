export default function MiniTrazabilidad({ trazabilidad }) {
  if (!trazabilidad || trazabilidad.length === 0) return null;

  return (
    <div>
      <div className="label-xs mb-3">Trazabilidad de proceso</div>
      <div className="grid grid-cols-6 gap-1">
        {trazabilidad.map((etapa, i) => {
          const pct = etapa.total > 0 ? Math.round((etapa.completados / etapa.total) * 100) : 0;
          const completa = pct === 100;
          const parcial = pct > 0 && pct < 100;
          const vacia = pct === 0;

          return (
            <div key={etapa.key} className="flex flex-col items-center text-center">
              {/* Conteo */}
              <div
                className={`text-xs font-bold mb-1 ${
                  completa ? 'text-ok' : parcial ? 'text-warn' : 'text-slate-400'
                }`}
              >
                {etapa.completados}/{etapa.total}
              </div>

              {/* Circle + linea */}
              <div className="relative w-full flex items-center justify-center h-6">
                {i > 0 && (
                  <div
                    className={`absolute left-0 top-1/2 -translate-y-1/2 h-1 ${
                      !vacia ? 'bg-ok' : 'bg-slate-200'
                    }`}
                    style={{ width: '50%' }}
                  />
                )}
                {i < trazabilidad.length - 1 && (
                  <div
                    className={`absolute right-0 top-1/2 -translate-y-1/2 h-1 ${
                      trazabilidad[i + 1] && trazabilidad[i + 1].completados > 0 ? 'bg-ok' : 'bg-slate-200'
                    }`}
                    style={{ width: '50%' }}
                  />
                )}
                <Circle estado={completa ? 'OK' : parcial ? 'PARCIAL' : 'VACIO'} />
              </div>

              {/* Label */}
              <div className={`mt-1 text-[10px] font-semibold uppercase tracking-wide leading-tight ${
                completa ? 'text-navy' : parcial ? 'text-slate-700' : 'text-slate-400'
              }`}>
                {etapa.label}
              </div>

              {/* Barra horizontal mini */}
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                <div
                  className={`h-full ${completa ? 'bg-ok' : 'bg-warn'}`}
                  style={{ width: `${pct}%` }}
                />
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
      <div className="relative z-10 w-5 h-5 rounded-full bg-ok flex items-center justify-center shadow-sm">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    );
  }
  if (estado === 'PARCIAL') {
    return (
      <div className="relative z-10 w-5 h-5 rounded-full bg-warn flex items-center justify-center shadow-sm ring-2 ring-warn/30">
        <div className="w-1.5 h-1.5 bg-white rounded-full" />
      </div>
    );
  }
  return <div className="relative z-10 w-5 h-5 rounded-full bg-slate-300 border-2 border-white" />;
}
