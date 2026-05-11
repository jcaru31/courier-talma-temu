export default function ProgressBar({ value = 0, color }) {
  const pct = Math.max(0, Math.min(100, value));
  const tone =
    color ||
    (pct >= 100 ? 'ok' : pct >= 50 ? 'warn' : pct > 0 ? 'warn' : 'muted');

  const bg = {
    ok: 'bg-ok text-white',
    warn: 'bg-warn text-slate-900',
    muted: 'bg-slate-200 text-slate-600',
    danger: 'bg-danger text-white',
  }[tone];

  return (
    <div className="relative w-full h-7 bg-slate-100 rounded-md overflow-hidden border border-border">
      <div
        className={`h-full ${bg} transition-all duration-300 flex items-center justify-center`}
        style={{ width: `${pct}%` }}
      >
        {pct >= 18 && (
          <span className="text-xs font-semibold">{pct}%</span>
        )}
      </div>
      {pct < 18 && (
        <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-slate-600">
          {pct}%
        </span>
      )}
    </div>
  );
}
