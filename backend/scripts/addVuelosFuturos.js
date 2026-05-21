/**
 * Agrega vuelos PLANIFICADOS para 2026-05-09 (= dia ancla + 1 = "mañana"
 * post-shift). El demo originalmente solo tenia vuelos de los 7 dias previos
 * al ancla, asi que el filtro "Mañana" quedaba vacio. Aqui clonamos 2 vuelos
 * recientes y los reproyectamos +1 dia, dejandolos como PLANIFICADO con la
 * trazabilidad y timeline reseteados (todavia no incorporados al manifiesto).
 *
 * Idempotente: si ya existen los manifiestos sintéticos los reescribe.
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'courier_data.json');
const ANCHOR = '2026-05-08';
const MANANA = '2026-05-09';

const SUFIJO = '-FUT';
// Tomamos 2 vuelos "plantilla" del dia ancla — uno LATAM, uno YANGTZE.
const PLANTILLAS = ['2026-20100', '2026-20107'];
const NUEVOS_MNF = ['2026-20200', '2026-20201'];

function shiftIsoDay(iso, days) {
  const m = iso && iso.match(/^(\d{4})-(\d{2})-(\d{2})T(.+)$/);
  if (!m) return iso;
  const dt = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}T${m[4]}`;
}
function shiftDay(s, days) {
  if (!s) return s;
  const dt = new Date(s + 'T00:00:00Z');
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function clonarComoPlanificado(awb, nuevoMnf, idx) {
  const cp = JSON.parse(JSON.stringify(awb));
  cp.id = awb.id + SUFIJO + idx;
  cp.manifiesto = nuevoMnf;
  cp.fecha = shiftDay(awb.fecha, 1);
  cp.eta = shiftIsoDay(awb.eta, 1);
  cp.fecha_salida_origen = shiftIsoDay(awb.fecha_salida_origen, 1);
  cp.fecha_emision = shiftIsoDay(awb.fecha_emision, 1);

  // Datos de vuelo: nuevo manifiesto, manifiesto numerado dia ancla aún (lo
  // habitual: las aerolineas pre-incorporan guias 1-2 dias antes).
  cp.manifiesto_carga = {
    ...awb.manifiesto_carga,
    numero_manifiesto: nuevoMnf,
    fecha_zarpe: cp.fecha_salida_origen,
    fecha_estimada_llegada: cp.eta,
    fecha_numeracion: shiftIsoDay(awb.manifiesto_carga.fecha_numeracion, 1),
    fecha_incorporacion_guias: shiftIsoDay(awb.manifiesto_carga.fecha_incorporacion_guias, 1),
  };

  // Reset operativo: aun no aterriza, todavia nada en almacen.
  cp.status = 'PLANIFICADO';
  cp.volante = null;
  cp.handling_pagado = false;
  cp.bultos_recibidos = 0;
  cp.kgs_recibidos = 0;
  cp.bultos_mal_estado = 0;
  cp.bultos_faltantes = 0;
  cp.tarja_porcentaje = 0;
  cp.dam = null;
  cp.canal_dam = null;
  cp.alertas_activas_ids = [];
  // Acta de mal estado no aplica a un planificado.
  delete cp.acta_mal_estado;

  // Timeline: solo aerolinea queda completada (manifiesto numerado), el resto
  // pendiente.
  cp.timeline = {
    aerolinea: { estado: 'COMPLETADO' },
    recepcion: { estado: 'PENDIENTE', fecha_inicio: null, fecha_fin: null },
    tarja: { estado: 'PENDIENTE', fecha_inicio: null, fecha_fin: null },
    aduanas: { estado: 'PENDIENTE', subeventos: [] },
    despacho_eseer: { estado: 'PENDIENTE', subeventos: [] },
  };
  return cp;
}

function run() {
  const data = JSON.parse(fs.readFileSync(FILE, 'utf-8'));
  // Limpia clones previos para que la corrida sea idempotente.
  data.awb_masters = data.awb_masters.filter((a) => !a.id.includes(SUFIJO));

  let creados = 0;
  PLANTILLAS.forEach((mnf, idx) => {
    const guiasPlantilla = data.awb_masters.filter((a) => a.manifiesto === mnf);
    const nuevoMnf = NUEVOS_MNF[idx];
    // Generamos un nuevo numero de vuelo (incrementa 1 al del original)
    const ejemplo = guiasPlantilla[0];
    if (!ejemplo) return;
    const vueloOriginal = ejemplo.vuelo;
    const nuevoVuelo = vueloOriginal.replace(/(\d+)$/, (n) => String(Number(n) + 100).padStart(n.length, '0'));

    guiasPlantilla.slice(0, 8).forEach((awb, i) => {
      const cp = clonarComoPlanificado(awb, nuevoMnf, idx * 100 + i);
      cp.vuelo = nuevoVuelo;
      data.awb_masters.push(cp);
      creados++;
    });
  });

  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
  console.log(`Vuelos futuros agregados. AWBs nuevos: ${creados}`);
  console.log(`Manifiestos: ${NUEVOS_MNF.join(', ')}`);
}

run();
