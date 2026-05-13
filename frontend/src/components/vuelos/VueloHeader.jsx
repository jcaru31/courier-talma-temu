import MiniTrazabilidad from './MiniTrazabilidad.jsx';
import RelojSLA from './RelojSLA.jsx';

/**
 * Header del vuelo compacto. Columna izquierda con info + reloj META.
 * Columna derecha apila: trazabilidad (top) + chips de alertas (bottom),
 * todo dentro del mismo bloque para no dejar espacios en blanco.
 */
export default function VueloHeader({
  vuelo,
  etapaActiva = null,
  onEtapaClick = () => {},
  alertaActiva = null,
  onAlertaClick = () => {},
}) {
  const hayFiltro = etapaActiva || alertaActiva;
  return (
    <div className="card p-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Columna izquierda: info compacta + reloj META */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="flex items-baseline gap-3 flex-wrap">
            <div className="text-2xl font-bold text-slate-900 leading-none tracking-tight">
              {vuelo.vuelo}
            </div>
            <div className="text-[12px] font-semibold text-slate-700 uppercase tracking-wider">
              {vuelo.aerolinea_short || vuelo.aerolinea}
            </div>
            <div className="text-[11px] text-muted ml-auto font-medium">
              MNF {vuelo.manifiesto}
            </div>
          </div>

          <div className="grid grid-cols-6 gap-x-3 gap-y-2 pt-0.5">
            <Cell label="Origen" value={vuelo.origen} big />
            <Cell label="Destino" value={vuelo.destino} big />
            <Cell label="Arribo" value={formatFechaHora(vuelo.eta)} />
            <Cell label="ULD" value={`${vuelo.uld_recibidos}/${vuelo.uld_esperados}`} />
            <Cell label="Bultos" value={`${vuelo.bultos_recibidos}/${vuelo.bultos_esperados}`} />
            <Cell label="Kilos" value={formatKg(vuelo.kgs_recibidos)} />
          </div>

          <RelojSLA sla={vuelo.sla} />
        </div>

        {/* Columna derecha: trazabilidad + alertas apilados */}
        <div className="lg:col-span-7 lg:border-l lg:border-border lg:pl-4 flex flex-col gap-3">
          <MiniTrazabilidad
            trazabilidad={vuelo.trazabilidad}
            etapaActiva={etapaActiva}
            onEtapaClick={onEtapaClick}
          />

          <div className="pt-3 border-t border-border flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider text-muted font-semibold mr-1">
              Alertas del vuelo
            </span>
            <AlertChip
              tipo="faltantes"
              label="Faltantes"
              value={vuelo.guias_faltantes}
              accent="violet"
              activa={alertaActiva === 'faltantes'}
              onClick={onAlertaClick}
            />
            <AlertChip
              tipo="parciales"
              label="Parciales"
              value={vuelo.guias_parciales}
              accent="amber"
              activa={alertaActiva === 'parciales'}
              onClick={onAlertaClick}
            />
            <AlertChip
              tipo="inmov"
              label="Inmovilizadas"
              value={vuelo.guias_con_inmov}
              accent="orange"
              activa={alertaActiva === 'inmov'}
              onClick={onAlertaClick}
            />
            <AlertChip
              tipo="mal_estado"
              label="Mal estado"
              value={vuelo.guias_con_mal_estado}
              accent="red"
              activa={alertaActiva === 'mal_estado'}
              onClick={onAlertaClick}
            />
            {hayFiltro && (
              <button
                onClick={() => { onEtapaClick(null); onAlertaClick(null); }}
                className="ml-auto text-[11px] text-slate-500 hover:text-slate-900 underline font-medium"
              >
                Quitar filtro
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Cell({ label, value, big = false }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-[10px] uppercase tracking-wider text-muted font-semibold">{label}</span>
      <span className={`${big ? 'text-base' : 'text-sm'} font-bold text-slate-900 mt-0.5 tracking-tight`}>
        {value ?? '—'}
      </span>
    </div>
  );
}

function AlertChip({ tipo, label, value, accent, activa, onClick }) {
  const hayValor = value > 0;
  const ACTIVE = {
    violet: 'border-violet-300 bg-violet-50 text-violet-800',
    amber: 'border-amber-300 bg-amber-50 text-amber-800',
    orange: 'border-orange-300 bg-orange-50 text-orange-700',
    red: 'border-red-300 bg-red-50 text-danger',
  };
  const INACTIVE = 'border-slate-200 bg-slate-50 text-slate-300';
  const RING = {
    violet: 'ring-2 ring-violet-500',
    amber: 'ring-2 ring-amber-500',
    orange: 'ring-2 ring-orange-500',
    red: 'ring-2 ring-red-500',
  };

  const base = `inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 leading-none ${
    hayValor ? ACTIVE[accent] : INACTIVE
  } ${activa ? RING[accent] + ' shadow-sm' : ''}`;

  const handle = () => { if (hayValor) onClick(activa ? null : tipo); };

  return (
    <button
      type="button"
      onClick={handle}
      disabled={!hayValor}
      className={`${base} ${hayValor ? 'hover:shadow cursor-pointer' : 'cursor-not-allowed'}`}
      title={hayValor ? `Filtrar guías: ${label}` : `${label}: 0`}
    >
      <span className="text-sm font-bold tabular-nums">{value}</span>
      <span className="text-[10px] uppercase tracking-wider font-semibold">{label}</span>
    </button>
  );
}

function formatFechaHora(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function formatKg(n) {
  if (n == null) return '—';
  return n.toLocaleString('es-PE', { minimumFractionDigits: 2 });
}
function pad(n) { return String(n).padStart(2, '0'); }
