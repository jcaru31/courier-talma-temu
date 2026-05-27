import { useEffect } from 'react';

// El PDF del volante se sirve via /actas/* (mismo handler estático que las
// actas — ver vite.config.js proxy + backend/src/server.js).
const VOLANTE_PDF = '/actas/volante-original.pdf';

/**
 * Modal de Aviso de llegada (Volante TALMA). Es el documento de conciliación
 * de carga; el detalle del mal estado vive en el Acta (link al pie cuando
 * existe). Aquí mostramos: cabecera mínima (volante / vuelo / agente / ETA)
 * y la tabla de conciliación Manifiesto / Recibido / Bueno / Faltos /
 * Sobrantes — sin la columna "Malos" para no duplicar lo del Acta.
 */
export default function VolanteModal({ awb, onClose }) {
  useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose]);

  if (!awb) return null;

  const r = reconciliacion(awb);
  const acta = awb.acta_mal_estado;
  const codigo = volanteCodigo(awb);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
      aria-modal="true"
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — el N° de volante es el identificador del documento, va prominente.
            El AWB queda como contexto. El consignatario vive en la tira metadata
            al pie para no duplicarlo. */}
        <div className="px-5 py-3 border-b border-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center text-navy shrink-0">
            <IconVolante />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">
              Aviso de llegada
            </div>
            <h2 className="text-base font-bold text-slate-800 leading-tight">
              Volante N° <span className="tabular-nums">{codigo}</span>
              <span className="text-slate-400 font-normal"> · Guía {awb.awb}</span>
            </h2>
          </div>
          <a
            href={VOLANTE_PDF}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 border border-navy text-navy rounded-md text-[12px] font-medium hover:bg-blue-50"
          >
            Ver PDF <IconDownload />
          </a>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-500"
            aria-label="Cerrar"
          >
            <IconClose />
          </button>
        </div>

        {/* Body — el volante = conciliación de carga. La protagonista es la tabla.
            Los metadatos administrativos viven como tira sutil al pie. */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Conciliación Manifiesto / Recibido / Bueno / Faltos / Sobrantes.
              Sin columna "Malos": el desglose de daño vive en el Acta. */}
          <div className="rounded-md border border-border bg-white overflow-hidden">
            <div className="px-4 py-2 border-b border-border text-[10px] uppercase tracking-wider text-muted font-semibold">
              Conciliación de carga
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted font-semibold bg-slate-50 border-b border-border">
                  <th className="px-3 py-2 text-left"></th>
                  <th className="px-3 py-2 text-right">Manifiesto</th>
                  <th className="px-3 py-2 text-right">Recibido</th>
                  <th className="px-3 py-2 text-right text-ok">Bueno</th>
                  <th className="px-3 py-2 text-right text-violet-700">Faltos</th>
                  <th className="px-3 py-2 text-right text-amber-700">Sobrantes</th>
                </tr>
              </thead>
              <tbody>
                <FilaConcil label="Bultos" d={r.bultos} />
                <FilaConcil label="Kilos" d={r.kilos} decimals={2} />
              </tbody>
            </table>
          </div>

          {/* Pista del Acta cuando aplica: tarjeta de alerta. Sin acta, mostramos
              la fórmula corta para que se entienda la tabla. */}
          {acta ? (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50/60 px-3 py-2.5">
              <span className="text-danger mt-0.5 shrink-0">
                <IconWarningSmall />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold text-danger leading-tight">
                  Esta guía tiene Acta de mal estado N° {acta.numero_acta}
                </div>
                <p className="text-[11px] text-slate-600 leading-snug mt-0.5">
                  El detalle de los bultos en mal estado (tipo de daño, peso y fotos)
                  vive en el Acta — ciérrala y ábrelo desde la columna "Mal estado".
                </p>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Bueno = Recibido · Faltos = lo no arribado vs. manifiesto ·
              Sobrantes = excedente sobre lo manifestado.
            </p>
          )}

          {/* Metadatos administrativos al pie — mismo patrón que el Acta. La
              fecha de ingreso = inicio del hito de recepción (cuando el almacén
              recibió la carga); fallback al acta cuando exista. */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-md bg-slate-50 px-3 py-2 text-[11px]">
            <MetaDato label="Consignatario" value={awb.consignatario_nombre} mono={false} />
            <MetaDato label="Fecha de ingreso" value={formatFecha(fechaIngreso(awb))} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Conciliación del volante: Manifiesto / Recibido / Bueno / Faltos /
// Sobrantes. "Bueno" sigue siendo lo arribado sin daño (Recibido − Malos),
// pero los Malos como tal viven en el Acta, no aquí.
function reconciliacion(a) {
  const espB = a.bultos_esperados ?? 0;
  const recB = a.bultos_recibidos ?? 0;
  const malB = a.bultos_mal_estado || 0;
  const faltB = a.bultos_faltantes || 0;
  const sobB = Math.max(0, recB - espB);
  const buenB = Math.max(0, recB - malB);

  const espK = a.kgs_esperados ?? 0;
  const recK = a.kgs_recibidos ?? 0;
  const malK = a.acta_mal_estado?.totales?.peso_mal_estado || 0;
  const faltK = +Math.max(0, espK - recK).toFixed(2);
  const sobK = +Math.max(0, recK - espK).toFixed(2);
  const buenK = +Math.max(0, recK - malK).toFixed(2);

  return {
    bultos: { manifiesto: espB, recibido: recB, bueno: buenB, faltos: faltB, sobrantes: sobB },
    kilos: { manifiesto: espK, recibido: recK, bueno: buenK, faltos: faltK, sobrantes: sobK },
  };
}

function FilaConcil({ label, d, decimals = 0 }) {
  const f = (n) => (decimals > 0 ? Number(n).toLocaleString('es-PE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: false }) : n);
  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-3 py-2.5 text-[10px] uppercase tracking-wider text-slate-500 font-bold">{label}</td>
      <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-slate-700">{f(d.manifiesto)}</td>
      <td className="px-3 py-2.5 text-right tabular-nums font-bold text-slate-900">{f(d.recibido)}</td>
      <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-ok">{f(d.bueno)}</td>
      <td className="px-3 py-2.5 text-right tabular-nums font-bold"><Cifra v={d.faltos} f={f} tone="violet" /></td>
      <td className="px-3 py-2.5 text-right tabular-nums font-bold"><Cifra v={d.sobrantes} f={f} tone="amber" /></td>
    </tr>
  );
}

// Resalta solo cuando hay valor; en cero queda gris para no llamar la atención.
function Cifra({ v, f, tone }) {
  const TONE = { danger: 'text-danger', violet: 'text-violet-700', amber: 'text-amber-700' };
  if (!v) return <span className="text-slate-300">{f(0)}</span>;
  return <span className={TONE[tone]}>{f(v)}</span>;
}

// Dato administrativo inline: etiqueta gris + valor compacto. Pensado para la
// tira metadata al pie del modal — mismo patrón que el del Acta.
function MetaDato({ label, value, mono = true }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
      <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">{label}</span>
      <span className={`font-bold text-slate-700 ${mono ? 'tabular-nums' : ''}`}>{value || '—'}</span>
    </span>
  );
}

// Código de barras del volante TALMA: 8 dígitos (p. ej. 08150625). Determinista
// a partir de la guía para que sea estable entre renders.
function volanteCodigo(awb) {
  const base = String(awb.awb || awb.id || '');
  let h = 0;
  for (let i = 0; i < base.length; i++) h = (h * 131 + base.charCodeAt(i)) | 0;
  return String(Math.abs(h) % 100000000).padStart(8, '0');
}

function formatFecha(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// Fecha de ingreso al almacén = inicio del hito de recepción. Fallback al
// acta de mal estado (que registra el mismo dato) si la recepción no tiene
// fecha registrada aún.
function fechaIngreso(awb) {
  return awb.timeline?.recepcion?.fecha_inicio || awb.acta_mal_estado?.fecha_ingreso || null;
}

function IconVolante() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16v4H4zM4 8v12h16V8" />
      <path d="M8 12h8M8 16h5" />
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
function IconWarningSmall() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2 1 21h22L12 2zm0 6 6 11H6l6-11zm-1 4v3h2v-3h-2zm0 4v2h2v-2h-2z" />
    </svg>
  );
}
