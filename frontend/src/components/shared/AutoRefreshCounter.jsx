/**
 * Contador compacto: M:SS inline + label corta a la derecha.
 * Versión densa para integrarse en una barra horizontal con otros controles.
 */
export default function AutoRefreshCounter({ minutos, segundos }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <Slot value={minutos} />
        <span className="text-xl font-bold text-slate-400 leading-none">:</span>
        <Slot value={segundos} />
      </div>
      <div className="text-[10px] text-muted leading-tight font-medium uppercase tracking-wider">
        Próxima<br />actualización
      </div>
    </div>
  );
}

function Slot({ value }) {
  return (
    <div className="px-2 py-1 bg-slate-100 border border-border rounded font-mono font-bold text-xl text-slate-800 min-w-[38px] text-center tracking-tight leading-none">
      {value}
    </div>
  );
}
