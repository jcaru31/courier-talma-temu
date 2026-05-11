import { useNavigate } from 'react-router-dom';

const ESTADOS_INV = {
  OK: { bg: 'bg-emerald-50', border: 'border-ok', text: 'text-ok', label: 'OK' },
  INMOVILIZADO: { bg: 'bg-red-50', border: 'border-danger', text: 'text-danger', label: 'INMOVILIZADO' },
  MAL_ESTADO: { bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-600', label: 'MAL ESTADO' },
};

const ESTADOS_TRACK = {
  RECEPCION: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'RECEPCION' },
  TARJA: { bg: 'bg-indigo-50', text: 'text-indigo-700', label: 'TARJA' },
  ALMACENAMIENTO: { bg: 'bg-sky-50', text: 'text-sky-700', label: 'ALMACENAMIENTO' },
  ADUANAS: { bg: 'bg-violet-50', text: 'text-violet-700', label: 'ADUANAS' },
  DESPACHADO: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'DESPACHADO' },
};

export default function GuiasSimpleTable({ awbs, consignatarioNombre, manifiesto }) {
  const navigate = useNavigate();
  const irADetalleAwb = (id) => navigate(`/awb/${id}`);

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <IconBox />
        <h3 className="text-sm font-semibold tracking-wide text-slate-700 uppercase">
          Guías asociadas
        </h3>
        <span className="text-xs text-muted ml-auto">{awbs.length} guías</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] tracking-wide uppercase text-muted border-b border-border bg-slate-50">
            <Th>Nº Manifiesto / Consignatario</Th>
            <Th>Nº Guía Master</Th>
            <Th>Nº Guía Hija</Th>
            <Th>Estado<br/>Inventario</Th>
            <Th>Estado de Proceso</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody>
          {awbs.map((a) => {
            const inv = ESTADOS_INV[a.estado_inventario] || ESTADOS_INV.OK;
            const trk = ESTADOS_TRACK[a.estado_tracking] || ESTADOS_TRACK.RECEPCION;
            return (
              <tr
                key={a.id}
                onClick={() => irADetalleAwb(a.id)}
                className="border-b border-border hover:bg-slate-50 transition cursor-pointer"
              >
                <Td>
                  <div className="text-xs text-muted">{manifiesto}</div>
                  <div className="data-bold text-sm">{consignatarioNombre || 'PERU BOX S.A.C.'}</div>
                </Td>
                <Td className="data-bold">{a.awb}</Td>
                <Td className="text-xs text-muted">{a.hawb || '—'}</Td>
                <Td>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-md border text-[11px] font-bold ${inv.bg} ${inv.border} ${inv.text}`}>
                    {inv.label}
                    {a.estado_inventario !== 'OK' && <IconInfo />}
                  </span>
                </Td>
                <Td>
                  <span className={`inline-flex items-center px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide ${trk.bg} ${trk.text}`}>
                    {trk.label}
                  </span>
                </Td>
                <Td>
                  <button
                    onClick={(e) => { e.stopPropagation(); irADetalleAwb(a.id); }}
                    className="text-ok hover:opacity-80"
                    title="Ver detalle"
                  >
                    <IconArrow />
                  </button>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children }) {
  return <th className="px-3 py-3 font-semibold leading-tight">{children}</th>;
}
function Td({ children, className = '' }) {
  return <td className={`px-3 py-3 align-middle ${className}`}>{children}</td>;
}
function IconBox() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0D2B6B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}
function IconInfo() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}
function IconArrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17l9-9M17 17V8H8" />
    </svg>
  );
}
