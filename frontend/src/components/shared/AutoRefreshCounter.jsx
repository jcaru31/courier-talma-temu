export default function AutoRefreshCounter({ minutos, segundos }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1">
        <Slot value={minutos} />
        <span className="text-2xl font-bold text-slate-400">:</span>
        <Slot value={segundos} />
      </div>
      <div className="text-xs text-muted leading-tight">
        <div>Minutos</div>
        <div>Segundos</div>
        <div className="text-slate-500 mt-1">Tiempo para la<br/>siguiente actualizacion</div>
      </div>
    </div>
  );
}

function Slot({ value }) {
  return (
    <div className="px-3 py-1 bg-slate-100 border border-border rounded-md font-mono font-bold text-2xl text-slate-800 min-w-[44px] text-center">
      {value}
    </div>
  );
}
