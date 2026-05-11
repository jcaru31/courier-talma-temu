export default function LeyendaTabla() {
  return (
    <div className="card px-4 py-3 flex flex-wrap items-center gap-x-8 gap-y-3 text-xs">
      <Group title="Proceso">
        <Dot color="bg-ok" label="Completo" />
        <Dot color="bg-warn" label="En proceso" />
        <Dot color="bg-slate-300" label="Pendiente" />
      </Group>

      <div className="w-px h-6 bg-border" />

      <Group title="Alertas">
        <MiniCard label="Parciales" accent="amber" />
        <MiniCard label="Inmov." accent="orange" />
        <MiniCard label="Mal est." accent="red" />
      </Group>
    </div>
  );
}

function Group({ title, children }) {
  return (
    <div className="flex items-center gap-3">
      <span className="label-xs">{title}</span>
      {children}
    </div>
  );
}

function Dot({ color, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-3 h-3 rounded-full ${color}`} />
      <span className="text-slate-600">{label}</span>
    </div>
  );
}

function MiniCard({ label, accent }) {
  const STYLES = {
    amber: 'border-amber-300 bg-amber-50 text-amber-800',
    orange: 'border-orange-300 bg-orange-50 text-orange-700',
    red: 'border-red-300 bg-red-50 text-danger',
  };
  return (
    <div className={`rounded-md border px-1.5 py-0.5 text-center ${STYLES[accent]}`}>
      <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
    </div>
  );
}
