/**
 * Mapea el timeline crudo del backend a los 5 hitos visibles para el cliente,
 * alineados con la trazabilidad de Vista 1 y Vista 2:
 *
 *   1. DECLARACIÓN AÉREA — Numeración del Manifiesto + Incorporación de guías
 *   2. RECEPCIÓN         — Llegada al almacén + Término de Tarja
 *   3. TRANSMISIONES     — Envío de Volante + Descarga de Mercancía
 *   4. LIBERACIÓN COMERCIAL — Handling + Traslado Postal
 *   5. DESPACHO          — Generación de VCT + Llegada del Camión + Entrega de Carga
 *
 * Cada hito devuelve: { key, label, estado, subeventos[], fecha }
 * estado ∈ { COMPLETADO, EN_CURSO, PENDIENTE, FALTANTE }
 */

const E = { OK: 'COMPLETADO', CURSO: 'EN_CURSO', PEND: 'PENDIENTE', FALT: 'FALTANTE' };

function buscarSub(etapa, regex) {
  return (etapa?.subeventos || []).find((s) => regex.test(s.nombre || ''));
}
function ultimaFechaCompletada(subeventos) {
  const c = (subeventos || []).filter((s) => s.estado === 'COMPLETADO' && s.fecha);
  if (c.length === 0) return null;
  return c.reduce((acc, s) => (new Date(s.fecha) > new Date(acc) ? s.fecha : acc), c[0].fecha);
}
function estadoHito(subeventos, esFaltante) {
  if (esFaltante) return E.FALT;
  const total = subeventos.length;
  const ok = subeventos.filter((s) => s.estado === 'COMPLETADO').length;
  if (ok === total && total > 0) return E.OK;
  if (ok > 0 || subeventos.some((s) => s.estado === 'EN_CURSO' || s.estado === 'ACTIVA')) return E.CURSO;
  return E.PEND;
}
function estadoSub(sub) {
  if (!sub) return E.PEND;
  return sub.estado === 'COMPLETADO' ? E.OK : sub.estado === 'EN_CURSO' ? E.CURSO : E.PEND;
}

