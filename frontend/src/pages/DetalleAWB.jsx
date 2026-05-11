import { useNavigate, useParams } from 'react-router-dom';
import { useAwbDetail } from '../hooks/useAwbDetail.js';
import HeaderAWB from '../components/detalle/HeaderAWB.jsx';
import AlertaBanner from '../components/detalle/AlertaBanner.jsx';
import TimelineHorizontal from '../components/detalle/TimelineHorizontal.jsx';
import SubeventosColumns from '../components/detalle/SubeventosColumns.jsx';

export default function DetalleAWB() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { awb, loading, error, refetch } = useAwbDetail(id);

  return (
    <div className="p-6 space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/courier')}
            className="flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-md text-sm font-medium hover:bg-navy-700"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Volver
          </button>
          <h1 className="text-base font-semibold text-slate-700">Tracking Importaciones</h1>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-ok text-ok rounded-md text-sm font-medium hover:bg-emerald-50">
            Enviar por correo
            <IconSend />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-border text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50">
            Descargar
            <IconDownload />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-navy text-navy rounded-md text-sm font-medium hover:bg-blue-50">
            Servicios intermedios
            <IconExternal />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading && (
        <div className="card p-12 text-center text-muted">Cargando detalle...</div>
      )}
      {error && (
        <div className="card p-4 border-danger text-danger text-sm">Error: {error}</div>
      )}
      {awb && (
        <>
          {/* Banner alertas */}
          <AlertaBanner alertas={awb.alertas_activas} onNotificado={refetch} />

          {/* Header con datos */}
          <HeaderAWB awb={awb} />

          {/* Timeline horizontal */}
          <TimelineHorizontal timeline={awb.timeline} />

          {/* Subeventos en columnas debajo */}
          <SubeventosColumns timeline={awb.timeline} />
        </>
      )}
    </div>
  );
}

function IconSend() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
function IconDownload() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  );
}
function IconExternal() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17l9-9M17 17V8H8" />
    </svg>
  );
}
