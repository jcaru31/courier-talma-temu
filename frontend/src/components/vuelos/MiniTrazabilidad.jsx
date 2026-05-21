import EtapaIcono from './EtapaIconos.jsx';

/**
 * Trazabilidad horizontal. Cada etapa es clickeable y filtra la tabla
 * de guias por estado_tracking correspondiente.
 *
 * Props:
 *   trazabilidad: [{key,label,completados,total}]
 *   etapaActiva: key actualmente filtrada (o null)
 *   onEtapaClick(key): toggle del filtro
 */
const ETAPA_A_TRACKING = {
  traslado: 'RECEPCION',
  recepcion: 'TARJA',
  transmisiones: 'ADUANAS',
  facturacion: 'ADUANAS',
  despacho: 'DESPACHADO',
};

export default function MiniTrazabilidad({
  trazabilidad,
  etapaActiva = null,
  onEtapaClick = () => {},
}) {
  if (!trazabilidad || trazabilidad.length === 0) return null;
  const cols = trazabilidad.length;

  return (
    <div>
      <div className="mb-3 text-[10px] uppercase tracking-wider text-muted font-semibold">
        Trazabilidad de proceso
      </div>
      <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {trazabilidad.map((etapa, i) => {
          const pct = etapa.total > 0 ? etapa.completados / etapa.total : 0;
          const completa = pct === 1;
          const parcial = pct > 0 && pct < 1;

          const labelColor = completa ? 'text-navy' : parcial ? 'text-amber-700' : 'text-slate-400';
          const contadorColor = completa ? 'text-ok' : parcial ? 'text-warn' : 'text-slate-400';

          const isFirst = i === 0;
          const isLast = i === trazabilidad.length - 1;
          const nextPct = !isLast && trazabilidad[i + 1].total > 0
            ? trazabilidad[i + 1].completados / trazabilidad[i + 1].total : 0;
          const prevPct = !isFirst && trazabilidad[i - 1].total > 0
            ? trazabilidad[i - 1].completados / trazabilidad[i - 1].total : 0;

          const leftLine = prevPct === 1 && pct === 1 ? 'bg-ok' : 'bg-slate-200';
          const rightLine = pct === 1 && nextPct === 1 ? 'bg-ok' : 'bg-slate-200';

          // El hito Aerolínea no es filtrable: toda guía registrada ya está
          // manifestada, así que no aporta como filtro de la tabla.
          const clickeable = etapa.key !== 'aerolinea';
          const activa = clickeable && etapaActiva === etapa.key;
          const handleClick = () => clickeable && onEtapaClick(activa ? null : etapa.key);

          const Comp = clickeable ? 'button' : 'div';
          return (
            <Comp
              key={etapa.key}
              {...(clickeable ? { type: 'button', onClick: handleClick } : {})}
              className={`flex flex-col items-center text-center px-1 py-1 rounded-md transition ${
                activa
                  ? 'bg-blue-50 ring-2 ring-navy'
                  : clickeable
                  ? 'hover:bg-slate-50 cursor-pointer'
                  : 'cursor-default'
              }`}
              title={clickeable ? `Filtrar guías en ${etapa.label}` : 'Todas las guías del vuelo ya están manifestadas'}
            >
              <div className={`p-1.5 rounded-full ${completa || parcial ? 'bg-blue-50' : ''}`}>
                <EtapaIcono etapa={etapa.key} activo={completa || parcial} size={26} />
              </div>

              <div className={`mt-1.5 text-[11px] font-semibold uppercase tracking-wider ${labelColor}`}>
                {etapa.label}
              </div>

              <div className={`text-lg font-bold tabular-nums leading-none mt-1 ${contadorColor}`}>
                {etapa.completados}
                <span className="text-slate-400 font-medium text-sm">/{etapa.total}</span>
              </div>

              <div className="relative w-full flex items-center justify-center h-5 mt-2">
                {!isFirst && <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1/2 h-[3px] ${leftLine}`} />}
                {!isLast && <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-1/2 h-[3px] ${rightLine}`} />}
                <Circle estado={completa ? 'OK' : parcial ? 'PARCIAL' : 'VACIO'} />
              </div>
            </Comp>
          );
        })}
      </div>
    </div>
  );
}

function Circle({ estado }) {
  if (estado === 'OK') {
    return (
      <div className="relative z-10 w-5 h-5 rounded-full bg-ok flex items-center justify-center shadow-sm ring-4 ring-white">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    );
  }
  if (estado === 'PARCIAL') {
    return (
      <div className="relative z-10 w-5 h-5 rounded-full bg-warn flex items-center justify-center shadow-sm ring-4 ring-white">
        <div className="w-2 h-2 bg-white rounded-full" />
      </div>
    );
  }
  return <div className="relative z-10 w-5 h-5 rounded-full bg-white border-2 border-slate-300 ring-4 ring-white" />;
}