export function buildHitosAwb(awb) {
  if (!awb) return [];
  const t = awb.timeline || {};
  const esFaltante = awb.status === 'GUIA_FALTANTE';
  const mc = awb.manifiesto_carga || {};

  // --- 1. DECLARACIÓN AÉREA --- (la aerolínea ya numeró el manifiesto e
  // incorporó las guías antes del vuelo: siempre completado, incluso para
  // faltantes).
  const aerolinea = {
    key: 'aerolinea',
    label: 'Trasmisión Aerolínea',
    estado: E.OK,
    fecha: mc.fecha_incorporacion_guias || mc.fecha_numeracion || null,
    subeventos: [
      { nombre: 'Numeración del Manifiesto', fecha: mc.fecha_numeracion || null, estado: E.OK },
      { nombre: 'Incorporación de guías', fecha: mc.fecha_incorporacion_guias || null, estado: E.OK },
    ],
  };

  // --- 2. RECEPCIÓN --- (llegada al almacén + término de tarja)
  const llegada = t.recepcion?.fecha_inicio || null;
  const tarjaEstado = t.tarja?.estado || 'PENDIENTE';
  const tarjaFin = t.tarja?.fecha_fin || null;
  const subsRecepcion = esFaltante ? [] : [
    {
      nombre: 'Llegada al almacén',
      fecha: llegada,
      estado: llegada ? E.OK : E.PEND,
    },
    {
      nombre: 'Término de Tarja',
      fecha: tarjaFin,
      estado: tarjaEstado === 'COMPLETADO' ? E.OK : tarjaEstado === 'EN_CURSO' ? E.CURSO : E.PEND,
    },
  ];
  const recepcion = {
    key: 'recepcion',
    label: 'Recepción',
    estado: estadoHito(subsRecepcion, esFaltante),
    fecha: tarjaFin,
    subeventos: subsRecepcion,
  };

  // --- 3. TRANSMISIONES --- (descarga de mercancía + envío de volante)
  // Orden cronológico operativo: primero se transmite la descarga al recibir
  // la carga en almacén; el volante sale después. El "Aviso de Llegada"
  // comparte hora con el Envío de Volante: se omite como subevento aparte y
  // se expone solo como bandera para Vista 2.
  const subVolante = buscarSub(t.aduanas, /volante/i);
  const subDescarga = buscarSub(t.aduanas, /descarga|transmision\s*de\s*descarga/i);
  const subAviso = buscarSub(t.aduanas, /aviso/i);
  const subsTrans = esFaltante ? [] : [
    { nombre: 'Descarga de Mercancía', fecha: subDescarga?.fecha || null, estado: estadoSub(subDescarga) },
    { nombre: 'Envío de Volante', fecha: subVolante?.fecha || null, estado: estadoSub(subVolante) },
  ];
  const transmisiones = {
    key: 'transmisiones',
    label: 'Trasmisión Almacén',
    estado: estadoHito(subsTrans, esFaltante),
    fecha: ultimaFechaCompletada(subsTrans),
    avisoLlegadaEnviado: !!(subAviso && subAviso.estado === 'COMPLETADO'),
    subeventos: subsTrans,
  };

  // --- 4. LIBERACIÓN COMERCIAL --- (handling + traslado postal)
  const despSubs = t.despacho_eseer?.subeventos || [];
  const subHandling = despSubs.find((s) => /handling/i.test(s.nombre));
  const subPostal = despSubs.find((s) => /traslado\s*postal/i.test(s.nombre));
  const handlingPagado = awb.handling_pagado !== false;

  const subsFact = esFaltante ? [] : [
    {
      nombre: 'Pago Handling',
      fecha: handlingPagado ? (subHandling?.fecha || null) : null,
      // No pagado -> ACTIVA (alerta roja). Pagado -> estado del subevento crudo.
      estado: !handlingPagado
        ? 'ACTIVA'
        : (subHandling?.estado === 'COMPLETADO' ? E.OK : E.PEND),
      detalle: !handlingPagado ? { estado: 'Pago Handling NO realizado' } : undefined,
    },
    {
      // Pago Traslado Postal solo como check / no-check (sin fecha visible).
      nombre: 'Pago Traslado Postal',
      fecha: null,
      estado: subPostal?.estado === 'COMPLETADO' ? E.OK : E.PEND,
      ocultarFecha: true,
    },
  ];
  const facturacion = {
    key: 'facturacion',
    label: 'Facturación',
    estado: estadoHito(subsFact.filter((s) => s.estado !== 'ACTIVA'), esFaltante),
    fecha: ultimaFechaCompletada(subsFact),
    subeventos: subsFact,
  };

  // --- 5. DESPACHO --- (generación de VCT + llegada del camión + entrega de carga)
  // Mapeo a partir de la data existente (manteniendo orden cronológico):
  //   VCT          ← Ingreso de transportista (primer evento del despacho)
  //   Llegada cam. ← Inicio de estiba
  //   Entrega      ← Entrega de carga
  const subIngreso = despSubs.find((s) => /ingreso\s*de\s*transportista/i.test(s.nombre))
    || despSubs.find((s) => /ingreso\s*de\s*unidad/i.test(s.nombre));
  const subEstiba = despSubs.find((s) => /inicio\s*de\s*estiba/i.test(s.nombre));
  const subEntrega = despSubs.find((s) => /entrega\s*de\s*carga/i.test(s.nombre))
    || despSubs.find((s) => /despacho\s*confirmado/i.test(s.nombre));
  const subsDesp = esFaltante ? [] : [
    norm(subIngreso, 'Generación de VCT'),
    norm(subEstiba, 'Llegada del Camión'),
    norm(subEntrega, 'Entrega de Carga'),
  ];
  const despacho = {
    key: 'despacho',
    label: 'Despacho',
    estado: estadoHito(subsDesp, esFaltante),
    fecha: ultimaFechaCompletada(subsDesp),
    subeventos: subsDesp,
  };

  return [aerolinea, recepcion, transmisiones, facturacion, despacho];
}

function norm(sub, nombre) {
  if (!sub) return { nombre, fecha: null, estado: 'PENDIENTE' };
  return {
    nombre,
    fecha: sub.fecha || null,
    estado: sub.estado === 'COMPLETADO' ? 'COMPLETADO' : sub.estado === 'EN_CURSO' ? 'EN_CURSO' : 'PENDIENTE',
    detalle: sub.detalle,
  };
}
