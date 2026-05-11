const dataStore = require('../services/dataStore');

async function list(req, res, next) {
  try {
    const data = await dataStore.read();
    const log = [...data.notificaciones_log].sort(
      (a, b) => new Date(b.fecha) - new Date(a.fecha)
    );
    res.json({ items: log, total: log.length });
  } catch (err) {
    next(err);
  }
}

module.exports = { list };
