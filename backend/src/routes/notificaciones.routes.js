const express = require('express');
const ctrl = require('../controllers/notificaciones.controller');

const router = express.Router();

router.get('/', ctrl.list);

module.exports = router;
