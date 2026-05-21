/**
 * Crea ejemplos de guías con ALERTAS COMBINADAS y normaliza las reglas de
 * negocio sobre courier_data.json. Idempotente: las alertas que genera llevan
 * id con prefijo `ALR-CMB-` y las guías que transforma se reconstruyen desde
 * un baseline limpio en cada corrida (mismas guías → mismo resultado).
 *
 * Reglas que aplica a TODO el dataset:
 *   1. Una guía FALTANTE va sola: no puede tener mal estado / inmovilización
 *      (si no arribó, no hay carga que dañar ni retener).
 *
 * Combinaciones válidas que demuestra (repartidas en varios vuelos):
 *   parcial + mal estado + inmovilización   (triple, canal rojo)
 *   mal estado + inmovilización
 *   parcial  + inmovilización
 *   parcial  + mal estado
 *
 * Correr DESPUÉS de generateData / addConsignatarios y ANTES (o re-correr
 * después) de addActasMalEstado, para que las guías que quedan con
 * bultos_mal_estado > 0 reciban su acta.
 *
 * Uso:  node scripts/addAlertasCombinadas.js
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'courier_data.json');

// Catálogo de combinaciones a repartir (cumple la regla: nunca faltante con
// otra cosa).
const COMBOS = [
  ['parcial', 'mal_estado', 'inmov'],
  ['mal_estado', 'inmov'],
  ['parcial', 'inmov'],
  ['parcial', 'mal_estado'],
];

// Cuántas guías combinadas por vuelo (se reparten entre los vuelos elegibles).
const POR_VUELO = 2;

const MOTIVOS_MAL_ESTADO = [
  'Bultos con embalaje roto y signos de manipulación previa',
  'Caja con humedad y deformación estructural visible',
  'Mercancía con golpes y precintos violados',
  'Empaque parcialmente abierto, riesgo de mermas',
];

// --- helpers de tiempo --------------------------------------------------
function pad(n, size = 2) { return String(n).padStart(size, '0'); }

function isoOffset(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}-05:00`;
}
function addMin(date, min) { return new Date(date.getTime() + min * 60000); }

// hash determinista para sembrar números de acta estables por guía.
function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 131 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function numActa(prefix, id) {
  return `${prefix}-2026-${pad(hash(prefix + id) % 100000, 5)}`;
}

// --- construcción de timeline "atascada en aduanas" ---------------------
// Todas las combinaciones implican una guía que arribó pero quedó retenida
// (mal estado / inmovilización) o parcial: en la práctica no ha pasado el hito
// de transmisión (volante pendiente). Reconstruimos un timeline
// coherente: recepción + tarja + almacén COMPLETADO, aduanas EN_CURSO con la
// retención activa, despacho PENDIENTE.
function buildTimeline(eta, { bultos, kgs, canal, diferencias, retencion }) {
  const tRec0 = addMin(eta, 20);
  const tRec2 = addMin(tRec0, 40);
  const tTar0 = addMin(tRec2, 15);
  const tTar2 = addMin(tTar0, 50);
  const tAlm0 = addMin(tTar2, 15);
  const tAlm2 = addMin(tAlm0, 60);
  const tAdu0 = addMin(tAlm2, 20);
  const tAduRet = addMin(tAdu0, 120);

  // Descarga transmitida; volante y aviso de llegada aún pendientes (la guía
  // quedó retenida antes de emitirse el volante).
  const aduanasSubs = [
    { nombre: 'Transmision de descarga de mercancia', fecha: isoOffset(tAdu0), estado: 'COMPLETADO' },
    { nombre: 'Emision de volante', fecha: null, estado: 'PENDIENTE' },
    { nombre: 'Aviso de llegada', fecha: null, estado: 'PENDIENTE' },
  ];
  if (retencion === 'inmov') {
    aduanasSubs.push({ nombre: 'Inmovilizacion canal rojo sin levante', fecha: isoOffset(tAduRet), estado: 'ACTIVA' });
  }

  return {
    recepcion: {
      estado: 'COMPLETADO', fecha_inicio: isoOffset(tRec0), fecha_fin: isoOffset(tRec2),
      subeventos: [
        { nombre: 'Generacion de turno', fecha: isoOffset(tRec0), estado: 'COMPLETADO' },
        { nombre: 'En dique', fecha: isoOffset(addMin(tRec0, 20)), estado: 'COMPLETADO' },
        { nombre: 'Inspeccion visual', fecha: isoOffset(tRec2), estado: 'COMPLETADO' },
      ],
    },
    tarja: {
      estado: 'COMPLETADO', fecha_inicio: isoOffset(tTar0), fecha_fin: isoOffset(tTar2),
      subeventos: [
        { nombre: 'Inicio tarja', fecha: isoOffset(tTar0), estado: 'COMPLETADO' },
        { nombre: 'Conteo de bultos', fecha: isoOffset(addMin(tTar0, 30)), estado: 'COMPLETADO', detalle: { contados: bultos - diferencias, esperados: bultos } },
        { nombre: 'Diferencias detectadas', fecha: isoOffset(tTar2), estado: diferencias > 0 ? 'ACTIVA' : 'COMPLETADO', detalle: { diferencias } },
      ],
    },
    almacenamiento: {
      estado: 'COMPLETADO', fecha_inicio: isoOffset(tAlm0), fecha_fin: isoOffset(tAlm2), dias_estadia: 2,
      subeventos: [
        { nombre: 'Estadia de carga', fecha: isoOffset(tAlm0), estado: 'COMPLETADO' },
        { nombre: 'Pesado', fecha: isoOffset(addMin(tAlm0, 30)), estado: 'COMPLETADO', detalle: { kgs } },
        { nombre: 'Asignacion de canal', fecha: isoOffset(tAlm2), estado: 'COMPLETADO', detalle: { canal } },
      ],
    },
    aduanas: {
      estado: 'EN_CURSO', fecha_inicio: isoOffset(tAdu0), fecha_fin: null,
      subeventos: aduanasSubs,
    },
    despacho_eseer: { estado: 'PENDIENTE', fecha_inicio: null, fecha_fin: null, subeventos: [] },
  };
}

// --- transformación de una guía a un combo ------------------------------
function aplicarCombo(awb, combo, alertas, eta) {
  const tieneParcial = combo.includes('parcial');
  const tieneMal = combo.includes('mal_estado');
  const retencion = combo.includes('inmov') ? 'inmov' : null;

  // Baseline limpio: arribó completa.
  const esperados = awb.bultos_esperados;
  const kgsEsp = awb.kgs_esperados;
  let recibidos = esperados;
  let kgsRec = kgsEsp;
  let diferencias = 0;

  if (tieneParcial) {
    diferencias = Math.max(2, Math.round(esperados * 0.06));
    recibidos = esperados - diferencias;
    kgsRec = Number((kgsEsp * (recibidos / esperados)).toFixed(2));
  }

  const malEstado = tieneMal ? Math.min(recibidos, Math.max(1, Math.round(recibidos * 0.03))) : 0;

  // Canal: rojo sin levante solo si inmovilizada; si no, verde con levante.
  const canalColor = retencion === 'inmov' ? 'ROJO' : 'VERDE';
  const conLevante = retencion !== 'inmov';

  // El combo es dueño total de las alertas de la guía: quita cualquier alerta
  // previa suya del array global (si no, quedan huérfanas — la agregación lee
  // por awb_master_id, no por alertas_activas_ids — y reaparecen).
  for (let i = alertas.length - 1; i >= 0; i--) {
    if (alertas[i].awb_master_id === awb.id) alertas.splice(i, 1);
  }

  awb.bultos_recibidos = recibidos;
  awb.kgs_recibidos = kgsRec;
  awb.bultos_faltantes = esperados - recibidos;
  awb.bultos_mal_estado = malEstado;
  awb.tarja_porcentaje = esperados > 0 ? Math.round((recibidos / esperados) * 100) : 0;
  awb.status = 'EN_PROCESO';
  awb.volante = null; // aún no se emite (retenida antes del volante)
  awb.canal_dam = {
    ...(awb.canal_dam || {}),
    color: canalColor,
    con_levante: conLevante,
  };
  if (!tieneMal) delete awb.acta_mal_estado; // addActasMalEstado lo repondrá si aplica

  // Alertas explícitas (parcial NO es entrada de alerta: es derivado de
  // bultos_faltantes). Construimos las que sí lo son.
  const nuevas = [];
  if (tieneMal) {
    nuevas.push({
      id: `ALR-CMB-${awb.id}-MAL`,
      awb_master_id: awb.id,
      tipo: 'MAL_ESTADO',
      estado: 'ACTIVA',
      numero_acta: numActa('RME', awb.id),
      fecha_emision: isoOffset(addMin(eta, 200)),
      fecha_resolucion: null,
      motivo: `Reporte de mal estado: ${MOTIVOS_MAL_ESTADO[hash('mal' + awb.id) % MOTIVOS_MAL_ESTADO.length]}.`,
      notificado: false,
      notificacion_ids: [],
    });
  }
  if (retencion === 'inmov') {
    nuevas.push({
      id: `ALR-CMB-${awb.id}-INM`,
      awb_master_id: awb.id,
      tipo: 'INMOVILIZACION',
      estado: 'ACTIVA',
      numero_acta: numActa('INM', awb.id),
      fecha_emision: isoOffset(addMin(eta, 260)),
      fecha_resolucion: null,
      motivo: 'Canal rojo asignado por aduanas. SUNAT no ha otorgado levante: la carga permanece inmovilizada en almacén hasta verificación documental y física.',
      notificado: false,
      notificacion_ids: [],
    });
  }

  alertas.push(...nuevas);
  awb.alertas_activas_ids = nuevas.map((a) => a.id);
  awb.timeline = buildTimeline(new Date(awb.eta), {
    bultos: esperados, kgs: kgsRec, canal: canalColor, diferencias, retencion,
  });
}

// --- normalización de reglas (todo el dataset) --------------------------
function normalizarReglas(data) {
  const idsFaltantes = new Set(
    data.awb_masters.filter((a) => a.status === 'GUIA_FALTANTE').map((a) => a.id)
  );

  // Regla 1: la guía faltante va sola — sin mal estado/inmov.
  for (const a of data.awb_masters) {
    if (a.status !== 'GUIA_FALTANTE') continue;
    a.bultos_mal_estado = 0;
    delete a.acta_mal_estado;
    if (a.canal_dam) { a.canal_dam.color = null; a.canal_dam.con_levante = false; }
    // bultos_faltantes = todo lo manifestado (no arribó nada).
    a.bultos_faltantes = a.bultos_esperados;
    a.bultos_recibidos = 0;
    a.kgs_recibidos = 0;
  }
  // Quita del array global cualquier alerta no-FALTANTE de una guía faltante.
  data.alertas = data.alertas.filter(
    (al) => !(idsFaltantes.has(al.awb_master_id) && al.tipo !== 'GUIA_FALTANTE')
  );
  // Reconstruye alertas_activas_ids de las faltantes (solo su GUIA_FALTANTE).
  for (const a of data.awb_masters) {
    if (a.status !== 'GUIA_FALTANTE') continue;
    a.alertas_activas_ids = data.alertas
      .filter((al) => al.awb_master_id === a.id && al.estado === 'ACTIVA')
      .map((al) => al.id);
  }
}

function run() {
  const data = JSON.parse(fs.readFileSync(FILE, 'utf-8'));

  // Idempotencia: limpia combos previos (alertas ALR-CMB-* y sus referencias).
  data.alertas = data.alertas.filter((al) => !String(al.id).startsWith('ALR-CMB-'));
  for (const a of data.awb_masters) {
    if (Array.isArray(a.alertas_activas_ids)) {
      a.alertas_activas_ids = a.alertas_activas_ids.filter((id) => !String(id).startsWith('ALR-CMB-'));
    }
  }

  // Elegibles: guías en proceso (no faltante / planificada / despachada),
  // agrupadas por vuelo para repartir las combinaciones.
  const elegiblePorVuelo = new Map();
  for (const a of data.awb_masters) {
    if (['GUIA_FALTANTE', 'PLANIFICADO', 'DESPACHADO_A_ESEER'].includes(a.status)) continue;
    if (!elegiblePorVuelo.has(a.manifiesto)) elegiblePorVuelo.set(a.manifiesto, []);
    elegiblePorVuelo.get(a.manifiesto).push(a);
  }

  let comboIdx = 0;
  let total = 0;
  const detalle = [];
  for (const [manifiesto, guias] of [...elegiblePorVuelo.entries()].sort()) {
    const objetivo = guias.slice(0, POR_VUELO);
    for (const awb of objetivo) {
      const combo = COMBOS[comboIdx % COMBOS.length];
      aplicarCombo(awb, combo, data.alertas, new Date(awb.eta));
      detalle.push(`  ${manifiesto} · ${awb.awb} → ${combo.join(' + ')}`);
      comboIdx++;
      total++;
    }
  }

  // Aplica las reglas de negocio a TODO el dataset (incluye lo recién creado).
  normalizarReglas(data);

  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
  console.log(`[combos] ${total} guías combinadas en ${elegiblePorVuelo.size} vuelos elegibles:`);
  console.log(detalle.join('\n'));
  console.log('[combos] regla aplicada: faltante va sola.');
  console.log('[combos] recordatorio: corre `node scripts/addActasMalEstado.js` para reponer las actas.');
}

run();
