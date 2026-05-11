import MiniTrazabilidad from './MiniTrazabilidad.jsx';

export default function VueloHeader({ vuelo }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Datos del vuelo (lateral, <50%) */}
      <div className="lg:col-span-5 card p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="label-xs">Nº Manifiesto</div>
            <div className="text-sm font-semibold">{vuelo.manifiesto}</div>
            <div className="text-xl font-bold text-slate-900 mt-1">{vuelo.vuelo}</div>
            <div className="text-xs text-slate-600">{vuelo.aerolinea}</div>
          </div>
          <TipoBadge tipo={vuelo.tipo_vuelo} />
        </div>

        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
          <Field label="Origen" value={vuelo.origen} />
          <Field label="Destino" value={vuelo.destino} />
          <Field label="ETA" value={formatFechaHora(vuelo.eta)} />
        </div>

        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border text-sm">
          <Stat label="ULD" value={`${vuelo.uld_recibidos}/${vuelo.uld_esperados}`} />
          <Stat label="Bultos" value={`${vuelo.bultos_recibidos}/${vuelo.bultos_esperados}`} />
          <Stat label="Kilos manif." value={vuelo.kgs_esperados?.toLocaleString('es-PE', { minimumFractionDigits: 2 })} />
          <Stat label="Total guías" value={vuelo.total_awbs} />
        </div>

        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border">
          <ChipMetric
            label="Parciales"
            value={vuelo.guias_parciales}
            accent={vuelo.guias_parciales > 0 ? 'warn' : 'muted'}
          />
          <ChipMetric
            label="Inmov."
            value={vuelo.guias_con_inmov}
            accent={vuelo.guias_con_inmov > 0 ? 'orange' : 'muted'}
          />
          <ChipMetric
            label="Mal estado"
            value={vuelo.guias_con_mal_estado}
            accent={vuelo.guias_con_mal_estado > 0 ? 'warn' : 'muted'}
          />
        </div>
      </div>

      {/* Trazabilidad 6 etapas (resto del ancho) */}
      <div className="lg:col-span-7 card p-4">
        <MiniTrazabilidad trazabilidad={vuelo.trazabilidad} />

        <div className="mt-4 pt-3 border-t border-border grid grid-cols-2 gap-3">
          <BarMetric
            label="Avance bultos"
            pct={vuelo.avance_bultos_pct}
            sub={`${vuelo.bultos_recibidos}/${vuelo.bultos_esperados}`}
            color="ok"
          />
          <BarMetric
            label="Transmisión guías"
            pct={vuelo.transmision_pct}
            sub={`${vuelo.trazabilidad?.find((t) => t.key === 'transmisiones')?.completados || 0}/${vuelo.total_awbs}`}
            color="warn"
          />
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div className="label-xs">{label}</div>
      <div className="data-bold text-sm">{value || '—'}</div>
    </div>
  );
}
function Stat({ label, value }) {
  return (
    <div>
      <div className="label-xs">{label}</div>
      <div className="data-bold text-base">{value || '—'}</div>
    </div>
  );
}
function ChipMetric({ label, value, accent }) {
  const STYLES = {
    warn: 'bg-amber-50 border-amber-300 text-amber-700',
    orange: 'bg-orange-50 border-orange-300 text-orange-600',
    danger: 'bg-red-50 border-danger text-danger',
    muted: 'bg-slate-50 border-slate-200 text-slate-500',
  };
  return (
    <div className={`border rounded-md px-3 py-2 ${STYLES[accent]}`}>
      <div className="text-[10px] uppercase tracking-wide">{label}</div>
      <div className="text-lg font-bold leading-none mt-1">{value}</div>
    </div>
  );
}
function BarMetric({ label, pct, sub, color }) {
  const bg = color === 'ok' ? 'bg-ok' : 'bg-warn';
  const text = color === 'ok' ? 'text-ok' : 'text-amber-700';
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="label-xs">{label}</div>
        <div className={`text-sm font-bold ${text}`}>{pct}%</div>
      </div>
      <div className="h-3 bg-slate-100 rounded-md overflow-hidden border border-border">
        <div className={`h-full ${bg}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-[10px] text-muted mt-1">{sub}</div>
    </div>
  );
}
function TipoBadge({ tipo }) {
  return (
    <span className="text-[10px] font-bold tracking-wider text-slate-700 uppercase border border-border bg-slate-50 px-2 py-1 rounded-md">
      {tipo}
    </span>
  );
}
function formatFechaHora(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function pad(n) { return String(n).padStart(2, '0'); }
