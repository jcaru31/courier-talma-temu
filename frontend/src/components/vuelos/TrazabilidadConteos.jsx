/**
 * Trazabilidad de vuelo para la lista (Vista 1): N hitos con su conteo
 * `completados/total` sobre cada punto. Cuando `interactivo` es true (fila
 * expandida) cada hito se vuelve un botón que filtra la tabla de guías.
 * El hito "aerolinea" nunca es filtrable (toda guía ya está manifestada).
 */
export default function TrazabilidadConteos({
  trazabilidad,
  interactivo = false,
  etapaActiva = null,
  onEtapaClick = () => {},
}) {
  if (!trazabilidad || trazabilidad.length === 0) {
    return <span className="text-slate-300">—</span>;
  }
  const cols = trazabilidad.length;

  return (
    <div
      className="grid items-center"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {trazabilidad.map((etapa, i) => {
        const pct = etapa.total > 0 ? etapa.completados / etapa.total : 0;
        const completa = pct === 1;
        const parcial = pct > 0 && pct < 1;

        const dotColor = completa ? 'bg-ok' : parcial ? 'bg-warn' : 'bg-slate-300';
        const countColor = completa ? 'text-ok' : parcial ? 'text-warn' : 'text-slate-400';

        const isFirst = i === 0;
        const isLast = i === trazabilidad.length - 1;
        const prevPct =
          !isFirst && trazabilidad[i - 1].total > 0
            ? trazabilidad[i - 1].completados / trazabilidad[i - 1].total
            : 0;
        const nextPct =
          !isLast && trazabilidad[i + 1].total > 0
            ? trazabilidad[i + 1].completados / trazabilidad[i + 1].total
            : 0;
        const leftLine = prevPct === 1 && pct === 1 ? 'bg-ok' : 'bg-slate-200';
        const rightLine = pct === 1 && nextPct === 1 ? 'bg-ok' : 'bg-slate-200';

        // Solo los hitos en proceso (amarillo / parcial) permiten filtrar.
        // Un hito completado (verde) o pendiente (gris) no es clickeable.
        const clickeable = interactivo && parcial;
        const activa = clickeable && etapaActiva === etapa.key;
        const Comp = clickeable ? 'button' : 'div';

        return (
          <Comp
            key={etapa.key}
            {...(clickeable
              ? {
                  type: 'button',
                  onClick: (e) => {
                    e.stopPropagation();
                    onEtapaClick(activa ? null : etapa.key);
                  },
                }
              : {})}
            className={`flex flex-col items-center px-0.5 py-1 rounded-md transition ${
              activa
                ? 'bg-blue-50 ring-2 ring-navy'
                : clickeable
                ? 'hover:bg-slate-100 cursor-pointer'
                : ''
            }`}
            title={
              `${etapa.label}: ${etapa.completados}/${etapa.total}` +
              (clickeable ? ' — clic para filtrar guías' : '')
            }
          >
            <div className={`text-[11px] font-bold tabular-nums leading-none ${countColor}`}>
              {etapa.completados}
              <span className="text-slate-400 font-medium">/{etapa.total}</span>
            </div>
            <div className="relative w-full flex items-center justify-center h-5 mt-1.5">
              {!isFirst && (
                <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1/2 h-[3px] ${leftLine}`} />
              )}
              {!isLast && (
                <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-1/2 h-[3px] ${rightLine}`} />
              )}
              <div className={`relative z-10 w-4 h-4 rounded-full shadow-sm ${dotColor}`} />
            </div>
          </Comp>
        );
      })}
    </div>
  );
}
