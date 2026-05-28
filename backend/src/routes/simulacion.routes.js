const express = require('express');
const ctrl = require('../controllers/simulacion.controller');

const router = express.Router();

router.get('/templates', ctrl.getTemplates);
router.get('/vuelo/5Y8676', ctrl.getVuelo);
router.post('/vuelo/notificar', ctrl.notificar);

module.exports = router;
