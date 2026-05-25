/**
 * Helpers de presentación compartidos por las 3 variantes de la vista de
 * vuelos (Minimal / Split / Agenda). La idea de la arquitectura: los datos
 * vienen del mismo hook (useVuelos) y estas funciones derivan todo lo visual
 * (resumen de alertas, estado de ruta, progreso de hitos, formato de hora).
 * Así las variantes son solo capa de presentación y no duplican lógica.
 */

// Resumen de alertas del vuelo en orden de severidad. Cada entrada apunta al
// `tipo` que entiende IconoAlerta para reusar el mismo símbolo en todos lados.
const DEF_ALERTAS = [
  { key: 'guias_faltantes',      tipo: 'faltantes',  label: 'Faltantes',  color: 'violet' },
  { key: 'guias_con_inmov',      tipo: 'inmov',      label: 'Inmov.',     color: 'orange' },
  { key: 'guias_con_mal_estado', tipo: 'mal_estado', label: 'Mal estado', color: 'red' },
  { key: 'guias_parciales',      tipo: 'parciales',  label: 'Parciales',  color: 'amber' },
];

export function resumenAlertas(v) {
  return DEF_ALERTAS
    .map((d) => ({ ...d, count: v[d.key] || 0 }))
    .filter((d) => d.count > 0);
}

export function totalAlertas(v) {
  return DEF_ALERTAS.reduce((s, d) => s + (v[d.key] || 0), 0);
}

// Color "peor caso" para un badge único de alertas.
export function colorAlertaPrincipal(v) {
  const r = resumenAlertas(v);
  return r.length ? r[0].color : null;
}

// Clases Tailwind por color de alerta (texto + fondo suave + borde).
// Estáticas a propósito: Tailwind no detecta clases construidas dinámicamente
// como `text-${color}-700`, así que mapeamos explícitamente.
export const ALERTA_CLS = {
  violet: 'bg-violet-50 border-violet-200 text-violet-700',
  orange: 'bg-orange-50 border-orange-200 text-orange-700',
  red:    'bg-red-50 border-red-200 text-danger',
  slate:  'bg-slate-100 border-slate-300 text-slate-600',
  amber:  'bg-amber-50 border-amber-200 text-amber-800',
};
export const ALERTA_TEXT = {
  violet: 'text-violet-700',
  orange: 'text-orange-700',
  red:    'text-danger',
  slate:  'text-slate-600',
  amber:  'text-amber-800',
};

// --- Estado de ruta -------------------------------------------------------
const RUTA = {
  PROGRAMADO: { label: 'Programado', dot: 'bg-slate-300',  text: 'text-slate-500' },
  EN_VUELO:   { label: 'En vuelo',   dot: 'bg-sky-500',    text: 'text-sky-700' },
  ATERRIZADO: { label: 'Aterrizado', dot: 'bg-emerald-500',text: 'text-emerald-700' },
};

export function estadoRutaInfo(v) {
  const e = v.estado_ruta?.estado || 'PROGRAMADO';
  return RUTA[e] || RUTA.PROGRAMADO;
}

// Texto de cuenta regresiva. Solo aplica si aún no aterriza.
export function countdownArribo(v) {
  const er = v.estado_ruta;
  if (!er || er.estado === 'ATERRIZADO') return null;
  const min = er.minutos_para_arribo;
  if (min == null || min <= 0) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `Llega en ${h}h ${String(m).padStart(2, '0')}m` : `Llega en ${m}m`;
}

/**
 * Tono de cada hito de la trazabilidad. UNA sola regla para que la barra del
 * card (lista) y la gráfica del detalle siempre cuadren, y para que un hito NO
 * se pinte "en curso" si todavía no arrancó (p. ej. vuelo en el aire → la
 * recepción aún no inicia).
 *
 * Un hito está "iniciado" cuando realmente empezó a trabajarse:
 *   - Trasmisión Aerolínea (idx 0): siempre (el manifiesto ya se numeró).
 *   - Recepción (idx 1): cuando llega carga al almacén (bultosRecibidos > 0).
 *   - Resto: cuando el hito anterior ya tiene al menos una guía completada.
 *
 * @param {number[]} completados  guías que pasaron cada hito (orden de los 5 hitos)
 * @param {number}   total        guías recibidas (denominador, sin faltantes)
 * @param {number}   bultosRecibidos  bultos recibidos del vuelo
 * @returns {('verde'|'amarillo'|'gris')[]}
 */
export function tonoHitos(completados, total, bultosRecibidos) {
  return completados.map((c, i) => {
    if (i === 0) return 'verde'; // aerolínea: manifiesto numerado, siempre completo
    if (total > 0 && c >= total) return 'verde'; // todas las recibidas lo pasaron
    const iniciado = i === 1 ? (bultosRecibidos || 0) > 0 : completados[i - 1] > 0;
    return iniciado ? 'amarillo' : 'gris';
  });
}

// --- Progreso de hitos ----------------------------------------------------
// Devuelve el avance global del vuelo a partir de la trazabilidad: cuántos
// hitos están completos y el % de guías que pasaron el último hito alcanzado.
export function progresoHitos(v) {
  const t = v.trazabilidad || [];
  const total = t.length || 1;
  const completos = t.filter((h) => h.completados === h.total && h.total > 0).length;
  // Hito en curso = primero que no está completo.
  const enCurso = t.find((h) => !(h.completados === h.total && h.total > 0)) || null;
  return {
    completos,
    total,
    pct: Math.round((completos / total) * 100),
    enCursoLabel: enCurso?.label || 'Completado',
    avanceGuiasPct: v.avance_bultos_pct ?? 0,
  };
}

// --- Formato de fecha/hora (siempre Lima) ---------------------------------
export function formatHora(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('es-PE', {
    timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

export function formatDiaLabel(fechaYmd, hoy, manana) {
  if (!fechaYmd) return '';
  if (fechaYmd === hoy) return 'Hoy';
  if (fechaYmd === manana) return 'Mañana';
  const d = new Date(fechaYmd + 'T00:00:00-05:00');
  return d.toLocaleDateString('es-PE', {
    timeZone: 'America/Lima', weekday: 'long', day: '2-digit', month: 'short',
  });
}

// Agrupa vuelos por fecha (YYYY-MM-DD) preservando el orden de entrada.
export function agruparPorDia(items) {
  const grupos = new Map();
  for (const v of items) {
    const k = v.fecha || 'sin-fecha';
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(v);
  }
  return Array.from(grupos.entries()).map(([fecha, vuelos]) => ({ fecha, vuelos }));
}
