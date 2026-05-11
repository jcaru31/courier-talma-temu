import MiniTrazabilidad from './MiniTrazabilidad.jsx';

/**
 * Header compacto del vuelo: una sola card horizontal con datos del vuelo
 * y chips de alertas. Trazabilidad en card separada debajo.
 *
 * Tipografia armonizada:
 *  - Vuelo:    text-xl bold
 *  - Labels:   label-xs (10px uppercase muted)
 *  - Valores:  text-sm semibold (uniforme para todos)
 */
export default function VueloHeader({ vuelo }) {
  return (
    <div className="space-y-3">
      <div className="card px-5 py-4 flex flex-wrap items-center gap-x-7 gap-y-3">
        <div className="text-xl font-bold text-slate-900 leading-none">
          {vuelo.vuelo}
        </div>

        <Sep />

        <Field label="Manifiesto" value={vuelo.manifiesto} />
        <Field label="Aerolínea" value={vuelo.aerolinea_short || vuelo.aerolinea} />

        <Sep />

        <Field label="Origen" value={vuelo.origen} />
        <Arrow />
        <Field label="Destino" value={vuelo.destino} />
        <Field label="ETA" value={formatFechaHora(vuelo.eta)} />

        <Sep />

        <Field label="ULD" value={`${vuelo.uld_recibidos}/${vuelo.uld_esperados}`} />
        <Field label="Bultos" value={`${vuelo.bultos_recibidos}/${vuelo.bultos_esperados}`} />
        <Field label="Kilos" value={formatKg(vuelo.kgs_recibidos)} />

        <Sep />

        <AlertChip label="Parciales" value={vuelo.guias_parciales} accent="amber" />
        <AlertChip label="Inmov." value={vuelo.guias_con_inmov} accent="orange" />
        <AlertChip label="Mal estado" value={vuelo.guias_con_mal_estado} accent="red" />
      </div>

      <div className="card px-5 py-4">
        <MiniTrazabilidad trazabilidad={vuelo.trazabilidad} />
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="label-xs">{label}</span>
      <span className="text-sm font-semibold text-slate-900 mt-0.5">
        {value ?? '—'}
      </span>
    </div>
  );
}

function Sep() {
  return <div className="w-px h-9 bg-border" />;
}

function Arrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function AlertChip({ label, value, accent }) {
  const activo = value > 0;
  const ACTIVE = {
    amber: 'border-amber-300 bg-amber-50 text-amber-800',
    orange: 'border-orange-300 bg-orange-50 text-orange-700',
    red: 'border-red-300 bg-red-50 text-danger',
  };
  const INACTIVE = 'border-slate-200 bg-slate-50 text-slate-300';
  return (
    <div
      className={`rounded-md border px-2.5 py-1 text-center leading-tight ${activo ? ACTIVE[accent] : INACTIVE}`}
      title={`${label}: ${value}`}
    >
      <div className="text-base font-bold tabular-nums">{value}</div>
      <div className="text-[9px] uppercase tracking-wide mt-0.5">{label}</div>
    </div>
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
