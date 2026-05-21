const express = require('express');
const ctrl = require('../controllers/inventario.controller');

const router = express.Router();

router.get('/', ctrl.list);

module.exports = router;
