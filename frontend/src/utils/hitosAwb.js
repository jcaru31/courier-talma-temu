/**
 * Mapea el timeline crudo del backend a los 5 hitos visibles para el cliente,
 * alineados con la trazabilidad de Vista 1 y Vista 2:
 *
 *   1. TRASLADO      — hora de llegada fisica al almacen (recepcion.fecha_inicio)
 *   2. RECEPCION     — subeventos de timeline.recepcion (turno, dique, inspeccion)
 *   3. TRANSMISIONES — Transmision manifiesto + Emision volante (extraidos de aduanas)
 *   4. FACTURACION   — subevento "Facturacion" (extraido de despacho_eseer)
 *   5. DESPACHO      — Ingreso de unidad + Despacho confirmado (resto de despacho_eseer)
 *
 * Cada hito devuelve: { key, label, estado, subeventos[], fecha }
 * estado ∈ { COMPLETADO, EN_CURSO, PENDIENTE, FALTANTE }
 */

const ESTADO = {
  COMPLETADO: 'COMPLETADO',
  EN_CURSO: 'EN_CURSO',
  PENDIENTE: 'PENDIENTE',
  FALTANTE: 'FALTANTE',
};

function ultimaFechaCompletada(subeventos) {
  const completados = (subeventos || []).filter((s) => s.estado === 'COMPLETADO' && s.fecha);
  if (completados.length === 0) return null;
  return completados.reduce((acc, s) =>
    new Date(s.fecha) > new Date(acc) ? s.fecha : acc, completados[0].fecha
  );
}

export function buildHitosAwb(awb) {
  if (!awb) return [];
  const t = awb.timeline || {};
  const esFaltante = awb.status === 'GUIA_FALTANTE';
  const esPlanificado = awb.status === 'PLANIFICADO';

  // --- TRASLADO ---
  // Hora de llegada fisica = fecha_inicio de recepcion. Si la guia no llego
  // (FALTANTE) o el vuelo no arriba (PLANIFICADO), queda pendiente.
  const horaLlegada = t.recepcion?.fecha_inicio || null;
  let estadoTraslado;
  if (esFaltante) estadoTraslado = ESTADO.FALTANTE;
  else if (esPlanificado) estadoTraslado = ESTADO.PENDIENTE;
  else if (horaLlegada) estadoTraslado = ESTADO.COMPLETADO;
  else estadoTraslado = ESTADO.PENDIENTE;

  const traslado = {
    key: 'traslado',
    label: 'Traslado',
    estado: estadoTraslado,
    fecha: horaLlegada,
    subeventos: [
      esFaltante
        ? {
            nombre: 'Guía no llegó al almacén',
            fecha: null,
            estado: 'ACTIVA',
          }
        : {
            nombre: 'Llegada al almacén',
            fecha: horaLlegada,
            estado: horaLlegada ? 'COMPLETADO' : 'PENDIENTE',
          },
    ],
  };

  // --- RECEPCION ---
  const rec = t.recepcion || {};
  const recepcion = {
    key: 'recepcion',
    label: 'Recepción',
    estado: esFaltante ? ESTADO.FALTANTE : (rec.estado || ESTADO.PENDIENTE),
    fecha: rec.fecha_fin || rec.fecha_inicio || null,
    subeventos: esFaltante ? [] : (rec.subeventos || []),
  };

  // --- TRANSMISIONES ---
  // Extrae los subeventos "Transmision manifiesto" y "Emision volante"
  // de aduanas. Si ambos COMPLETADO -> hito completo; si al menos uno -> en curso.
  const adSubs = t.aduanas?.subeventos || [];
  const subTrans = adSubs.filter((s) =>
    /transmision\s*manifiesto/i.test(s.nombre) || /emision\s*volante/i.test(s.nombre)
  );
  const transCompletados = subTrans.filter((s) => s.estado === 'COMPLETADO').length;
  let estadoTrans;
  if (esFaltante) estadoTrans = ESTADO.FALTANTE;
  else if (subTrans.length > 0 && transCompletados === subTrans.length) estadoTrans = ESTADO.COMPLETADO;
  else if (transCompletados > 0) estadoTrans = ESTADO.EN_CURSO;
  else estadoTrans = ESTADO.PENDIENTE;

  const transmisiones = {
    key: 'transmisiones',
    label: 'Transmisiones',
    estado: estadoTrans,
    fecha: ultimaFechaCompletada(subTrans),
    subeventos: esFaltante
      ? []
      : (subTrans.length > 0
        ? subTrans
        : [
            { nombre: 'Transmisión manifiesto', fecha: null, estado: 'PENDIENTE' },
            { nombre: 'Emisión volante',         fecha: null, estado: 'PENDIENTE' },
          ]),
  };

  // --- FACTURACION ---
  const despSubs = t.despacho_eseer?.subeventos || [];
  const subFact = despSubs.filter((s) => /facturacion/i.test(s.nombre));
  let estadoFact;
  if (esFaltante) estadoFact = ESTADO.FALTANTE;
  else if (subFact.some((s) => s.estado === 'COMPLETADO')) estadoFact = ESTADO.COMPLETADO;
  else if (t.despacho_eseer?.estado === 'EN_CURSO') estadoFact = ESTADO.EN_CURSO;
  else estadoFact = ESTADO.PENDIENTE;

  const facturacion = {
    key: 'facturacion',
    label: 'Facturación',
    estado: estadoFact,
    fecha: ultimaFechaCompletada(subFact),
    subeventos: esFaltante
      ? []
      : (subFact.length > 0
        ? subFact
        : [{ nombre: 'Facturación', fecha: null, estado: 'PENDIENTE' }]),
  };

  // --- DESPACHO ---
  const subDesp = despSubs.filter((s) => !/facturacion/i.test(s.nombre));
  const despConfirmado = subDesp.find((s) => /despacho confirmado/i.test(s.nombre));
  let estadoDesp;
  if (esFaltante) estadoDesp = ESTADO.FALTANTE;
  else if (despConfirmado?.estado === 'COMPLETADO') estadoDesp = ESTADO.COMPLETADO;
  else if (subDesp.some((s) => s.estado === 'COMPLETADO')) estadoDesp = ESTADO.EN_CURSO;
  else estadoDesp = ESTADO.PENDIENTE;

  const despacho = {
    key: 'despacho',
    label: 'Despacho',
    estado: estadoDesp,
    fecha: ultimaFechaCompletada(subDesp),
    subeventos: esFaltante
      ? []
      : (subDesp.length > 0
        ? subDesp
        : [
            { nombre: 'Ingreso de unidad',  fecha: null, estado: 'PENDIENTE' },
            { nombre: 'Despacho confirmado', fecha: null, estado: 'PENDIENTE' },
          ]),
  };

  return [traslado, recepcion, transmisiones, facturacion, despacho];
}
