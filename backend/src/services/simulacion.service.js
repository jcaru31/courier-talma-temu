const dataStore = require('./dataStore');
const whatsapp = require('./whatsapp.service');
const simulacionTemplates = require('../utils/simulacionTemplates');

/**
 * Mock estable del vuelo 5Y 8676 que la UI muestra como cabecera del panel.
 * Los datos calzan con courier_data.json (consignatario CLI-TEMU = PERU BOX S.A.C.,
 * aerolinea ATLAS AIR, ruta DFW->LIM). Se mantienen aqui hardcodeados a
 * proposito: es un track paralelo al flujo real y no debe acoplarse al JSON.
 */
const VUELO_5Y_8676 = {
  vuelo: '5Y 8676',
  aerolinea: 'ATLAS AIR INC.',
  ruta: 'DFW-LIM',
  eta: '2026-05-27T18:30:00-05:00',
  estado: 'EN_RUTA',
  awbs: [
    {
      guia: '321-13300720',
      consignatario: 'PERU BOX S.A.C.',
      piezas: 240,
      kg: 1850,
    },
    {
      guia: '321-13300731',
      consignatario: 'PERU BOX S.A.C.',
      piezas: 120,
      kg: 920,
    },
  ],
};

const TELEFONO_E164 = /^\+[1-9]\d{6,14}$/;

function obtenerVuelo() {
  return VUELO_5Y_8676;
}

function listarTemplates() {
  return simulacionTemplates.listar();
}

function nuevoId(log) {
  const n = log.length + 1;
  return `NOT-${String(n).padStart(3, '0')}`;
}

/**
 * Mapea codigos de error de Meta a mensajes amigables.
 * Lista en GUIA_NOTIFICACIONES_WHATSAPP.md seccion 11.
 */
function describirErrorMeta(metaError) {
  if (!metaError) return null;
  const { code, message } = metaError;
  const conocidos = {
    190: 'Token de acceso expirado o invalido',
    131030: 'Numero no verificado en Meta (test mode permite hasta 5 numeros)',
    132001: 'El template aun no esta APPROVED en Meta',
    131005: 'Acceso denegado (cliente no respondio en las ultimas 24h)',
  };
  return { code, message, hint: conocidos[code] || null };
}

async function notificar({ tipoAlerta, telefono, guia }) {
  if (!tipoAlerta || !simulacionTemplates.existe(tipoAlerta)) {
    const err = new Error(`tipoAlerta "${tipoAlerta}" no esta en el catalogo`);
    err.status = 400;
    err.code = 'TIPO_ALERTA_INVALIDO';
    throw err;
  }

  if (!telefono || !TELEFONO_E164.test(telefono)) {
    const err = new Error('telefono debe estar en formato E.164 (ej. +51933660928)');
    err.status = 400;
    err.code = 'TELEFONO_INVALIDO';
    throw err;
  }

  const awbBase = VUELO_5Y_8676.awbs.find((a) => a.guia === guia) || VUELO_5Y_8676.awbs[0];

  const ctx = {
    guia: awbBase.guia,
    consignatario: awbBase.consignatario,
    aerolinea: VUELO_5Y_8676.aerolinea,
    vuelo: VUELO_5Y_8676.vuelo,
  };

  const templatePayload = simulacionTemplates.build(tipoAlerta, ctx);

  // Meta acepta el numero sin el '+' inicial.
  const toMeta = telefono.replace(/^\+/, '');

  let resultado;
  let metaError = null;
  try {
    resultado = await whatsapp.sendTemplate({ to: toMeta, template: templatePayload });
  } catch (err) {
    metaError = err.response?.data?.error || null;
    resultado = {
      ok: false,
      mock: false,
      message_id: null,
      error: metaError ? metaError.message : err.message,
    };
  }

  // Registrar en notificaciones_log con origen=SIMULACION.
  await dataStore.update(async (data) => {
    const entry = {
      id: nuevoId(data.notificaciones_log),
      fecha: new Date().toISOString(),
      canal: 'WHATSAPP',
      destinatario: telefono,
      alerta_id: null,
      awb_master_id: null,
      estado: resultado.ok ? 'ENVIADO' : 'FALLIDO',
      error: resultado.ok ? null : resultado.error,
      message_id_proveedor: resultado.message_id || null,
      mock: resultado.mock || false,
      origen: 'SIMULACION',
      template_name: tipoAlerta,
    };
    data.notificaciones_log.push(entry);
    return entry;
  });

  if (!resultado.ok) {
    const err = new Error(metaError?.message || resultado.error || 'Error enviando template');
    err.status = 502;
    err.code = 'META_API_ERROR';
    err.meta = describirErrorMeta(metaError);
    throw err;
  }

  if (resultado.mock) {
    return {
      ok: true,
      mock: true,
      template: tipoAlerta,
      telefono,
      payload: resultado.payload,
    };
  }

  return {
    ok: true,
    messageId: resultado.message_id,
    template: tipoAlerta,
    telefono,
  };
}

module.exports = { obtenerVuelo, listarTemplates, notificar };
