import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconoAlerta } from './alertaIconos.jsx';
import VolanteModal from './VolanteModal.jsx';
import ActaMalEstadoModal from '../inventario/ActaMalEstadoModal.jsx';
import { alertaHandlingPendiente } from '../../utils/handlingAlerta.js';

// HITO ACTUAL de la guía = el hito más profundo cuya 1ra actividad ya se
// completó (la guía entró en él). El matiz "en curso vs terminado" dentro
// del hito vive en la vista 3, no acá. El estado terminal ENTREGADA se
// eliminó: una guía con despacho cerrado sigue teniendo HITO ACTUAL =
// DESPACHO y el flag `entregada` activa el check verde.
const TRACKING_A_HITO = {
  TRASMISION_AEROLINEA: 'TRASMISIÓN AEROLÍNEA',
  MANIFESTADO:          'RECEPCIÓN',
  TRANSMISIONES:        'TRASMISIÓN ALMACÉN',
  FACTURACION:          'FACTURACIÓN',
  DESPACHO:             'DESPACHO',
};

// Estado visible de la guía. Solo tres variantes:
//   faltante  — gris + ícono "?" (no arribó).
//   entregada — verde + check (despacho con entrega de carga completada).
//   hito      — chip neutro con el nombre del hito actual.
function estadoGuia(a) {
  if (a.estado_tracking === 'FALTANTE' || a.status === 'GUIA_FALTANTE') {
    return { label: 'FALTANTE', tone: 'faltante' };
  }
  if (a.estado_tracking === 'DESPACHO' && a.entregada) {
    return { label: 'DESPACHO', tone: 'entregada' };
  }
  const label = TRACKING_A_HITO[a.estado_tracking] || 'TRASMISIÓN AEROLÍNEA';
  return { label, tone: 'hito' };
}

// Orden cronológico de los hitos: el más atrasado (FALTANTE) ocupa el peor
// lugar (0) y DESPACHO el mejor (5). Se usa para sortear la tabla poniendo
// arriba las guías cuyo hito actual está más rezagado.
const ORDEN_HITO = {
  FALTANTE:             0,
  TRASMISION_AEROLINEA: 1,
  MANIFESTADO:          2,
  TRANSMISIONES:        3,
  FACTURACION:          4,
  DESPACHO:             5,
};

// Cuenta subeventos COMPLETADOS en todo el timeline — sirve como criterio
// secundario para el sort dentro del mismo hito. Menos completos = más
// rezagados → quedan arriba.
function subeventosCompletados(a) {
  const tl = a.timeline || {};
  let n = 0;
  for (const sec of Object.values(tl)) {
    for (const s of sec?.subeventos || []) {
      if (s.estado === 'COMPLETADO') n++;
    }
  }
  return n;
}

// Autorización de Salida (verificación aduanera). Para mostrarse como
// AUTORIZADO se requieren TRES condiciones simultáneas:
//   1. Levante otorgado por SUNAT (`canal_dam.con_levante === true`). Esto
//      excluye automáticamente las guías inmovilizadas (canal rojo sin
//      levante) y las que aún no tienen canal asignado.
//   2. Pago del handling registrado en el sistema (subev "Facturacion
//      handling" COMPLETADO).
//   3. Pago del traslado postal registrado (subev "Facturacion traslado
//      postal" COMPLETADO).
// La verificación aduanera no puede consignarse antes de tener ambas
// facturaciones (handling + traslado) porque sin VCT la SUNAT no la procesa.
function autorizacionSalida(awb) {
  if (awb.canal_dam?.con_levante !== true) return 'PENDIENTE';
  const subs = awb.timeline?.despacho_eseer?.subeventos || [];
  const handling = subs.find((s) => /facturacion handling/i.test(s.nombre || ''));
  const traslado = subs.find((s) => /traslado postal/i.test(s.nombre || ''));
  if (handling?.estado !== 'COMPLETADO') return 'PENDIENTE';
  if (traslado?.estado !== 'COMPLETADO') return 'PENDIENTE';
  return 'AUTORIZADO';
}

