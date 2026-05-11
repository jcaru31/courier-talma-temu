const STYLES = {
  VERDE: 'border-ok text-ok bg-emerald-50',
  ROJO: 'border-danger text-danger bg-red-50',
  NARANJA: 'border-orange-500 text-orange-600 bg-orange-50',
};

export default function ChannelBadge({ color }) {
  const cls = STYLES[color] || 'border-slate-300 text-slate-600 bg-slate-50';
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-md text-[11px] font-bold tracking-wider border ${cls}`}>
      {color || '—'}
    </span>
  );
}
