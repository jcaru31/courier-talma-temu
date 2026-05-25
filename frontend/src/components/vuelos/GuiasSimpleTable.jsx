import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconoAlerta } from './alertaIconos.jsx';
import VerificacionModal, { IconDoc } from './VerificacionModal.jsx';
import VolanteModal from './VolanteModal.jsx';
import ActaMalEstadoModal from '../inventario/ActaMalEstadoModal.jsx';
import { buildHitosAwb } from '../../utils/hitosAwb.js';

// Estado de la guía = el hito que trabaja ahora (modelo "hito en curso").
// Colores:
//   VERDE    — el hito previo terminó y el siguiente aún no empieza. La
//              etiqueta lleva el nombre del siguiente hito (queda "a la espera").
//   AMARILLO — el hito ya empezó: lleva su nombre + un círculo de estado
//              animado que llama la atención.
//   FALTANTE — guía manifestada que no arribó: quedó en Trasmisión Aerolínea
//              (hasta ese punto la aerolínea la transmitió, pero nunca llegó a
//              Recepción). Tono violeta para que no se lea como avance normal.
// ENTREGADA es el estado terminal (verde con check).
const HITO_LABEL = {
  aerolinea:     'TRASMISIÓN AEROLÍNEA',
  recepcion:     'RECEPCIÓN',
  transmisiones: 'TRASMISIÓN ALMACÉN',
  facturacion:   'FACTURACIÓN',
  despacho:      'DESPACHO',
};

// Estado de la guía a partir de sus hitos reales (mismos que la Vista 3):
//   AMARILLO + nombre → hay un hito EN CURSO (ya empezó, falta terminar). Ej.:
//     al registrarse "Llegada al almacén" pasa de Trasm. Aerolínea a Recepción.
//   VERDE + nombre    → el último hito COMPLETADO (nada en curso aún). Ej.: vuelo
//     en el aire = "Trasm. Aerolínea" verde (lo único completado).
//   VERDE + check     → Despacho completado = entregada (terminal).
//   FALTANTE          → gris (no arribó); su distintivo es el ícono "?" + fila sombreada.
function estadoGuia(a) {
  if (a.estado_tracking === 'FALTANTE' || a.status === 'GUIA_FALTANTE') {
    return { label: 'FALTANTE', tone: 'faltante', terminal: false };
  }
  const hitos = buildHitosAwb(a);
  const enCurso = hitos.find((h) => h.estado === 'EN_CURSO');
  if (enCurso) {
    return { label: HITO_LABEL[enCurso.key] || '—', tone: 'amarillo', terminal: false };
  }
  const completados = hitos.filter((h) => h.estado === 'COMPLETADO');
  const ultimo = completados[completados.length - 1];
  const key = ultimo?.key || 'aerolinea';
  return { label: HITO_LABEL[key], tone: 'verde', terminal: key === 'despacho' };
}

// Orden cronológico de los hitos: el más atrasado (FALTANTE/MANIFESTADO) ocupa
// el peor lugar (0) y ENTREGADA el mejor (5). Se usa para sortear la tabla
// poniendo arriba las guías cuyo hito en curso está más rezagado.
const ORDEN_HITO = {
  FALTANTE:      0,
  MANIFESTADO:   1,
  TRANSMISIONES: 2,
  FACTURACION:   3,
  DESPACHO:      4,
  ENTREGADA:     5,
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

// Autorización de Salida derivada del canal_dam.con_levante.
// AUTORIZADO si tiene levante; PENDIENTE en cualquier otro caso (rojo sin
// levante, naranja, sin canal asignado, planificado, etc.)
function autorizacionSalida(awb) {
  return awb.canal_dam?.con_levante === true ? 'AUTORIZADO' : 'PENDIENTE';
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
}) {
  const [busqueda, setBusqueda] = useState(prefilterQuery);
  const [verificacionAwb, setVerificacionAwb] = useState(null);
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
              <Th rowSpan={2} className="text-left align-middle">Estado</Th>
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
              const handlingPendiente = a.handling_pagado === false;

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
                    <CeldaVerificacion
                      verificada={auth === 'AUTORIZADO'}
                      onAbrir={(e) => { e.stopPropagation(); setVerificacionAwb(a); }}
                    />
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

    {verificacionAwb && (
      <VerificacionModal awb={verificacionAwb} onClose={() => setVerificacionAwb(null)} />
    )}
    {volanteAwb && (
      <VolanteModal awb={volanteAwb} onClose={() => setVolanteAwb(null)} />
    )}
    {actaAwb && (
      <ActaMalEstadoModal
        acta={actaAwb.acta_mal_estado}
        awb={actaAwb.awb}
        onClose={() => setActaAwb(null)}
      />
    )}
    </>
  );
}

// Chip de estado de la guía. Solo dos colores (ver `estadoGuia`):
//   amarillo + círculo animado → el hito ya empezó (en curso, requiere atención)
//   verde → hito previo terminado y el siguiente aún no inicia (al día)
//   verde con check → ENTREGADA (terminal)
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
  if (e.tone === 'amarillo') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide bg-amber-50 text-amber-700">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
        </span>
        {e.label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700">
      {e.terminal ? (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
      )}
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
        {(kgs ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
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

// Aviso de llegada: si fue enviado → chip clickeable que abre el volante
// (conciliación + PDF); si no → guion gris no interactivo.
function CeldaAviso({ enviado, onAbrir }) {
  if (!enviado) return <span className="text-slate-300 text-[12px] font-bold">—</span>;
  return (
    <button
      type="button"
      onClick={onAbrir}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-blue-200 bg-blue-50 text-navy hover:bg-blue-100 hover:border-blue-300 transition"
      title="Ver aviso de llegada (volante)"
    >
      <span className="text-[12px] font-bold">Sí</span>
      <IconDoc size={13} />
    </button>
  );
}

// Verificación aduanera: mismo patrón que Aviso. Si está verificada → chip
// "Sí" clickeable que abre el detalle (hora + DAM); si no → guion gris.
function CeldaVerificacion({ verificada, onAbrir }) {
  if (!verificada) return <span className="text-slate-300 text-[12px] font-bold">—</span>;
  return (
    <button
      type="button"
      onClick={onAbrir}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-emerald-200 bg-emerald-50 text-ok hover:bg-emerald-100 hover:border-emerald-300 transition"
      title="Ver verificación aduanera"
    >
      <span className="text-[12px] font-bold">Sí</span>
      <IconDoc size={13} />
    </button>
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
    out.push({ tipo: 'inmov', color: 'text-orange-600', dark: 'text-orange-300', label: 'Inmovilizada', desc: 'Canal rojo sin levante: carga retenida por aduanas.' });
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
// descripción corta. Posición fija anclada a los iconos para no recortarse con
// el scroll de la tabla.
function IconosTooltip({ alertas, anchorRect }) {
  const top = anchorRect.bottom + 8;
  const left = Math.min(Math.max(8, anchorRect.left), window.innerWidth - 280);
  return (
    <div
      style={{ position: 'fixed', top, left, zIndex: 80 }}
      className="pointer-events-none w-64 bg-slate-900 text-white rounded-lg shadow-2xl ring-1 ring-black/10 px-3 py-2.5"
    >
      {/* Caret */}
      <span
        className="absolute -top-1.5 w-3 h-3 rotate-45 bg-slate-900"
        style={{ left: Math.min(Math.max(10, anchorRect.left - left + 8), 230) }}
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
