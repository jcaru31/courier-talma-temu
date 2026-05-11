const dataStore = require('./dataStore');
const gmail = require('./gmail.service');
const whatsapp = require('./whatsapp.service');
const { asuntoAlerta, cuerpoEmailAlerta, cuerpoWhatsappAlerta } = require('../utils/templates');

function nuevoId(prefix, log) {
  const n = log.length + 1;
  return `${prefix}-${String(n).padStart(3, '0')}`;
}

async function notificarAlerta(alertaId) {
  return dataStore.update(async (data) => {
    const alerta = data.alertas.find((a) => a.id === alertaId);
    if (!alerta) throw new Error(`Alerta ${alertaId} no encontrada`);

    const awb = data.awb_masters.find((a) => a.id === alerta.awb_master_id);
    if (!awb) throw new Error(`AWB ${alerta.awb_master_id} no encontrado`);

    const cliente = data.clientes.find((c) => c.id === awb.consignatario_id);
    if (!cliente) throw new Error(`Cliente ${awb.consignatario_id} no encontrado`);

    const asunto = asuntoAlerta(awb, alerta);
    const bodyEmail = cuerpoEmailAlerta(awb, alerta, cliente);
    const bodyWa = cuerpoWhatsappAlerta(awb, alerta);

    const generadas = [];

    for (const email of cliente.emails_notificaciones || []) {
      const id = nuevoId('NOT', data.notificaciones_log);
      let resultado;
      try {
        resultado = await gmail.send({ to: email, subject: asunto, body: bodyEmail });
      } catch (err) {
        resultado = { ok: false, error: err.message };
      }
      const entry = {
        id,
        fecha: new Date().toISOString(),
        canal: 'EMAIL',
        destinatario: email,
        alerta_id: alerta.id,
        awb_master_id: awb.id,
        asunto,
        estado: resultado.ok ? 'ENVIADO' : 'FALLIDO',
        error: resultado.error || null,
        message_id_proveedor: resultado.message_id || null,
        mock: resultado.mock || false,
      };
      data.notificaciones_log.push(entry);
      generadas.push(entry);
    }

    for (const tel of cliente.whatsapp_notificaciones || []) {
      const id = nuevoId('NOT', data.notificaciones_log);
      let resultado;
      try {
        resultado = await whatsapp.send({ to: tel, body: bodyWa });
      } catch (err) {
        resultado = { ok: false, error: err.message };
      }
      const entry = {
        id,
        fecha: new Date().toISOString(),
        canal: 'WHATSAPP',
        destinatario: tel,
        alerta_id: alerta.id,
        awb_master_id: awb.id,
        estado: resultado.ok ? 'ENVIADO' : 'FALLIDO',
        error: resultado.error || null,
        message_id_proveedor: resultado.message_id || null,
        mock: resultado.mock || false,
      };
      data.notificaciones_log.push(entry);
      generadas.push(entry);
    }

    alerta.notificado = generadas.some((g) => g.estado === 'ENVIADO');
    alerta.notificacion_ids = [...(alerta.notificacion_ids || []), ...generadas.map((g) => g.id)];

    return generadas;
  });
}

async function sincronizarPendientes() {
  const data = await dataStore.read();
  const pendientes = data.alertas.filter((a) => a.estado === 'ACTIVA' && !a.notificado);
  const resultados = [];
  for (const alerta of pendientes) {
    try {
      const generadas = await notificarAlerta(alerta.id);
      resultados.push({ alerta_id: alerta.id, ok: true, generadas });
    } catch (err) {
      resultados.push({ alerta_id: alerta.id, ok: false, error: err.message });
    }
  }
  return resultados;
}

module.exports = { notificarAlerta, sincronizarPendientes };
