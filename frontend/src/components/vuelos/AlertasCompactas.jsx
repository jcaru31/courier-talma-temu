/**
 * 3 mini-cards horizontales (Parc / Inmov / Mal) con numero grande y label
 * legible. Si todo esta limpio: badge verde "Sin alertas".
 */
export default function AlertasCompactas({ parciales = 0, inmov = 0, malEstado = 0 }) {
  const total = parciales + inmov + malEstado;

  if (total === 0) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-50 border border-ok text-ok text-[11px] font-semibold whitespace-nowrap">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        SIN ALERTAS
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1.5" style={{ minWidth: '170px' }}>
      <Cell num={parciales} label="Parciales" accent="amber" />
      <Cell num={inmov} label="Inmov." accent="orange" />
      <Cell num={malEstado} label="Mal est." accent="red" />
    </div>
  );
}

function Cell({ num, label, accent }) {
  const activo = num > 0;
  const ACTIVE = {
    amber: 'border-amber-300 bg-amber-50 text-amber-800',
    orange: 'border-orange-300 bg-orange-50 text-orange-700',
    red: 'border-red-300 bg-red-50 text-danger',
  };
  const INACTIVE = 'border-slate-200 bg-slate-50 text-slate-300';

  return (
    <div
      className={`rounded-md border px-1.5 py-1 text-center ${activo ? ACTIVE[accent] : INACTIVE}`}
      title={`${label}: ${num}`}
    >
      <div className="text-base font-bold leading-tight tabular-nums">{num}</div>
      <div className="text-[9px] uppercase tracking-wide leading-tight mt-0.5">
        {label}
      </div>
    </div>
  );
}
