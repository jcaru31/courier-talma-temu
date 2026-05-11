import ChannelBadge from '../shared/ChannelBadge.jsx';

export default function HeaderAWB({ awb }) {
  const canalColor = awb.canal_dam?.color;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Consignatario */}
      <div className="lg:col-span-3 card p-4">
        <div className="text-[10px] text-muted uppercase tracking-wide">N RUC</div>
        <div className="text-sm font-semibold text-slate-700">
          {awb.consignatario?.ruc || '—'}
        </div>
        <div className="text-xl font-bold text-slate-900 mt-2 leading-tight">
          {awb.consignatario?.nombre || '—'}
        </div>
        <div className="mt-4">
          <div className="label-xs">Guias</div>
          <div className="mt-1 space-y-1">
            <div>
              <div className="label-xs">AWB</div>
              <div className="data-bold text-sm">{awb.awb}</div>
            </div>
            <div>
              <div className="label-xs">Manifiesto</div>
              <div className="data-bold text-sm">{awb.manifiesto}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Datos de carga */}
      <div className="lg:col-span-5 card p-4">
        <div className="label-xs mb-3">Datos de carga</div>
        <div className="grid grid-cols-4 gap-3 mb-4">
          <Field label="Origen" value={awb.origen} />
          <Field label="Destino" value={awb.destino} />
          <Field label="Tipo almac." value={awb.tipo_almacenamiento} />
          <Field label="N manifiesto" value={awb.manifiesto} />
        </div>
        <div className="grid grid-cols-4 gap-3 mb-4">
          <Field label="N vuelo" value={awb.vuelo} />
          <Field label="Fecha" value={formatFecha(awb.eta)} />
          <Field label="Hora" value={formatHora(awb.eta)} />
          <Field label="Linea aerea" value={awb.aerolinea} className="col-span-1" small />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="N warehouse" value={awb.warehouse} />
          <Field label="Agente de carga" value={awb.agente_carga} small />
        </div>
      </div>

      {/* Bultos / Kilos */}
      <div className="lg:col-span-2 card p-4 space-y-4">
        <div>
          <div className="label-xs">Bultos</div>
          <div className="mt-2">
            <div className="text-[10px] text-muted">Recibidos</div>
            <div className="data-bold text-xl">{awb.bultos_recibidos}</div>
          </div>
          <div className="mt-2">
            <div className="text-[10px] text-muted">Esperados</div>
            <div className="data-bold text-xl">{awb.bultos_esperados}</div>
          </div>
        </div>
        <div className="border-t border-border pt-3">
          <div className="label-xs">Kilos (kg)</div>
          <div className="mt-2">
            <div className="text-[10px] text-muted">Recibidos</div>
            <div className="data-bold text-xl">{awb.kgs_recibidos?.toFixed(2)}</div>
          </div>
          <div className="mt-2">
            <div className="text-[10px] text-muted">Esperados</div>
            <div className="data-bold text-xl">{awb.kgs_esperados?.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Canal DAM */}
      <div className="lg:col-span-2 card p-4">
        <div className="label-xs">Canal</div>
        <div className="mt-2">
          <div className="text-[10px] text-muted">DAM</div>
          <div className="data-bold text-sm">{awb.canal_dam?.numero || '—'}</div>
        </div>
        <div className="mt-3">
          <div className="text-[10px] text-muted">Agencia de aduana</div>
          <div className="data-bold text-xs leading-tight">{awb.canal_dam?.agencia_aduana || '—'}</div>
        </div>
        <div className="mt-3 space-y-2">
          <div className="flex justify-center">
            <ChannelBadge color={canalColor} />
          </div>
          {awb.canal_dam?.con_levante ? (
            <div className="text-center px-3 py-1 border border-ok rounded-md text-[11px] font-bold text-ok">
              CON LEVANTE
            </div>
          ) : (
            <div className="text-center px-3 py-1 border border-danger rounded-md text-[11px] font-bold text-danger">
              SIN LEVANTE
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, small = false }) {
  return (
    <div>
      <div className="label-xs">{label}</div>
      <div className={`data-bold ${small ? 'text-xs leading-tight' : 'text-sm'}`}>
        {value || '—'}
      </div>
    </div>
  );
}

function formatFecha(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}
function formatHora(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function pad(n) { return String(n).padStart(2, '0'); }
