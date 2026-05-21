import { useEffect, useState } from 'react';
import { useAwbDetail } from '../../hooks/useAwbDetail.js';
import AwbDetalleContenido from './AwbDetalleContenido.jsx';

/**
 * Panel lateral derecho con el detalle completo de una guía (Vista 3). Se
 * abre al seleccionar una guía en la tabla. El encabezado simplificado evita
 * repetir información ya visible en la lista y el detalle del vuelo.
 */
export default function AwbDetalleModal({ awbId, onClose }) {
  const { awb, loading, error, refetch } = useAwbDetail(awbId);
  const [visible, setVisible] = useState(false);

  // Slide-in al montar.
  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  // Cierre con animación: oculta el panel, luego llama onClose.
  const cerrar = () => {
    setVisible(false);
    setTimeout(onClose, 250);
  };

  useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape') cerrar(); };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50" aria-modal="true">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-slate-900/40 transition-opacity duration-200 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={cerrar}
      />

      {/* Panel lateral derecho */}
      <div
        className={`absolute top-0 right-0 h-full w-full sm:w-[88%] lg:w-[82%] xl:w-[1400px] max-w-full bg-slate-50 shadow-2xl flex flex-col transform transition-transform duration-250 ease-out ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header sticky */}
        <div className="sticky top-0 z-10 bg-white border-b border-border px-5 py-3 flex items-center gap-3">
          <h2 className="text-base font-semibold text-slate-700">
            Tracking Importaciones
            {awb?.awb && <span className="text-slate-400 font-normal"> — {awb.awb}</span>}
          </h2>
          <div className="ml-auto flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-ok text-ok rounded-md text-[12px] font-medium hover:bg-emerald-50">
              Enviar por correo <IconSend />
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-slate-700 rounded-md text-[12px] font-medium hover:bg-slate-50">
              Descargar <IconDownload />
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-navy text-navy rounded-md text-[12px] font-medium hover:bg-blue-50">
              Servicios intermedios <IconExternal />
            </button>
            <button
              onClick={cerrar}
              className="w-8 h-8 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-500"
              aria-label="Cerrar"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="6" y1="18" x2="18" y2="6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Cuerpo scrollable */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading && <div className="card p-12 text-center text-muted">Cargando detalle...</div>}
          {error && <div className="card p-4 border-danger text-danger text-sm">Error: {error}</div>}
          {awb && <AwbDetalleContenido awb={awb} onRefetch={refetch} />}
        </div>
      </div>
    </div>
  );
}

function IconSend() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
function IconDownload() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  );
}
function IconExternal() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17l9-9M17 17V8H8" />
    </svg>
  );
}
