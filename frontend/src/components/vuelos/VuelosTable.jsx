import { useNavigate } from 'react-router-dom';
import TrazabilidadCompacta from './TrazabilidadCompacta.jsx';
import AlertasCompactas from './AlertasCompactas.jsx';

const ETAPAS_LABELS = ['Traslado', 'Recepción', 'Transmisiones', 'Almacenamiento', 'Facturación', 'Despacho'];

export default function VuelosTable({ items, loading }) {
  const navigate = useNavigate();
  const irADetalle = (manifiesto) => navigate(`/vuelos/${encodeURIComponent(manifiesto)}`);

  if (loading && items.length === 0) {
    return <div className="card p-12 text-center text-muted">Cargando...</div>;
  }
  if (!loading && items.length === 0) {
    return <div className="card p-12 text-center text-muted">No se encontraron vuelos</div>;
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] tracking-wide uppercase text-muted border-b border-border">
            <Th>Vuelo / Nº Manifiesto</Th>
            <Th>Aerolínea</Th>
            <Th>ETA</Th>
            <Th>SLA</Th>
            <Th>ULD</Th>
            <Th className="min-w-[340px]">
              <div className="text-center mb-1.5">Proceso</div>
              <div className="grid grid-cols-6 text-center text-[9.5px] tracking-wide font-medium normal-case text-slate-500">
                {ETAPAS_LABELS.map((label) => (
                  <div key={label} className="px-0.5 leading-tight">{label}</div>
                ))}
              </div>
            </Th>
            <Th className="min-w-[180px]">Alertas</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody>
          {items.map((v) => (
            <tr
              key={v.manifiesto}
              onClick={() => irADetalle(v.manifiesto)}
              className="border-b border-border hover:bg-slate-50 transition cursor-pointer"
            >
              <Td>
                <div className="data-bold">{v.vuelo}</div>
                <div className="text-[11px] text-muted">{v.manifiesto}</div>
              </Td>
              <Td>
                <span className="text-[11px] font-bold tracking-wider text-slate-700 uppercase">
                  {v.aerolinea_short || v.aerolinea}
                </span>
              </Td>
              <Td className="text-xs">
                <div className="data-bold">{formatHora(v.eta)}</div>
                <div className="text-muted">{formatFecha(v.eta)}</div>
              </Td>
              <Td>{v.sla_ok ? <SlaOk /> : <SlaWarn />}</Td>
              <Td>
                <div className="data-bold tabular-nums">
                  {v.uld_recibidos}/{v.uld_esperados}
                </div>
              </Td>
              <Td>
                <TrazabilidadCompacta trazabilidad={v.trazabilidad} />
              </Td>
              <Td>
                <AlertasCompactas
                  parciales={v.guias_parciales}
                  inmov={v.guias_con_inmov}
                  malEstado={v.guias_con_mal_estado}
                />
              </Td>
              <Td>
                <button
                  onClick={(e) => { e.stopPropagation(); irADetalle(v.manifiesto); }}
                  className="p-2 rounded-md hover:bg-emerald-50 text-ok"
                  title="Ver detalle del vuelo"
                >
                  <IconArrow />
                </button>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SlaOk() {
  return (
    <div className="w-6 h-6 rounded-full border-2 border-ok flex items-center justify-center">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00C853" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
  );
}
function SlaWarn() {
  return (
    <div className="w-6 h-6 rounded-full border-2 border-danger flex items-center justify-center">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#D32F2F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <line x1="6" y1="6" x2="18" y2="18" />
        <line x1="6" y1="18" x2="18" y2="6" />
      </svg>
    </div>
  );
}
function IconArrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17l9-9M17 17V8H8" />
    </svg>
  );
}

function Th({ children, className = '' }) {
  return <th className={`px-3 py-3 font-semibold align-bottom ${className}`}>{children}</th>;
}
function Td({ children, className = '' }) {
  return <td className={`px-3 py-3 align-middle ${className}`}>{children}</td>;
}

function formatFecha(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}
function formatHora(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function pad(n) { return String(n).padStart(2, '0'); }
