function asuntoAlerta(awb, alerta) {
  const tipo = alerta.tipo === 'ACE' ? 'ACE' : 'INMOVILIZACION';
  return `[ALERTA ${tipo}] AWB ${awb.awb} - Vuelo ${awb.vuelo}`;
}

function cuerpoEmailAlerta(awb, alerta, cliente) {
  return `Estimado equipo ${cliente.nombre},

Se ha registrado una alerta de tipo ${alerta.tipo} sobre la siguiente guia aerea:

  AWB:           ${awb.awb}
  Vuelo:         ${awb.vuelo}
  Aerolinea:     ${awb.aerolinea}
  Origen:        ${awb.origen}
  ETA:           ${awb.eta}
  Agente carga:  ${awb.agente_carga}

DETALLE DE LA ALERTA
  Tipo:          ${alerta.tipo}
  Nro. acta:     ${alerta.numero_acta}
  Fecha emision: ${alerta.fecha_emision}
  Motivo:        ${alerta.motivo}

Por favor coordinar con la agencia de aduana ${awb.canal_dam.agencia_aduana} para el levantamiento.

Saludos,
Talma - Sistema de Tracking Courier
`;
}

function cuerpoWhatsappAlerta(awb, alerta) {
  return `*ALERTA ${alerta.tipo}*

AWB: ${awb.awb}
Vuelo: ${awb.vuelo}
Acta: ${alerta.numero_acta}
Motivo: ${alerta.motivo}

Coordinar con agencia de aduana.`;
}

module.exports = { asuntoAlerta, cuerpoEmailAlerta, cuerpoWhatsappAlerta };
