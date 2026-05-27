import { useEffect, useMemo, useState } from 'react';

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
  const [grupoIdx, setGrupoIdx] = useState(0);

  // ESC cierra el modal.
  useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose]);

  // Grupos del acta: cada grupo es un conjunto de bultos con su propio tipo
  // de daño, material, observación, etc. Una guía puede tener varios grupos
  // (ver formato original del ACM SUNAT — códigos tipo 220204, 220185).
  // Compatibilidad hacia atrás: si el acta solo tiene `descripcion` plana,
  // lo envolvemos en un grupo único; el código del grupo se deriva de los
  // últimos 6 dígitos del N° de acta (formato realista, estable entre renders).
  // Cuando los datos traigan `descripcion.grupos` reales, el selector navega
  // entre todos sin más cambios.
  const grupos = useMemo(() => {
    const gs = acta?.descripcion?.grupos;
    if (Array.isArray(gs) && gs.length > 0) return gs;
    if (!acta) return [];
    const codigo = String(acta.numero_acta || '').replace(/\D/g, '').slice(-6) || '000001';
    return [{
      numero: codigo,
      bultos: acta.totales?.bultos_mal_estado,
      tipo_bulto: acta.descripcion?.tipo_bulto,
      material_envase: acta.descripcion?.material_envase,
      tipo_dano: acta.descripcion?.tipo_dano,
      accion_tomada: acta.descripcion?.accion_tomada,
      motivo: acta.descripcion?.motivo,
      observaciones: acta.descripcion?.observaciones,
    }];
  }, [acta]);

  if (!acta) return null;
  const fotos = acta.fotos || [];
  const total = fotos.length;
  const prev = () => setFoto((i) => (i - 1 + total) % total);
  const next = () => setFoto((i) => (i + 1) % total);
  const grupo = grupos[grupoIdx] || grupos[0];

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
              Mal estado
            </div>
            <h2 className="text-base font-bold text-slate-800 leading-tight">
              Acta N° <span className="tabular-nums">{acta.numero_acta}</span>
              {awb && <span className="text-slate-400 font-normal"> · Guía {awb}</span>}
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

        {/* Body scrollable. Jerarquía: totales arriba (lo crítico),
            descripción + galería lado a lado (aprovecha el ancho), y
            metadatos administrativos como tira sutil al pie. */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* 1) Totales — full width, lo primero que el usuario ve */}
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
            <Stat label="Total bultos"      value={acta.totales.bultos_total} />
            <Stat label="Mal estado"        value={acta.totales.bultos_mal_estado} tone="danger" />
            <Stat label="Buen estado"       value={acta.totales.bultos_buen_estado} tone="ok" />
            <Stat label="Peso total"        value={fmtKg(acta.totales.peso_total)} suffix="kg" />
            <Stat label="Peso mal estado"   value={fmtKg(acta.totales.peso_mal_estado)} suffix="kg" tone="danger" />
            <Stat label="Peso buen estado"  value={fmtKg(acta.totales.peso_buen_estado)} suffix="kg" tone="ok" />
          </div>

          {/* 2) Descripción + Galería lado a lado en desktop. En mobile,
              stack vertical (descripción arriba). */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Descripción del daño. Contenido manifestado es global del acta;
                el resto pertenece al grupo activo. El selector de grupos vive
                arriba — cada grupo describe un conjunto de bultos con su
                propio tipo de daño, observación, etc. */}
            <div className="rounded-md border border-border bg-white p-4 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">
                  Descripción del contenido
                </div>
                {grupos.length > 0 && (
                  <div className="text-[10px] text-slate-400 tabular-nums">
                    {grupos.length === 1 ? '1 grupo' : `${grupoIdx + 1} / ${grupos.length} grupos`}
                  </div>
                )}
              </div>
              <Linea label="Contenido manif." value={acta.contenido_manifestado} />

              {/* Selector de grupos: pills horizontales con scroll si son muchos.
                  Cada pill = un grupo con su propio daño. Habilitadas todas. */}
              <div className="mt-3 -mx-1 px-1 flex items-center gap-1.5 overflow-x-auto">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold mr-1 shrink-0">
                  Grupo
                </span>
                {grupos.map((g, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setGrupoIdx(i)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold tabular-nums transition shrink-0 ${
                      i === grupoIdx
                        ? 'bg-navy text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                    title={`Ver descripción del grupo ${g.numero || i + 1}`}
                  >
                    {g.numero || i + 1}
                    {g.bultos != null && (
                      <span className={`ml-1.5 text-[9px] font-semibold ${i === grupoIdx ? 'opacity-80' : 'opacity-60'}`}>
                        · {g.bultos} blt
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-1 gap-y-2 text-sm">
                <Linea label="Tipo de bulto"      value={grupo?.tipo_bulto} />
                <Linea label="Material envase"    value={grupo?.material_envase} />
                <Linea label="Tipo de daño"       value={grupo?.tipo_dano} tone="danger" />
                <Linea label="Acción tomada"      value={grupo?.accion_tomada} />
                <Linea label="Motivo"             value={grupo?.motivo} />
              </div>
              {grupo?.observaciones && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-1">
                    Observaciones
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {grupo.observaciones}
                  </p>
                </div>
              )}
            </div>

            {/* Galería tipo carrusel: track con todas las fotos, traslada con
                transform según `foto`. Soporta wrap (next desde la última →
                primera) y wrap inverso (prev desde 0 → última). */}
            {total > 0 && (
              <CarruselFotos fotos={fotos} foto={foto} setFoto={setFoto} prev={prev} next={next} />
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

/**
 * Carrusel de fotos. Mantiene todas las imágenes montadas en un track
 * horizontal (`flex w-full`); el cambio entre fotos es un `translateX(-N*100%)`
 * con transición CSS — animación fluida, sin recargar imágenes ni recortes.
 * Pre-carga la siguiente y la anterior para que el slide sea instantáneo.
 */
function CarruselFotos({ fotos, foto, setFoto, prev, next }) {
  const total = fotos.length;
  return (
    <div className="rounded-md border border-border bg-white overflow-hidden flex flex-col min-w-0">
      <div className="px-4 py-2 border-b border-border flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">
          Fotos del estado de la guía
        </div>
        <div className="text-[11px] text-slate-500 tabular-nums">
          {foto + 1} / {total}
        </div>
      </div>
      {/* Viewport del carrusel: overflow-hidden recorta lo que sobresale, el
          track desliza dentro. Fórmula confiable: track con width = N×100% del
          viewport; cada slide width = 100/N% del track (= 100% del viewport).
          translateX(-i × 100/N %) avanza al slide i con la animación. */}
      <div className="relative bg-slate-100 overflow-hidden" style={{ height: 320 }}>
        <div
          className="flex h-full transition-transform duration-500"
          style={{
            width: `${total * 100}%`,
            transform: `translate3d(-${foto * (100 / total)}%, 0, 0)`,
            transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          {fotos.map((src, i) => (
            <div
              key={i}
              className="h-full flex items-center justify-center px-2"
              style={{ width: `${100 / total}%` }}
            >
              <FotoVisor src={src} alt={`Foto ${i + 1}`} />
            </div>
          ))}
        </div>
        {total > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 border border-border shadow-sm hover:bg-white flex items-center justify-center text-slate-700"
              aria-label="Anterior"
            >
              <IconChevron dir="left" />
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 border border-border shadow-sm hover:bg-white flex items-center justify-center text-slate-700"
              aria-label="Siguiente"
            >
              <IconChevron dir="right" />
            </button>
          </>
        )}
        {/* Dots indicators centrados en la base del viewport */}
        {total > 1 && total <= 8 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {fotos.map((_, i) => (
              <button
                key={i}
                onClick={() => setFoto(i)}
                aria-label={`Ir a foto ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === foto ? 'w-5 bg-white shadow' : 'w-1.5 bg-white/60 hover:bg-white/90'
                }`}
              />
            ))}
          </div>
        )}
      </div>
      {/* Thumbnails con scroll horizontal si son muchas. */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border-t border-border overflow-x-auto">
        {fotos.map((src, i) => (
          <button
            key={i}
            onClick={() => setFoto(i)}
            className={`w-11 h-11 rounded border-2 overflow-hidden bg-slate-200 transition shrink-0 ${
              i === foto ? 'border-navy shadow-sm' : 'border-transparent hover:border-slate-300'
            }`}
            aria-label={`Ver foto ${i + 1}`}
          >
            <FotoVisor src={src} alt={`Miniatura ${i + 1}`} thumb />
          </button>
        ))}
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
  return Number(n).toLocaleString('es-PE', { minimumFractionDigits: 1, maximumFractionDigits: 1, useGrouping: false });
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
