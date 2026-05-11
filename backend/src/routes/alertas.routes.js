const express = require('express');
const ctrl = require('../controllers/alertas.controller');

const router = express.Router();

router.get('/', ctrl.list);
router.post('/sincronizar-notificaciones', ctrl.sincronizar);
router.post('/:id/notificar', ctrl.notificar);

module.exports = router;
