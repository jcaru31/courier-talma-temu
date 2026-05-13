/**
 * 4 mini-cards (Faltantes / Parciales / Inmov / Mal estado) con numero grande y
 * label legible. Si todas estan en 0: badge verde "Sin alertas".
 */
export default function AlertasCompactas({
  faltantes = 0,
  parciales = 0,
  inmov = 0,
  malEstado = 0,
}) {
  const total = faltantes + parciales + inmov + malEstado;

  if (total === 0) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-emerald-50 border border-ok text-ok text-[12px] font-bold tracking-wider whitespace-nowrap">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        SIN ALERTAS
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-1.5" style={{ minWidth: '240px' }}>
      <Cell num={faltantes} label="Faltantes" accent="violet" />
      <Cell num={parciales} label="Parciales" accent="amber" />
      <Cell num={inmov} label="Inmov." accent="orange" />
      <Cell num={malEstado} label="Mal est." accent="red" />
    </div>
  );
}

function Cell({ num, label, accent }) {
  const activo = num > 0;
  const ACTIVE = {
    violet: 'border-violet-300 bg-violet-50 text-violet-800',
    amber: 'border-amber-300 bg-amber-50 text-amber-800',
    orange: 'border-orange-300 bg-orange-50 text-orange-700',
    red: 'border-red-300 bg-red-50 text-danger',
  };
  const INACTIVE = 'border-slate-200 bg-slate-50 text-slate-300';

  return (
    <div
      className={`rounded-md border px-2 py-1.5 text-center ${activo ? ACTIVE[accent] : INACTIVE}`}
      title={`${label}: ${num}`}
    >
      <div className="text-lg font-bold leading-tight tabular-nums">{num}</div>
      <div className="text-[10px] uppercase tracking-wider font-semibold leading-tight mt-0.5">
        {label}
      </div>
    </div>
  );
}
