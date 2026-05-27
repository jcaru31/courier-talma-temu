/**
 * Regla única para la alerta "Pago de Handling pendiente".
 *
 * El pago de handling es la actividad inmediata posterior a la emisión del
 * volante: el courier necesita el volante (con su monto facturado) para poder
 * pagar. Antes de que el volante esté emitido la alerta no aplica — no es
 * pago "pendiente", es pago "todavía no exigible".
 *
 * La alerta se dispara solo cuando se cumplen AMBAS condiciones:
 *   1. `handling_pagado === false` (el courier no ha pagado).
 *   2. Emisión del volante COMPLETADA (la actividad existe en el timeline
 *      de aduanas y está marcada como completada).
 */
export function alertaHandlingPendiente(awb) {
  if (!awb || awb.handling_pagado !== false) return false;
  const subs = awb.timeline?.aduanas?.subeventos || [];
  return subs.some(
    (s) => /emision de volante/i.test(s.nombre || '') && s.estado === 'COMPLETADO',
  );
}
