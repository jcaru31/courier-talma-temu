import { useNavigate } from 'react-router-dom';
import ProgressBar from '../shared/ProgressBar.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import ChannelBadge from '../shared/ChannelBadge.jsx';
import AlertasBadge from '../shared/AlertasBadge.jsx';

export default function AwbTable({ items, loading }) {
  const navigate = useNavigate();
  const irADetalle = (id) => navigate(`/awb/${id}`);
  if (loading && items.length === 0) {
    return <div className="card p-12 text-center text-muted">Cargando...</div>;
  }
  if (!loading && items.length === 0) {
    return <div className="card p-12 text-center text-muted">No se encontraron guias</div>;
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] tracking-wide uppercase text-muted border-b border-border">
            <Th>AWB / Vuelo</Th>
            <Th>Aerolinea</Th>
            <Th>Origen</Th>
            <Th>ETA</Th>
            <Th className="min-w-[180px]">Bultos rec / esp</Th>
            <Th className="min-w-[180px]">KGs rec / esp</Th>
            <Th className="min-w-[140px]">Tarja</Th>
            <Th>Canal</Th>
            <Th>Alertas</Th>
            <Th>Status</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody>
          {items.map((awb) => (
            <tr
              key={awb.id}
              onClick={() => irADetalle(awb.id)}
              className="border-b border-border hover:bg-slate-50 transition cursor-pointer"
            >
              <Td>
                <div className="data-bold">{awb.awb}</div>
                <div className="text-[11px] text-muted">{awb.vuelo}</div>
                <div className="text-[10px] text-slate-400">{awb.manifiesto}</div>
              </Td>
              <Td className="text-xs">{awb.aerolinea}</Td>
              <Td className="font-semibold">{awb.origen}</Td>
              <Td className="text-xs">
                <div>{formatFecha(awb.eta)}</div>
                <div className="text-muted">{formatHora(awb.eta)}</div>
              </Td>
              <Td>
                <ProgressBar value={awb.bultos_porcentaje} />
                <div className="text-[10px] text-muted mt-1">
                  {awb.bultos_recibidos} / {awb.bultos_esperados}
                </div>
              </Td>
              <Td>
                <ProgressBar value={awb.kgs_porcentaje} />
                <div className="text-[10px] text-muted mt-1">
                  {awb.kgs_recibidos.toFixed(1)} / {awb.kgs_esperados.toFixed(1)} kg
                </div>
              </Td>
              <Td>
                <ProgressBar value={awb.tarja_porcentaje} />
              </Td>
              <Td><ChannelBadge color={awb.canal_dam?.color} /></Td>
              <Td><AlertasBadge count={awb.alertas_count} /></Td>
              <Td><StatusBadge status={awb.status} /></Td>
              <Td>
                <button
                  onClick={(e) => { e.stopPropagation(); irADetalle(awb.id); }}
                  className="text-navy hover:text-navy-700"
                  title="Ver detalle"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 17l9-9M17 17V8H8" />
                  </svg>
                </button>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, className = '' }) {
  return <th className={`px-3 py-3 font-semibold ${className}`}>{children}</th>;
}

function Td({ children, className = '' }) {
  return <td className={`px-3 py-3 align-top ${className}`}>{children}</td>;
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

function pad(n) {
  return String(n).padStart(2, '0');
}
