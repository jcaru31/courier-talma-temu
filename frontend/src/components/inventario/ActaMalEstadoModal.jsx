import { useEffect, useState } from 'react';

// Las fotos y el PDF se sirven via /actas/* (ver vite.config.js proxy +
// backend/src/server.js static handler).

/**
 * Modal del acta de carga arribada en mal estado (ACM). Layout escogido:
 * datos estructurados arriba (manifiesto / vuelo / totales / tipo de daño) +
 * carrusel de fotos + botón "Descargar PDF" para el formato original. Pensado
 * para acceder rápido a la info de mal estado sin tener que abrir el PDF.
 */
export default function ActaMalEstadoModal({ acta, awb, onClose }) {
  const [foto, setFoto] = useState(0);

  // ESC cierra el modal.
  useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose]);

  if (!acta) return null;
  const fotos = acta.fotos || [];
  const total = fotos.length;
  const prev = () => setFoto((i) => (i - 1 + total) % total);
  const next = () => setFoto((i) => (i + 1) % total);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
      aria-modal="true"
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3 border-b border-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-red-50 border border-red-200 flex items-center justify-center text-danger shrink-0">
            <IconWarning />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">
              Acta de carga en mal estado
            </div>
            <h2 className="text-base font-bold text-slate-800 leading-tight">
              N° {acta.numero_acta}
              {awb && <span className="text-slate-400 font-normal"> · {awb}</span>}
            </h2>
          </div>
          <a
            href={`${acta.pdf}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 border border-navy text-navy rounded-md text-[12px] font-medium hover:bg-blue-50"
          >
            Descargar PDF <IconDownload />
          </a>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-500"
            aria-label="Cerrar"
          >
            <IconClose />
          </button>
        </div>

        {/* Body scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Cabecera del acta — campos administrativos */}
          <div className="grid grid-cols-6 gap-3 rounded-md border border-border bg-slate-50 p-3">
            <Campo label="Manifiesto" value={acta.manifiesto} mono />
            <Campo label="Fecha ingreso" value={formatFecha(acta.fecha_ingreso)} mono />
            <Campo label="Vuelo" value={acta.vuelo} mono />
            <Campo label="Guía Madre" value={acta.guia_madre} mono />
            <Campo label="Guía Hija" value={acta.guia_hija} mono />
            <Campo label="N° Detalle" value={acta.n_detalle} mono />
          </div>

          {/* Totales: bultos y peso (rec / mal / buen) */}
          <div className="grid grid-cols-6 gap-3">
            <Stat label="Total bultos"      value={acta.totales.bultos_total} />
            <Stat label="Mal estado"        value={acta.totales.bultos_mal_estado} tone="danger" />
            <Stat label="Buen estado"       value={acta.totales.bultos_buen_estado} tone="ok" />
            <Stat label="Peso total"        value={fmtKg(acta.totales.peso_total)} suffix="kg" />
            <Stat label="Peso mal estado"   value={fmtKg(acta.totales.peso_mal_estado)} suffix="kg" tone="danger" />
            <Stat label="Peso buen estado"  value={fmtKg(acta.totales.peso_buen_estado)} suffix="kg" tone="ok" />
          </div>

          {/* Descripción del daño */}
          <div className="rounded-md border border-border bg-white p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-2">
              Descripción del contenido
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <Linea label="Consignatario"      value={acta.consignatario} />
              <Linea label="Contenido manif."   value={acta.contenido_manifestado} />
              <Linea label="Tipo de bulto"      value={acta.descripcion.tipo_bulto} />
              <Linea label="Material envase"    value={acta.descripcion.material_envase} />
              <Linea label="Tipo de daño"       value={acta.descripcion.tipo_dano} tone="danger" />
              <Linea label="Acción tomada"      value={acta.descripcion.accion_tomada} />
              <Linea label="Motivo"             value={acta.descripcion.motivo} />
            </div>
            {acta.descripcion.observaciones && (
              <div className="mt-3 pt-3 border-t border-border">
                <div className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-1">
                  Observaciones
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {acta.descripcion.observaciones}
                </p>
              </div>
            )}
          </div>

          {/* Carrusel de fotos */}
          {total > 0 && (
            <div className="rounded-md border border-border bg-white overflow-hidden">
              <div className="px-4 py-2 border-b border-border flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">
                  Fotos del estado de la guía
                </div>
                <div className="text-[11px] text-slate-500 tabular-nums">
                  {foto + 1} / {total}
                </div>
              </div>
              <div className="relative bg-slate-100 flex items-center justify-center" style={{ height: 380 }}>
                <FotoVisor src={`${fotos[foto]}`} alt={`Foto ${foto + 1}`} />
                {total > 1 && (
                  <>
                    <button
                      onClick={prev}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 border border-border shadow-sm hover:bg-white flex items-center justify-center text-slate-700"
                      aria-label="Anterior"
                    >
                      <IconChevron dir="left" />
                    </button>
                    <button
                      onClick={next}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 border border-border shadow-sm hover:bg-white flex items-center justify-center text-slate-700"
                      aria-label="Siguiente"
                    >
                      <IconChevron dir="right" />
                    </button>
                  </>
                )}
              </div>
              {/* Thumbnails */}
              <div className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 border-t border-border">
                {fotos.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setFoto(i)}
                    className={`w-12 h-12 rounded border-2 overflow-hidden bg-slate-200 transition ${
                      i === foto ? 'border-navy shadow-sm' : 'border-transparent hover:border-slate-300'
                    }`}
                    aria-label={`Ver foto ${i + 1}`}
                  >
                    <FotoVisor src={`${src}`} alt={`Miniatura ${i + 1}`} thumb />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Visor con fallback cuando la imagen aun no fue subida al backend.
function FotoVisor({ src, alt, thumb = false }) {
  const [err, setErr] = useState(false);
  if (err) {
    return (
      <div className={`flex flex-col items-center justify-center text-slate-400 ${thumb ? 'w-full h-full' : 'p-8'}`}>
        {!thumb && <IconImageOff />}
        {!thumb && <span className="text-[11px] mt-2 text-center">Foto pendiente de carga</span>}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setErr(true)}
      className={thumb ? 'w-full h-full object-cover' : 'max-h-full max-w-full object-contain'}
    />
  );
}

function Campo({ label, value, mono = false }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">
        {label}
      </span>
      <span className={`text-[12px] font-bold text-slate-800 mt-0.5 ${mono ? 'tabular-nums' : ''}`}>
        {value ?? '—'}
      </span>
    </div>
  );
}

function Stat({ label, value, suffix, tone = 'default' }) {
  const cls = tone === 'danger'
    ? 'border-red-200 bg-red-50 text-danger'
    : tone === 'ok'
    ? 'border-emerald-200 bg-emerald-50 text-ok'
    : 'border-border bg-white text-slate-800';
  return (
    <div className={`rounded-md border p-3 ${cls}`}>
      <div className="text-[9px] uppercase tracking-wider font-semibold opacity-70">{label}</div>
      <div className="text-lg font-bold tabular-nums leading-tight mt-0.5">
        {value ?? '—'}
        {suffix && <span className="text-[10px] font-medium ml-1 opacity-70">{suffix}</span>}
      </div>
    </div>
  );
}

function Linea({ label, value, tone = 'default' }) {
  const cls = tone === 'danger' ? 'text-danger' : 'text-slate-800';
  return (
    <div className="flex gap-2 leading-tight">
      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold min-w-[110px] mt-0.5 shrink-0">
        {label}
      </span>
      <span className={`text-[13px] font-semibold ${cls}`}>{value ?? '—'}</span>
    </div>
  );
}

function fmtKg(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString('es-PE', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
}
function formatFecha(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function IconWarning() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2 1 21h22L12 2zm0 6 6 11H6l6-11zm-1 4v3h2v-3h-2zm0 4v2h2v-2h-2z" />
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
function IconClose() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="6" y1="18" x2="18" y2="6" />
    </svg>
  );
}
function IconChevron({ dir }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: dir === 'left' ? 'rotate(180deg)' : '' }}>
      <polyline points="9 6 15 12 9 18" />
    </svg>
  );
}
function IconImageOff() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="2" y1="2" x2="22" y2="22" />
      <path d="M10.41 10.41a2 2 0 1 1-2.83-2.83" />
      <line x1="13.5" y1="13.5" x2="6" y2="21" />
      <line x1="18" y1="12" x2="21" y2="15" />
      <path d="M3.59 3.59A1.99 1.99 0 0 0 3 5v14a2 2 0 0 0 2 2h14c.55 0 1.05-.22 1.41-.59" />
      <path d="M21 15V5a2 2 0 0 0-2-2H9" />
    </svg>
  );
}
