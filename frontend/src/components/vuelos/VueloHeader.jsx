import MiniTrazabilidad from './MiniTrazabilidad.jsx';
import { IconoAlerta } from './alertaIconos.jsx';

/**
 * Header del vuelo compacto. Columna izquierda con info del vuelo.
 * Columna derecha apila: trazabilidad (top) + chips de alertas (bottom),
 * todo dentro del mismo bloque para no dejar espacios en blanco.
 * NOTA: META oculta por decision del cliente (TEMU) — ver memoria del proyecto.
 */
export default function VueloHeader({
  vuelo,
  etapaActiva = null,
  onEtapaClick = () => {},
  alertaActiva = null,
  onAlertaClick = () => {},
  onAbrirManifiesto = () => {},
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
            <button
              onClick={onAbrirManifiesto}
              className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-semibold text-navy bg-blue-50 border border-navy/30 rounded-md px-2.5 py-1 hover:bg-blue-100 transition"
              title="Ver numeración del manifiesto de carga"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="4" width="12" height="17" rx="2" />
                <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
                <path d="M9 11h6M9 15h4" />
              </svg>
              MNF {vuelo.manifiesto}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-x-3 gap-y-3 pt-0.5">
            <Cell label="Origen" value={vuelo.origen} big />
            <Cell label="Destino" value={vuelo.destino} big />
            <Cell label="Arribo" value={formatFechaHora(vuelo.eta)} />
            <CellRatio label="Bultos" rec={vuelo.bultos_recibidos} man={vuelo.bultos_esperados} />
            <CellRatio label="Kilos" rec={formatKg(vuelo.kgs_recibidos)} man={formatKg(vuelo.kgs_esperados)} />
            <Cell label="Guías" value={vuelo.total_awbs} />
          </div>
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

/** Celda con ratio recibido / manifestado (bultos, kilos). */
function CellRatio({ label, rec, man }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-[10px] uppercase tracking-wider text-muted font-semibold">
        {label} <span className="text-slate-400 normal-case font-medium">rec / man</span>
      </span>
      <span className="text-sm font-bold text-slate-900 mt-0.5 tracking-tight tabular-nums">
        {rec ?? '—'}
        <span className="text-slate-400 font-medium"> / {man ?? '—'}</span>
      </span>
    </div>
  );
}

// Chip de alerta compacto "gerencial": icono + número en el color de la alerta.
// El nombre y la acción de filtro van en el tooltip (sin etiqueta de texto).
function AlertChip({ tipo, label, value, accent, activa, onClick }) {
  const hayValor = value > 0;
  const TEXT = {
    violet: 'text-violet-700',
    amber: 'text-amber-700',
    orange: 'text-orange-600',
    red: 'text-danger',
  };
  const ACTIVE = {
    violet: 'bg-violet-50 ring-violet-500',
    amber: 'bg-amber-50 ring-amber-500',
    orange: 'bg-orange-50 ring-orange-500',
    red: 'bg-red-50 ring-red-500',
  };

  const handle = () => { if (hayValor) onClick(activa ? null : tipo); };

  return (
    <button
      type="button"
      onClick={handle}
      disabled={!hayValor}
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 leading-none transition ${
        hayValor ? TEXT[accent] : 'text-slate-300'
      } ${activa ? 'ring-2 ' + ACTIVE[accent] : hayValor ? 'hover:bg-slate-100' : ''} ${
        hayValor ? 'cursor-pointer' : 'cursor-not-allowed'
      }`}
      title={hayValor ? `${label}: ${value} — clic para filtrar guías` : `${label}: 0`}
    >
      <IconoAlerta tipo={tipo} size={15} />
      <span className="text-sm font-bold tabular-nums">{value}</span>
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
