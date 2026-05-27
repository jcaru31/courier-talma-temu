import AlertasEtiquetas from './AlertasEtiquetas.jsx';
import { alertaHandlingPendiente } from '../../utils/handlingAlerta.js';

/**
 * Header de la guía (Vista 3) — versión ágil. Datos comerciales/operativos
 * y carga. Sin sección de Salida (no aplica). Las alertas activas se
 * muestran como etiquetas chiquitas al lado del título "Datos de la guía".
 */
export default function HeaderAWB({ awb }) {
  const handlingNoPagado = alertaHandlingPendiente(awb);

  return (
    <div className="card p-4">
      <div className="grid lg:grid-cols-12 gap-4">
        {/* Datos de la guía */}
        <div className="lg:col-span-8">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <span className="label-xs">Datos de la guía</span>
            <AlertasEtiquetas alertas={awb.alertas_activas} />
          </div>
          <div className="grid grid-cols-3 gap-x-4 gap-y-2.5">
            <Field label="Shipper" value={awb.shipper} />
            <Field label="Fecha de Emisión" value={formatFechaHora(awb.fecha_emision)} mono />
            <Field label="Tipo Almac." value={awb.tipo_almacenamiento} />
            <Field label="Volante" value={awb.volante} mono />
            <Field label="Consignatario" value={awb.consignatario_nombre} />
            <Field label="RUC del Consignatario" value={awb.consignatario?.ruc} mono />
          </div>
        </div>

        {/* Carga */}
        <div className="lg:col-span-4 lg:border-l lg:border-border lg:pl-4">
          <div className="label-xs mb-2">Carga</div>
          <Ratio label="Bultos" rec={awb.bultos_recibidos} man={awb.bultos_esperados} />
          <Ratio
            label="Kilos"
            rec={fmt(awb.kgs_recibidos)}
            man={fmt(awb.kgs_esperados)}
          />
          {handlingNoPagado && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-fuchsia-50 border border-fuchsia-300 text-fuchsia-700">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 6v12" />
                <path d="M16 9c0-1.5-1.8-2.5-4-2.5s-4 1-4 2.5 1.8 2 4 2.5 4 1 4 2.5-1.8 2.5-4 2.5-4-1-4-2.5" />
              </svg>
              <span className="text-[10px] font-bold uppercase tracking-wider leading-tight">
                Pago Handling pendiente
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, sub, mono = false }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
        {label}
      </span>
      <span className={`text-sm font-bold text-slate-800 mt-0.5 ${mono ? 'tabular-nums' : ''}`}>
        {value || '—'}
      </span>
      {sub && <span className="text-[10px] text-slate-500 mt-0.5">{sub}</span>}
    </div>
  );
}

function Ratio({ label, rec, man }) {
  return (
    <div className="mt-1">
      <span className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
        {label} <span className="text-slate-300 normal-case font-medium">rec / man</span>
      </span>
      <div className="text-base font-bold tabular-nums text-slate-900 leading-tight">
        {rec ?? '—'}
        <span className="text-slate-400 font-medium"> / {man ?? '—'}</span>
      </div>
    </div>
  );
}

function fmt(n) {
  if (n == null) return '—';
  return n.toLocaleString('es-PE', { minimumFractionDigits: 1, maximumFractionDigits: 1, useGrouping: false });
}
function pad(n) { return String(n).padStart(2, '0'); }
function formatFechaHora(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