// Aviso de llegada (transmisión a aduanas) — es por guía: se considera
// enviado cuando el subevento "Aviso de llegada" del hito aduanas está
// COMPLETADO.
function avisoLlegadaEnviado(awb) {
  const subs = awb.timeline?.aduanas?.subeventos || [];
  return subs.some((s) => /aviso de llegada/i.test(s.nombre) && s.estado === 'COMPLETADO');
}

// Guía entregada: el subevento "Entrega de carga" del despacho está
// COMPLETADO con hora registrada.
function entregada(awb) {
  const subs = awb.timeline?.despacho_eseer?.subeventos || [];
  return subs.some(
    (s) => /entrega de carga/i.test(s.nombre) && s.estado === 'COMPLETADO' && s.fecha
  );
}

export default function GuiasSimpleTable({
  awbs,
  totalSinFiltrar,
  filtroActivoLabel = null,
  prefilterQuery = '',
  alturaMaxima = '60vh',
  alturaMinima = '50vh',
  onSelectAwb = () => {},
  fill = false,
  preAta = false,
}) {
  const [busqueda, setBusqueda] = useState(prefilterQuery);
  const [volanteAwb, setVolanteAwb] = useState(null);
  const [actaAwb, setActaAwb] = useState(null);

  // Si la búsqueda viene desde fuera (caso típico: Vista 1 buscó por los
  // últimos 4 dígitos), pre-cargamos el input para que la tabla muestre
  // únicamente esa guía sin que el usuario tenga que volver a tipear.
  useEffect(() => {
    setBusqueda(prefilterQuery || '');
  }, [prefilterQuery]);

  // Sort base: hito más atrasado arriba; dentro del mismo hito, los menos
  // completos en subeventos primero. Aplica también con búsqueda activa.
  const awbsOrdenados = useMemo(() => {
    return [...(awbs || [])].sort((x, y) => {
      const ox = ORDEN_HITO[x.estado_tracking] ?? 99;
      const oy = ORDEN_HITO[y.estado_tracking] ?? 99;
      if (ox !== oy) return ox - oy;
      return subeventosCompletados(x) - subeventosCompletados(y);
    });
  }, [awbs]);

  // Búsqueda libre: matchea por consignatario, AWB completo o últimos 4
  // dígitos del AWB (los del label corto que el usuario suele usar).
  const awbsVisibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return awbsOrdenados;
    const soloDigitos = q.replace(/\D/g, '');
    return awbsOrdenados.filter((a) => {
      const cns = (a.consignatario_nombre || '').toLowerCase();
      const awbStr = (a.awb || '').toLowerCase();
      const awbDigitos = awbStr.replace(/\D/g, '');
      const matchUltimos4 = soloDigitos.length >= 2 && awbDigitos.endsWith(soloDigitos);
      return cns.includes(q) || awbStr.includes(q) || matchUltimos4;
    });
  }, [awbsOrdenados, busqueda]);

  return (
    <>
    <div
      className={`card flex flex-col ${fill ? 'flex-1 min-h-0' : ''}`}
      style={fill ? undefined : { minHeight: alturaMinima }}
    >
      {/* Cabecera de la tabla */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3 flex-wrap">
        <IconBox />
        <h3 className="text-base font-bold tracking-wider text-slate-800 uppercase">
          Guías
        </h3>
        {filtroActivoLabel && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-navy text-white px-2 py-1 rounded">
            Filtro: {filtroActivoLabel}
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-1 rounded border border-border">
          {awbsVisibles.length} {awbsVisibles.length === 1 ? 'guía' : 'guías'}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 px-3 py-1.5 border border-border text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50"
            title="Exportar las guías"
          >
            <IconDownload />
            Exportar
          </button>
          <div className="relative">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por consignatario o Nº guía (últimos 4 dígitos)..."
              className="pl-8 pr-3 py-1.5 text-sm border border-border rounded-md w-64 focus:outline-none focus:ring-2 focus:ring-navy/30"
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
              <IconSearch />
            </span>
          </div>
        </div>
      </div>

      {/* Tabla con scroll interno y header sticky */}
      <div
        className="overflow-auto flex-1 min-h-0"
        style={fill ? undefined : { maxHeight: alturaMaxima }}
      >
        <table className="w-full text-sm">
          <thead className="bg-slate-50 sticky top-0 z-10">
            {/* Encabezado normalizado: las columnas simples ocupan ambas filas
                (rowSpan) y van centradas; solo Manifestado/Real se agrupan, así
                no queda espacio vacío arriba del resto. */}
            <tr className="text-[10px] tracking-wider uppercase text-muted font-semibold border-b border-border">
              <Th rowSpan={2} className="w-8 align-middle" />
              <Th rowSpan={2} className="text-left align-middle">Consignatario</Th>
              <Th rowSpan={2} className="text-left align-middle">Nº Guía Aérea</Th>
              <th className="px-3 pt-2 pb-1 text-center text-[9px] font-bold text-slate-400 bg-slate-100/60 border-l border-border">Manifestado</th>
              <th className="px-3 pt-2 pb-1 text-center text-[9px] font-bold text-navy bg-blue-50/40 border-l border-border">Real</th>
              <Th rowSpan={2} className="text-center align-middle">Mal<br/>estado</Th>
              <Th rowSpan={2} className="text-center align-middle">Aviso de<br/>llegada</Th>
              <Th rowSpan={2} className="text-center align-middle">Verificación<br/>Aduanera</Th>
              <Th rowSpan={2} className="text-left align-middle">Hito actual</Th>
              <Th rowSpan={2} className="align-middle" />
            </tr>
            <tr className="text-[9px] tracking-wider uppercase text-muted font-semibold border-b border-border">
              <th className="px-3 pb-2 text-right text-slate-400 bg-slate-100/60 border-l border-border">Bultos · Peso (kg)</th>
              <th className="px-3 pb-2 text-right text-navy bg-blue-50/40 border-l border-border">Bultos · Peso (kg)</th>
            </tr>
          </thead>
          <tbody>
            {awbsVisibles.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-muted">
                  No hay guías que coincidan con el filtro.
                </td>
              </tr>
            )}
            {awbsVisibles.map((a) => {
              const esFaltante = a.status === 'GUIA_FALTANTE';
              const auth = autorizacionSalida(a);
              const bultosMal = a.bultos_mal_estado || 0;
              // Faltante NO se considera parcial: una guía que no arribó no es
              // "parcial" sino "faltante". Solo cuenta parcial cuando arribó
              // con menos bultos de los esperados.
              const bultosFalt = esFaltante ? 0 : (a.bultos_faltantes || 0);
              const avisoEnviado = avisoLlegadaEnviado(a);
              const esEntregada = entregada(a);
              // Pre-ATA: el handling no es accionable hasta que la carga arriba,
              // así que ocultamos el indicador para no contaminar la tabla.
              // La regla de fondo (volante emitido) vive en alertaHandlingPendiente.
              const handlingPendiente = !preAta && alertaHandlingPendiente(a);

              return (
                <tr
                  key={a.id}
                  onClick={() => onSelectAwb(a.id)}
                  className={`border-b border-border transition cursor-pointer ${
                    esFaltante ? 'bg-slate-100/70 hover:bg-slate-100' : 'hover:bg-slate-50'
                  }`}
                >
                  <Td className="text-center px-2">
                    <EstadoFilaIcono a={a} entregada={esEntregada} />
                  </Td>
                  <Td>
                    <div className="data-bold text-sm leading-tight">
                      {a.consignatario_nombre || '—'}
                    </div>
                  </Td>
                  <Td className="text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="data-bold">{a.awb}</span>
                      {handlingPendiente && <HandlingDot />}
                    </div>
                  </Td>
                  {/* MANIFESTADO: bultos / peso esperados, apilados */}
                  <Td className="text-right tabular-nums bg-slate-50/50 border-l border-border">
                    <CeldaCarga bultos={a.bultos_esperados} kgs={a.kgs_esperados} />
                  </Td>
                  {/* REAL: bultos / peso recibidos + badge de parcial. Una guía
                      faltante muestra 0 y 0.0 (no arribó); no se trata como parcial. */}
                  <Td className="text-right tabular-nums bg-blue-50/30 border-l border-border">
                    <CeldaCarga
                      bultos={esFaltante ? 0 : a.bultos_recibidos}
                      kgs={esFaltante ? 0 : a.kgs_recibidos}
                      highlight={esFaltante || bultosFalt > 0}
                      faltaBultos={esFaltante ? 0 : bultosFalt}
                    />
                  </Td>
                  {/* MAL ESTADO: chip que abre el acta (datos + fotos + PDF) */}
                  <Td className="text-center tabular-nums">
                    <CeldaMalEstado
                      n={bultosMal}
                      acta={a.acta_mal_estado}
                      onAbrir={(e) => { e.stopPropagation(); setActaAwb(a); }}
                    />
                  </Td>
                  {/* AVISO DE LLEGADA: abre el volante (conciliación + PDF) */}
                  <Td className="text-center">
                    <CeldaAviso
                      enviado={avisoEnviado}
                      onAbrir={(e) => { e.stopPropagation(); setVolanteAwb(a); }}
                    />
                  </Td>
                  <Td className="text-center">
                    <CeldaVerificacion awb={a} verificada={auth === 'AUTORIZADO'} />
                  </Td>
                  <Td>
                    <EstadoChip a={a} />
                  </Td>
                  <Td>
                    <button
                      onClick={(e) => { e.stopPropagation(); onSelectAwb(a.id); }}
                      className="text-ok hover:opacity-80"
                      title="Ver detalle de la guía"
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
    </div>

    {/* Portales a document.body para que los modales queden centrados en
        pantalla aunque la tabla viva dentro de un panel split (vista 3). */}
    {volanteAwb && createPortal(
      <VolanteModal awb={volanteAwb} onClose={() => setVolanteAwb(null)} />,
      document.body
    )}
    {actaAwb && createPortal(
      <ActaMalEstadoModal
        acta={actaAwb.acta_mal_estado}
        awb={actaAwb.awb}
        onClose={() => setActaAwb(null)}
      />,
      document.body
    )}
    </>
  );
}

// Chip de estado de la guía. Tres variantes (ver `estadoGuia`):
//   faltante  — gris + ícono "?"
//   entregada — verde + check (terminal: despacho completado)
//   hito      — chip neutro con el nombre del hito donde está la guía
function EstadoChip({ a }) {
  const e = estadoGuia(a);
  if (e.tone === 'faltante') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-500">
        <span className="shrink-0"><IconoAlerta tipo="faltantes" size={12} /></span>
        {e.label}
      </span>
    );
  }
  if (e.tone === 'entregada') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        {e.label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-600 border border-slate-200">
      {e.label}
    </span>
  );
}

// Celda de carga apilada: bultos arriba, peso (kg) abajo. Se usa para los dos
// grupos (Manifestado / Real). En el grupo Real, `highlight` la pinta en rojo;
// `faltaBultos` (solo parciales) añade un badge ámbar con los bultos faltantes.
function CeldaCarga({ bultos, kgs, highlight = false, faltaBultos = 0 }) {
  return (
    <div className="inline-flex flex-col items-end leading-tight gap-0.5">
      <span className="inline-flex items-center gap-1">
        <span className={`text-[13px] font-bold ${highlight ? 'text-danger' : 'text-slate-900'}`}>
          {bultos ?? 0}
        </span>
        {faltaBultos > 0 && (
          <span
            className="inline-flex items-center px-1 py-px rounded text-[9px] font-bold uppercase tracking-wide bg-amber-100 text-amber-800"
            title={`Parcial — faltan ${faltaBultos} bultos`}
          >
            −{faltaBultos}
          </span>
        )}
      </span>
      <span className="text-[11px] text-slate-400 font-medium">
        {(kgs ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 1, maximumFractionDigits: 1, useGrouping: false })}
      </span>
    </div>
  );
}

// Mal estado: sin bultos malos → guion gris; con bultos malos y acta → chip
// "Sí" rojo clickeable que abre el acta (datos + fotos + PDF); con bultos
// malos sin acta → chip "Sí" rojo no interactivo.
function CeldaMalEstado({ n, acta, onAbrir }) {
  if (!n) return <span className="text-slate-300 text-[12px] font-bold">—</span>;
  if (!acta) {
    return (
      <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-[12px] font-bold bg-red-100 text-danger">
        Sí
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onAbrir}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-red-200 bg-red-50 text-danger hover:bg-red-100 hover:border-red-300 transition"
      title={`Ver acta de mal estado N° ${acta.numero_acta}`}
    >
      <span className="text-[12px] font-bold">Sí</span>
      <IconDoc size={13} />
    </button>
  );
}

// Aviso de llegada: si fue enviado → chip "Sí" clickeable que abre el volante
// (conciliación + PDF); si no → guion gris no interactivo.
function CeldaAviso({ enviado, onAbrir }) {
  if (!enviado) return <span className="text-slate-300 text-[12px] font-bold">—</span>;
  return (
    <button
      type="button"
      onClick={onAbrir}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-blue-200 bg-blue-50 text-navy hover:bg-blue-100 hover:border-blue-300 transition"
      title="Ver volante de aviso de llegada"
    >
      <span className="text-[12px] font-bold">Sí</span>
      <IconDoc size={13} />
    </button>
  );
}

// Verificación aduanera: si está verificada → chip "Sí" que al hover muestra
// un tooltip con hora + DAM (mismo patrón que el tooltip de iconos de alerta);
// si no → guion gris. No abre modal: la info es corta y se ve mejor inline.
function CeldaVerificacion({ awb, verificada }) {
  const [rect, setRect] = useState(null);
  if (!verificada) return <span className="text-slate-300 text-[12px] font-bold">—</span>;
  return (
    <>
      <span
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-emerald-200 bg-emerald-50 text-ok cursor-help"
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={(e) => setRect(e.currentTarget.getBoundingClientRect())}
        onMouseLeave={() => setRect(null)}
      >
        <span className="text-[12px] font-bold">Sí</span>
        <IconDoc size={13} />
      </span>
      {rect && createPortal(
        <VerificacionTooltip awb={awb} anchorRect={rect} />,
        document.body
      )}
    </>
  );
}

// Tooltip flotante de verificación aduanera. Se auto-posiciona:
//   1) prefiere abajo del chip; si no entra (filas cerca del borde inferior
//      de la ventana), se voltea hacia arriba.
//   2) clampea horizontalmente para no salirse por izquierda/derecha.
//   3) el caret apunta al chip desde el lado correcto (top/bottom).
// Mide el tooltip tras renderizarlo (useLayoutEffect) para calcular la
// orientación con la altura real, no estimada.
function VerificacionTooltip({ awb, anchorRect }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);
  const hora = formatFechaHora(horaVerificacion(awb));

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const W = 256;
    const h = el.offsetHeight;
    const margen = 8;
    const espacioAbajo = window.innerHeight - anchorRect.bottom;
    const espacioArriba = anchorRect.top;
    // Si abajo no entra y arriba sí, volteamos. Si ninguno entra, elegimos
    // el lado con más espacio.
    const arriba =
      espacioAbajo < h + margen && (espacioArriba >= h + margen || espacioArriba > espacioAbajo);
    const top = arriba ? anchorRect.top - h - margen : anchorRect.bottom + margen;
    const left = Math.min(Math.max(8, anchorRect.left + anchorRect.width / 2 - W / 2), window.innerWidth - W - 8);
    setPos({ top, left, arriba });
  }, [anchorRect]);

  // Caret centrado bajo el chip, clampeado al ancho del tooltip.
  const caretLeft = pos
    ? Math.min(Math.max(10, anchorRect.left + anchorRect.width / 2 - pos.left - 6), 256 - 16)
    : 0;

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: pos?.top ?? -9999,
        left: pos?.left ?? 0,
        zIndex: 80,
        visibility: pos ? 'visible' : 'hidden',
      }}
      className="pointer-events-none w-64 bg-slate-900 text-white rounded-lg shadow-2xl ring-1 ring-black/10 px-3 py-2.5"
    >
      <span
        className="absolute w-3 h-3 rotate-45 bg-slate-900"
        style={{
          left: caretLeft,
          top: pos?.arriba ? undefined : -6,
          bottom: pos?.arriba ? -6 : undefined,
        }}
      />
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-emerald-300 font-bold mb-2">
        <IconDoc size={12} />
        Verificación Aduanera
      </div>
      <div className="space-y-2">
        <div>
          <div className="text-[9px] uppercase tracking-wide text-slate-400 font-semibold">
            Hora de verificación
          </div>
          <div className="text-[12px] font-bold tabular-nums leading-tight mt-0.5">
            {hora || <span className="text-slate-500 font-normal">— sin registrar —</span>}
          </div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wide text-slate-400 font-semibold">
            Documento de salida
          </div>
          <div className="text-[12px] font-bold tabular-nums leading-tight mt-0.5">
            {awb.dam || <span className="text-slate-500 font-normal">— sin registrar —</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// Hora de verificación = fecha del último subevento de aduanas completado.
// Fallback al último evento de todo el timeline para que nunca quede vacío
// en una guía ya verificada.
function horaVerificacion(awb) {
  const tl = awb.timeline || {};
  const ultima = (subs) => {
    const f = (subs || [])
      .filter((s) => s.estado === 'COMPLETADO' && s.fecha)
      .map((s) => s.fecha);
    return f.length ? f.reduce((a, b) => (new Date(a) > new Date(b) ? a : b)) : null;
  };
  return ultima(tl.aduanas?.subeventos) || ultima(Object.values(tl).flatMap((sec) => sec?.subeventos || []));
}

function formatFechaHora(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function IconDoc({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  );
}

// Handling — chip fuchsia inline al lado del Nº de guía. Paleta distinta de
// los otros filtros (faltante violet, parcial amber, inmov orange, mal estado
// rojo). Símbolo $ legible con tooltip — no ocupa columna y mantiene la fila ágil.
function HandlingDot() {
  return (
    <span
      className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-fuchsia-100 border border-fuchsia-400 text-fuchsia-700 shrink-0"
      title="Pago Handling pendiente"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 4v16" />
        <path d="M16 8.5c0-1.5-1.8-2.8-4-2.8s-4 1.2-4 2.8 1.8 2.2 4 2.8 4 1.2 4 2.8-1.8 2.8-4 2.8-4-1.2-4-2.8" />
      </svg>
    </span>
  );
}

// Todas las alertas activas de la guía, en orden de severidad (faltante >
// inmovilizada > mal estado > parcial). Cada una trae su icono, color y el
// texto que se muestra en el tooltip. Una guía puede acumular varias.
function alertasDeGuia(a) {
  const out = [];
  const esFaltante = a.status === 'GUIA_FALTANTE';
  if (esFaltante)
    out.push({ tipo: 'faltantes', color: 'text-slate-500', dark: 'text-slate-300', label: 'Faltante', desc: 'Guía manifestada que no arribó al terminal.' });
  if (a.canal_dam?.color === 'ROJO' && a.canal_dam?.con_levante === false)
    out.push({ tipo: 'inmov', color: 'text-orange-600', dark: 'text-orange-300', label: 'Inmovilizada', desc: 'Sin autorización de salida: requiere levante.' });
  if ((a.bultos_mal_estado || 0) > 0)
    out.push({ tipo: 'mal_estado', color: 'text-danger', dark: 'text-red-300', label: 'Mal estado', desc: `${a.bultos_mal_estado} bulto(s) arribaron con daño (ver acta).` });
  if (!esFaltante && (a.bultos_faltantes || 0) > 0)
    out.push({ tipo: 'parciales', color: 'text-amber-700', dark: 'text-amber-300', label: 'Parcial', desc: `Arribó con ${a.bultos_faltantes} bulto(s) menos de lo manifestado.` });
  return out;
}

/** Iconos al inicio de la fila: TODAS las alertas activas de la guía
 *  acumuladas (mismos iconos que el filtro de alertas) o un check si ya fue
 *  entregada. Al pasar el mouse aparece un tooltip que explica cada icono. */
function EstadoFilaIcono({ a, entregada }) {
  const alertas = alertasDeGuia(a);
  const [rect, setRect] = useState(null);

  if (alertas.length === 0) {
    if (entregada) {
      return (
        <span
          className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-ok"
          title="Guía entregada — entrega de carga registrada"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
      );
    }
    return null;
  }

  return (
    <>
      <span
        className="inline-flex items-center gap-1 cursor-help"
        onMouseEnter={(e) => setRect(e.currentTarget.getBoundingClientRect())}
        onMouseLeave={() => setRect(null)}
      >
        {alertas.map((al) => (
          <span key={al.tipo} className={`inline-flex ${al.color}`}>
            <IconoAlerta tipo={al.tipo} size={16} />
          </span>
        ))}
      </span>
      {rect && createPortal(<IconosTooltip alertas={alertas} anchorRect={rect} />, document.body)}
    </>
  );
}

// Tooltip flotante (portal) que lista cada alerta con su icono, nombre y una
// descripción corta. Misma lógica de auto-orientación que VerificacionTooltip:
// se voltea hacia arriba si no entra abajo (filas al pie de la ventana), y
// clampea horizontalmente. Mide la altura tras el primer render para decidir
// el lado con la altura real.
function IconosTooltip({ alertas, anchorRect }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const W = 256;
    const h = el.offsetHeight;
    const margen = 8;
    const espacioAbajo = window.innerHeight - anchorRect.bottom;
    const espacioArriba = anchorRect.top;
    const arriba =
      espacioAbajo < h + margen && (espacioArriba >= h + margen || espacioArriba > espacioAbajo);
    const top = arriba ? anchorRect.top - h - margen : anchorRect.bottom + margen;
    const left = Math.min(Math.max(8, anchorRect.left + anchorRect.width / 2 - W / 2), window.innerWidth - W - 8);
    setPos({ top, left, arriba });
  }, [anchorRect]);

  const caretLeft = pos
    ? Math.min(Math.max(10, anchorRect.left + anchorRect.width / 2 - pos.left - 6), 256 - 16)
    : 0;

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: pos?.top ?? -9999,
        left: pos?.left ?? 0,
        zIndex: 80,
        visibility: pos ? 'visible' : 'hidden',
      }}
      className="pointer-events-none w-64 bg-slate-900 text-white rounded-lg shadow-2xl ring-1 ring-black/10 px-3 py-2.5"
    >
      <span
        className="absolute w-3 h-3 rotate-45 bg-slate-900"
        style={{
          left: caretLeft,
          top: pos?.arriba ? undefined : -6,
          bottom: pos?.arriba ? -6 : undefined,
        }}
      />
      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2">
        {alertas.length === 1 ? 'Alerta de la guía' : `${alertas.length} alertas de la guía`}
      </div>
      <div className="space-y-2">
        {alertas.map((al) => (
          <div key={al.tipo} className="flex items-start gap-2">
            <span className={`mt-0.5 shrink-0 ${al.dark}`}>
              <IconoAlerta tipo={al.tipo} size={15} />
            </span>
            <div className="min-w-0">
              <div className="text-[12px] font-bold leading-tight">{al.label}</div>
              <div className="text-[11px] text-slate-300 leading-snug">{al.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Th({ children, className = '', ...rest }) {
  return <th {...rest} className={`px-3 py-2.5 font-semibold leading-tight ${className}`}>{children}</th>;
}
function Td({ children, className = '' }) {
  return <td className={`px-3 py-2.5 align-middle ${className}`}>{children}</td>;
}
function IconBox() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0D2B6B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
function IconArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17l9-9M17 17V8H8" />
    </svg>
  );
}
function IconDownload() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  );
}
