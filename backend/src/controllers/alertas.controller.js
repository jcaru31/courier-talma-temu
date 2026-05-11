const dataStore = require('../services/dataStore');
const notificationService = require('../services/notification.service');

async function list(req, res, next) {
  try {
    const data = await dataStore.read();
    let alertas = data.alertas;
    if (req.query.estado) {
      alertas = alertas.filter((a) => a.estado === req.query.estado);
    }
    if (req.query.tipo) {
      alertas = alertas.filter((a) => a.tipo === req.query.tipo);
    }
    res.json({ items: alertas, total: alertas.length });
  } catch (err) {
    next(err);
  }
}

async function notificar(req, res, next) {
  try {
    const generadas = await notificationService.notificarAlerta(req.params.id);
    res.json({ ok: true, generadas });
  } catch (err) {
    next(err);
  }
}

async function sincronizar(req, res, next) {
  try {
    const resultados = await notificationService.sincronizarPendientes();
    res.json({ ok: true, resultados });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, notificar, sincronizar };
