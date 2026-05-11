import EtapaIcono from './EtapaIcono.jsx';

const ETAPAS = [
  { key: 'recepcion', label: 'Recepcion' },
  { key: 'tarja', label: 'Tarja' },
  { key: 'almacenamiento', label: 'Almacenamiento' },
  { key: 'aduanas', label: 'Aduanas' },
  { key: 'despacho_eseer', label: 'Despacho ESEER' },
];

export default function TimelineHorizontal({ timeline }) {
  return (
    <div className="card p-6">
      <div className="grid grid-cols-5 gap-2">
        {ETAPAS.map((etapa, i) => {
          const data = timeline?.[etapa.key];
          const estado = data?.estado || 'PENDIENTE';
          const completado = estado === 'COMPLETADO';
          const enCurso = estado === 'EN_CURSO';
          const fecha = data?.fecha_fin || data?.fecha_inicio;
          const dias = data?.dias_estadia;

          return (
            <div key={etapa.key} className="flex flex-col items-center text-center relative">
              {/* Badge dias estadia (solo almacenamiento) */}
              {etapa.key === 'almacenamiento' && dias > 0 && (
                <div className="absolute -top-4 z-10 px-3 py-0.5 rounded-full border border-ok bg-emerald-50 text-ok text-[11px] font-semibold">
                  {dias} dia{dias !== 1 ? 's' : ''}
                </div>
              )}

              {/* Icono */}
              <div className="mt-2">
                <EtapaIcono etapa={etapa.key} activo={completado || enCurso} />
              </div>

              {/* Label */}
              <div className={`mt-2 font-semibold text-sm ${completado || enCurso ? 'text-navy' : 'text-slate-400'}`}>
                {etapa.label}
              </div>

              {/* Linea + check */}
              <div className="relative w-full flex items-center justify-center mt-3 h-6">
                {/* Linea izquierda */}
                {i > 0 && (
                  <div
                    className={`absolute left-0 top-1/2 -translate-y-1/2 h-1 ${
                      completado || enCurso ? 'bg-ok' : 'bg-slate-300'
                    }`}
                    style={{ width: '50%' }}
                  />
                )}
                {/* Linea derecha */}
                {i < ETAPAS.length - 1 && (
                  <div
                    className={`absolute right-0 top-1/2 -translate-y-1/2 h-1 ${
                      isNextActivo(timeline, etapa.key) ? 'bg-ok' : 'bg-slate-300'
                    }`}
                    style={{ width: '50%' }}
                  />
                )}
                {/* Punto */}
                <CircleEstado estado={estado} />
              </div>

              {/* Timestamp */}
              <div className="mt-2 text-[11px] font-semibold text-slate-700 tabular-nums">
                {fecha ? formatFechaHora(fecha) : '—'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CircleEstado({ estado }) {
  if (estado === 'COMPLETADO') {
    return (
      <div className="relative z-10 w-6 h-6 rounded-full bg-ok flex items-center justify-center shadow-sm">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    );
  }
  if (estado === 'EN_CURSO') {
    return (
      <div className="relative z-10 w-6 h-6 rounded-full bg-warn flex items-center justify-center shadow-sm ring-2 ring-warn/30">
        <div className="w-2 h-2 bg-white rounded-full" />
      </div>
    );
  }
  return (
    <div className="relative z-10 w-6 h-6 rounded-full bg-slate-300 border-2 border-white" />
  );
}

function isNextActivo(timeline, currentKey) {
  const idx = ETAPAS.findIndex((e) => e.key === currentKey);
  const next = ETAPAS[idx + 1];
  if (!next) return false;
  const estado = timeline?.[next.key]?.estado;
  return estado === 'COMPLETADO' || estado === 'EN_CURSO';
}

function formatFechaHora(iso) {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} HRS`;
}
function pad(n) { return String(n).padStart(2, '0'); }
