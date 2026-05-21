import { useEffect } from 'react';

/**
 * Modal con la información de la Numeración del Manifiesto de carga (a nivel
 * vuelo). Replica los campos del manifiesto de carga aduanero.
 */
export default function ManifiestoModal({ vuelo, onClose }) {
  useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose]);

  if (!vuelo) return null;
  const mc = vuelo.manifiesto_carga || {};

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-xl border border-border shadow-2xl w-full max-w-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3 border-b border-border flex items-center gap-3">
          <IconClipboard />
          <div>
            <div className="text-base font-bold text-slate-900 leading-tight">
              Numeración del Manifiesto
            </div>
            <div className="text-[11px] text-muted">
              Manifiesto de carga · Vuelo {vuelo.vuelo}
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-auto w-8 h-8 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-500"
            aria-label="Cerrar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="6" y1="18" x2="18" y2="6" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-auto">
          {/* Manifiesto */}
          <Seccion titulo="Manifiesto">
            <Campo label="Número de Manifiesto" valor={mc.numero_manifiesto || vuelo.manifiesto} destacado />
            <Campo label="Código de Transportista" valor={mc.codigo_transportista} />
            <Campo label="Tipo Medio de Transporte" valor={mc.tipo_medio_transporte} />
          </Seccion>

          {/* Aeronave */}
          <Seccion titulo="Aeronave y tripulación">
            <Campo label="Nº Vuelo" valor={vuelo.vuelo} />
            <Campo label="Matrícula" valor={mc.matricula || vuelo.matricula} />
            <Campo label="Capitán de la Nave" valor={mc.capitan} />
            <Campo label="Identidad del Capitán" valor={mc.identidad_capitan} />
          </Seccion>

          {/* Ruta */}
          <Seccion titulo="Ruta y zarpe">
            <Campo label="Puerto de Zarpe" valor={mc.puerto_zarpe} />
            <Campo label="Fecha y Hora de Zarpe" valor={formatFechaHora(mc.fecha_zarpe)} />
            <Campo label="Puerto Intermedio" valor={mc.puerto_intermedio} />
            <Campo label="Fecha de Zarpe del Puerto Intermedio" valor={formatFechaHora(mc.fecha_zarpe_intermedio)} />
            <Campo label="Fecha y Hora Estimada de Llegada" valor={formatFechaHora(mc.fecha_estimada_llegada || vuelo.eta)} destacado />
          </Seccion>

          {/* Descarga */}
          <Seccion titulo="Lugar de descarga">
            <Campo label="Tipo Lugar de Descarga" valor={mc.tipo_lugar_descarga} />
            <Campo label="Lugar de Descarga" valor={mc.lugar_descarga} />
          </Seccion>

          {/* Hito Trasmisión Aerolínea */}
          <Seccion titulo="Hito Trasmisión Aerolínea">
            <Campo label="Numeración del Manifiesto" valor={formatFechaHora(mc.fecha_numeracion)} />
            <Campo
              label="Incorporación de guías"
              valor={formatFechaHora(mc.fecha_incorporacion_guias)}
              sub={`${vuelo.total_awbs ?? '—'} guías manifestadas`}
            />
          </Seccion>
        </div>
      </div>
    </div>
  );
}

function Seccion({ titulo, children }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted font-bold mb-2">{titulo}</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">{children}</div>
    </div>
  );
}

function Campo({ label, valor, sub, destacado = false }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">{label}</span>
      <span className={`text-sm font-bold mt-0.5 ${destacado ? 'text-navy' : 'text-slate-800'}`}>
        {valor || <span className="text-slate-300 font-normal">— sin dato —</span>}
      </span>
      {sub && <span className="text-[10px] text-slate-500">{sub}</span>}
    </div>
  );
}

function IconClipboard() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0D2B6B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <path d="M9 11h6M9 15h4" />
    </svg>
  );
}

function formatFechaHora(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
