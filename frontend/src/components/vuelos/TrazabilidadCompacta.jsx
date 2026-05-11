/**
 * Trazabilidad compacta para tabla: 6 dots alineados exactamente bajo las
 * labels del header (mismo grid-cols-6). Lineas conectoras absolutas entre dots.
 */
export default function TrazabilidadCompacta({ trazabilidad }) {
  if (!trazabilidad || trazabilidad.length === 0) {
    return <span className="text-slate-300">—</span>;
  }

  return (
    <div className="grid grid-cols-6 items-center">
      {trazabilidad.map((etapa, i) => {
        const pct = etapa.total > 0 ? etapa.completados / etapa.total : 0;
        const completa = pct === 1;
        const parcial = pct > 0 && pct < 1;

        const dotColor = completa
          ? 'bg-ok'
          : parcial
          ? 'bg-warn'
          : 'bg-slate-300';

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

        const leftLine = prevPct > 0 && pct > 0 ? 'bg-ok' : 'bg-slate-200';
        const rightLine = pct > 0 && nextPct > 0 ? 'bg-ok' : 'bg-slate-200';

        return (
          <div
            key={etapa.key}
            className="relative flex items-center justify-center h-5"
          >
            {!isFirst && (
              <div
                className={`absolute left-0 top-1/2 -translate-y-1/2 w-1/2 h-[3px] ${leftLine}`}
              />
            )}
            {!isLast && (
              <div
                className={`absolute right-0 top-1/2 -translate-y-1/2 w-1/2 h-[3px] ${rightLine}`}
              />
            )}
            <div
              className={`relative z-10 w-3.5 h-3.5 rounded-full ${dotColor} shadow-sm`}
              title={`${etapa.label}: ${etapa.completados}/${etapa.total}`}
            />
          </div>
        );
      })}
    </div>
  );
}
