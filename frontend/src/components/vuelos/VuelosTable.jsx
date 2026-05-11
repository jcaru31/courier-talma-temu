import { useNavigate } from 'react-router-dom';
import ProgressBar from '../shared/ProgressBar.jsx';

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
            <Th>Tipo</Th>
            <Th>ETA</Th>
            <Th>SLA</Th>
            <Th>ULD</Th>
            <Th>Kilos manif.</Th>
            <Th className="min-w-[180px]">Avance de vuelos (bultos)</Th>
            <Th className="min-w-[160px]">Transmisión (guías)</Th>
            <Th>Guías esp.</Th>
            <Th>Ver guías</Th>
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
              <Td><TipoBadge tipo={v.tipo_vuelo} /></Td>
              <Td className="text-xs">
                <div className="data-bold">{formatHora(v.eta)}</div>
                <div className="text-muted">{formatFecha(v.eta)}</div>
              </Td>
              <Td>
                {v.sla_ok ? <SlaOk /> : <SlaWarn />}
              </Td>
              <Td>
                <div className="flex items-center gap-1 data-bold">
                  {v.uld_recibidos}/{v.uld_esperados}
                  <IconArrow />
                </div>
              </Td>
              <Td className="data-bold">{v.kgs_recibidos?.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</Td>
              <Td>
                <ProgressBar value={v.avance_bultos_pct} />
                <div className="text-[10px] text-muted mt-1">
                  ({v.bultos_recibidos}/{v.bultos_esperados})
                </div>
              </Td>
              <Td>
                <ProgressBarYellow value={v.transmision_pct} />
                <div className="text-[10px] text-muted mt-1">
                  {v.transmision_pct}% guías
                </div>
              </Td>
              <Td className="data-bold text-sm">{v.total_awbs}</Td>
              <Td>
                <button
                  onClick={(e) => { e.stopPropagation(); irADetalle(v.manifiesto); }}
                  className="p-2 rounded-md hover:bg-emerald-50 text-ok"
                  title="Ver guias"
                >
                  <IconClipboard />
                </button>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProgressBarYellow({ value }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="relative w-full h-7 bg-slate-100 rounded-md overflow-hidden border border-border">
      <div
        className="h-full bg-warn text-slate-900 flex items-center justify-center transition-all duration-300"
        style={{ width: `${pct}%` }}
      >
        {pct >= 18 && <span className="text-xs font-semibold">{pct}%</span>}
      </div>
      {pct < 18 && (
        <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-slate-600">
          {pct}%
        </span>
      )}
    </div>
  );
}

function TipoBadge({ tipo }) {
  return (
    <span className="text-[11px] font-bold tracking-wider text-slate-700 uppercase">{tipo}</span>
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
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0D2B6B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17l9-9M17 17V8H8" />
    </svg>
  );
}
function IconClipboard() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  );
}

function Th({ children, className = '' }) {
  return <th className={`px-3 py-3 font-semibold ${className}`}>{children}</th>;
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
