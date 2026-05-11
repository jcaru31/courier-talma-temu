const STYLES = {
  EN_PROCESO: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  TARJADO: 'bg-amber-50 text-amber-700 border-amber-200',
  DESPACHADO_A_ESEER: 'bg-sky-50 text-sky-700 border-sky-200',
};

const LABELS = {
  EN_PROCESO: 'EN CURSO',
  TARJADO: 'TARJADO',
  DESPACHADO_A_ESEER: 'DESPACHADO',
};

export default function StatusBadge({ status }) {
  const cls = STYLES[status] || 'bg-slate-50 text-slate-700 border-slate-200';
  const label = LABELS[status] || status;
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-md text-[11px] font-semibold tracking-wide border ${cls}`}
    >
      {label}
    </span>
  );
}
