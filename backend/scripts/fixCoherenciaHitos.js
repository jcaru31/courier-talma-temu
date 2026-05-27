/**
 * Normaliza el dataset para que respete las reglas operativas del flujo:
 *
 *   A) INMOVILIZACIÓN requiere volante emitido.
 *      Aduanas solo puede asignar canal rojo / inmovilizar la carga DESPUÉS
 *      de que el almacén transmitió el volante (emitió el aviso). Si la guía
 *      tiene canal rojo sin levante pero "Emisión de volante" aún no está
 *      COMPLETADA, se quita la inmovilización: canal_dam vuelve a sin asignar
 *      y la alerta INMOVILIZACION pasa a RESUELTA en el catálogo.
 *
 *   B) Despacho requiere Facturación completa.
 *      Generar VCT / Llegada del camión / Entrega no pueden iniciar si
 *      "Facturación handling" y "Facturación traslado postal" no están ambos
 *      COMPLETADOS. Si la guía tiene algún sub-evento de despacho iniciado
 *      sin la facturación cerrada, esos sub-eventos se revierten a PENDIENTE.
 *
 *   C) Traslado Postal requiere Handling pagado.
 *      No se puede pagar el traslado si el handling sigue pendiente. Si
 *      "Facturación traslado postal" está COMPLETADO pero "Facturación
 *      handling" no, postal vuelve a PENDIENTE.
 *
 *   D) Handling impago bloquea Despacho.
 *      Si handling_pagado === false la guía tiene que quedarse en
 *      Facturación: todos los sub-eventos de Despacho (incluidos los de
 *      facturación) se revierten a PENDIENTE para que la guía no aparezca
 *      avanzando con la alerta de pago handling activa.
 *
 *   E) Inmovilización bloquea Despacho.
 *      Si la guía tiene canal rojo sin levante, los sub-eventos físicos del
 *      Despacho (Ingreso transportista / Inicio estiba / Entrega de carga)
 *      no pueden estar iniciados. La facturación puede haberse hecho (es
 *      trámite documental) pero el transportista no puede recoger la carga
 *      mientras SUNAT no dé levante. Esos sub-eventos se revierten a
 *      PENDIENTE.
 *
 * Idempotente: aplicar de nuevo no produce cambios una vez normalizado.
 *
 * Uso:  node scripts/fixCoherenciaHitos.js
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'courier_data.json');

// Helpers para localizar sub-eventos.
function subPorRegex(arr, regex) {
  return (arr || []).find((s) => regex.test(s.nombre || ''));
}
function tieneCompletado(arr, regex) {
  const s = subPorRegex(arr, regex);
  return !!(s && s.estado === 'COMPLETADO');
}

function aplicarReglas(data) {
  const fix = { A: [], B: [], C: [], D: [], E: [] };

  for (const awb of data.awb_masters || []) {
    const aduanasSubs = awb.timeline?.aduanas?.subeventos || [];
    const despSubs = awb.timeline?.despacho_eseer?.subeventos || [];

    // ---------- Regla A: INMOV requiere volante emitido ----------
    const inmovActiva =
      awb.canal_dam?.color === 'ROJO' && awb.canal_dam?.con_levante === false;
    const volanteEmitido = tieneCompletado(aduanasSubs, /volante/i);
    if (inmovActiva && !volanteEmitido) {
      awb.canal_dam = {
        ...(awb.canal_dam || {}),
        numero: null,
        color: null,
        con_levante: false,
      };
      // Quita la alerta INMOVILIZACION del awb y márcala como RESUELTA en el
      // catálogo global para no perder el historial.
      const inmovIds = (awb.alertas_activas_ids || []).filter((id) => {
        const alerta = (data.alertas || []).find((a) => a.id === id);
        return alerta?.tipo === 'INMOVILIZACION';
      });
      if (inmovIds.length) {
        awb.alertas_activas_ids = (awb.alertas_activas_ids || []).filter(
          (id) => !inmovIds.includes(id)
        );
        for (const id of inmovIds) {
          const alerta = data.alertas.find((a) => a.id === id);
          if (alerta) alerta.estado = 'RESUELTA';
        }
      }
      // Limpia el sub-evento "Inmovilizacion ..." si existía en aduanas.
      awb.timeline.aduanas.subeventos = aduanasSubs.filter(
        (s) => !/inmoviliz/i.test(s.nombre || '')
      );
      fix.A.push(`${awb.id} (${awb.awb})`);
    }

    // Re-tomamos después de la posible mutación.
    const despSubs2 = awb.timeline?.despacho_eseer?.subeventos || [];

    // ---------- Regla B: Despacho requiere Facturación completa ----------
    const handOk = tieneCompletado(despSubs2, /facturacion\s*handling/i);
    const postalOk = tieneCompletado(despSubs2, /facturacion\s*traslado\s*postal/i);
    const despachoIniciado = despSubs2.some(
      (s) => /ingreso|estiba|entrega/i.test(s.nombre || '') && s.estado !== 'PENDIENTE'
    );
    if (despachoIniciado && (!handOk || !postalOk)) {
      for (const s of despSubs2) {
        if (/ingreso|estiba|entrega/i.test(s.nombre || '')) {
          s.estado = 'PENDIENTE';
          s.fecha = null;
        }
      }
      // Si los sub-eventos siguen ahí pero el hito ya no avanzó, marca el
      // contenedor como EN_CURSO (facturación todavía abierta).
      awb.timeline.despacho_eseer.estado = 'EN_CURSO';
      awb.timeline.despacho_eseer.fecha_fin = null;
      fix.B.push(`${awb.id} (${awb.awb})`);
    }

    // ---------- Regla C: Postal requiere Handling pagado ----------
    const handOk2 = tieneCompletado(despSubs2, /facturacion\s*handling/i);
    const postalSub = subPorRegex(despSubs2, /facturacion\s*traslado\s*postal/i);
    if (postalSub && postalSub.estado === 'COMPLETADO' && !handOk2) {
      postalSub.estado = 'PENDIENTE';
      postalSub.fecha = null;
      fix.C.push(`${awb.id} (${awb.awb})`);
    }

    // ---------- Regla D: Handling impago bloquea Despacho ----------
    if (awb.handling_pagado === false) {
      // Cualquier sub-evento de despacho_eseer que no sea facturación pendiente
      // se revierte a PENDIENTE.
      let toco = false;
      for (const s of despSubs2) {
        if (/ingreso|estiba|entrega/i.test(s.nombre || '') && s.estado !== 'PENDIENTE') {
          s.estado = 'PENDIENTE';
          s.fecha = null;
          toco = true;
        }
        // Handling no puede estar completado si handling_pagado === false.
        if (/facturacion\s*handling/i.test(s.nombre || '') && s.estado === 'COMPLETADO') {
          s.estado = 'PENDIENTE';
          s.fecha = null;
          toco = true;
        }
        // Postal tampoco (corolario de C, pero por si acaso).
        if (/facturacion\s*traslado\s*postal/i.test(s.nombre || '') && s.estado === 'COMPLETADO') {
          s.estado = 'PENDIENTE';
          s.fecha = null;
          toco = true;
        }
      }
      if (toco) {
        awb.timeline.despacho_eseer.estado = 'EN_CURSO';
        awb.timeline.despacho_eseer.fecha_fin = null;
        fix.D.push(`${awb.id} (${awb.awb})`);
      }
    }

    // ---------- Regla E: Inmovilización bloquea Despacho ----------
    const sigueInmov =
      awb.canal_dam?.color === 'ROJO' && awb.canal_dam?.con_levante === false;
    if (sigueInmov) {
      let toco = false;
      for (const s of despSubs2) {
        if (/ingreso|estiba|entrega/i.test(s.nombre || '') && s.estado !== 'PENDIENTE') {
          s.estado = 'PENDIENTE';
          s.fecha = null;
          toco = true;
        }
      }
      if (toco) {
        awb.timeline.despacho_eseer.estado = 'EN_CURSO';
        awb.timeline.despacho_eseer.fecha_fin = null;
        fix.E.push(`${awb.id} (${awb.awb})`);
      }
    }
  }

  return fix;
}

function run() {
  const data = JSON.parse(fs.readFileSync(FILE, 'utf-8'));
  const fix = aplicarReglas(data);
  const total = fix.A.length + fix.B.length + fix.C.length + fix.D.length + fix.E.length;
  if (total === 0) {
    console.log('Sin cambios: el dataset ya cumple las reglas de coherencia.');
    return;
  }
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
  console.log(`Coherencia normalizada (${total} corrección(es)):`);
  console.log(`  A) INMOV sin volante  → liberadas: ${fix.A.length}`);
  fix.A.forEach((x) => console.log(`     - ${x}`));
  console.log(`  B) Despacho sin facturación → revertidos: ${fix.B.length}`);
  fix.B.forEach((x) => console.log(`     - ${x}`));
  console.log(`  C) Postal sin handling → revertidos: ${fix.C.length}`);
  fix.C.forEach((x) => console.log(`     - ${x}`));
  console.log(`  D) Handling impago + en despacho → revertidos: ${fix.D.length}`);
  fix.D.forEach((x) => console.log(`     - ${x}`));
  console.log(`  E) Inmov + despacho físico iniciado → revertidos: ${fix.E.length}`);
  fix.E.forEach((x) => console.log(`     - ${x}`));
}

run();
