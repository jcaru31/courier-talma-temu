import { useEffect } from 'react';

// El PDF del volante se sirve via /actas/* (mismo handler estático que las
// actas — ver vite.config.js proxy + backend/src/server.js).
const VOLANTE_PDF = '/actas/volante-original.pdf';

/**
 * Modal de Aviso de llegada (Volante TALMA). La info de mal estado ya vive en
 * el acta, así que aquí mostramos solo lo "nuevo" del volante: los datos del
 * documento + la conciliación Manifiesto / Recibido / Bueno / Malos / Faltos /
 * Sobrantes (bultos y kilos), que es el cuadro propio del volante. El PDF
 * original se adjunta como ejemplo.
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
        {/* Header */}
        <div className="px-5 py-3 border-b border-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center text-navy shrink-0">
            <IconVolante />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">
              Aviso de llegada · Volante N° {codigo}
            </div>
            <h2 className="text-base font-bold text-slate-800 leading-tight">
              Guía {awb.awb}
              {awb.consignatario_nombre && (
                <span className="text-slate-400 font-normal"> · {awb.consignatario_nombre}</span>
              )}
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Datos del documento */}
          <div className="grid grid-cols-4 gap-3 rounded-md border border-border bg-slate-50 p-3">
            <Campo label="N° Volante" value={codigo} mono destacado />
            <Campo label="Línea aérea" value={awb.aerolinea} />
            <Campo label="Vuelo" value={awb.vuelo} mono />
            <Campo label="Manifiesto" value={awb.manifiesto_carga?.numero_manifiesto || awb.manifiesto} mono />
            <Campo label="Lleg. vuelo" value={formatFecha(awb.eta)} mono />
            <Campo label="Agente de carga" value={awb.agente_carga} />
            <Campo label="Contenido" value={acta?.contenido_manifestado} />
            <Campo label="Terminal / Almacén" value={awb.warehouse} mono />
          </div>

          {/* Conciliación Manifiesto / Recibido / Bueno / Malos / Faltos / Sobrantes */}
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
                  <th className="px-3 py-2 text-right text-danger">Malos</th>
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

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Bueno = Recibido − Malos · Faltos = lo no arribado vs. manifiesto ·
            Sobrantes = excedente sobre lo manifestado. El detalle de los bultos
            en mal estado (tipo de daño, fotos) está en el Acta.
          </p>
        </div>
      </div>
    </div>
  );
}

// Deriva la conciliación del volante desde los campos de la guía. El peso en
// mal estado proviene del acta cuando existe (la guía solo guarda bultos).
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
    bultos: { manifiesto: espB, recibido: recB, bueno: buenB, malos: malB, faltos: faltB, sobrantes: sobB },
    kilos: { manifiesto: espK, recibido: recK, bueno: buenK, malos: malK, faltos: faltK, sobrantes: sobK },
  };
}

function FilaConcil({ label, d, decimals = 0 }) {
  const f = (n) => (decimals > 0 ? Number(n).toLocaleString('es-PE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : n);
  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-3 py-2.5 text-[10px] uppercase tracking-wider text-slate-500 font-bold">{label}</td>
      <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-slate-700">{f(d.manifiesto)}</td>
      <td className="px-3 py-2.5 text-right tabular-nums font-bold text-slate-900">{f(d.recibido)}</td>
      <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-ok">{f(d.bueno)}</td>
      <td className="px-3 py-2.5 text-right tabular-nums font-bold"><Cifra v={d.malos} f={f} tone="danger" /></td>
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

function Campo({ label, value, mono = false, destacado = false }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">{label}</span>
      <span className={`text-[12px] font-bold mt-0.5 ${mono ? 'tabular-nums' : ''} ${destacado ? 'text-navy' : 'text-slate-800'}`}>
        {value || <span className="text-slate-300 font-normal">—</span>}
      </span>
    </div>
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
