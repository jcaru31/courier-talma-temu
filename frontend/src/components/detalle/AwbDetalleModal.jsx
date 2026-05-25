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
        className={`absolute top-0 right-0 h-full w-full sm:w-[440px] md:w-[560px] lg:w-[680px] max-w-full bg-slate-50 shadow-2xl flex flex-col transform transition-transform duration-250 ease-out ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header sticky compacto */}
        <div className="sticky top-0 z-10 bg-white border-b border-border px-4 py-3">
          {/* Fila 1: título + cerrar */}
          <div className="flex items-start gap-2">
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Tracking Importaciones
              </div>
              <h2 className="text-lg font-bold text-slate-800 tabular-nums leading-tight truncate">
                {awb?.awb || '—'}
              </h2>
            </div>
            <button
              onClick={cerrar}
              className="ml-auto shrink-0 w-8 h-8 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-500"
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
        <div className="flex-1 overflow-y-auto p-4">
          {loading && <div className="card p-12 text-center text-muted">Cargando detalle...</div>}
          {error && <div className="card p-4 border-danger text-danger text-sm">Error: {error}</div>}
          {awb && <AwbDetalleContenido awb={awb} onRefetch={refetch} />}
        </div>
      </div>
    </div>
  );
}

