/**
 * Agrega el campo `acta_mal_estado` a cada AWB con `bultos_mal_estado > 0`.
 * El acta replica el formato real TALMA (ACM): manifiesto / vuelo / guia,
 * totales bultos/peso, tipo de daño, motivo, observaciones y la lista de
 * fotos. Las fotos y el PDF original se sirven estaticamente desde
 * `backend/data/actas/` (ver dataStore + server.js).
 *
 * Idempotente: si el AWB ya tiene acta_mal_estado la sobreescribe con los
 * mismos valores deterministas (basados en su id), asi se puede correr varias
 * veces sin generar drift.
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'courier_data.json');

const TIPOS_DANO = [
  { tipo: 'EMBALAJE ABOLLADO',       obs: 'CAJAS DE CARTÓN PRESENTAN EMBALAJE ABOLLADO Y RASGADO' },
  { tipo: 'PRECINTO VIOLADO',        obs: 'PRECINTO DE SEGURIDAD ALTERADO, REQUIERE INVENTARIO FÍSICO' },
  { tipo: 'EMBALAJE RASGADO',        obs: 'BULTO CON EMBALAJE ROTO Y SIGNOS DE MANIPULACIÓN PREVIA' },
  { tipo: 'EMPAQUE ABIERTO',         obs: 'EMPAQUE PARCIALMENTE ABIERTO, RIESGO DE MERMAS' },
  { tipo: 'EMBALAJE HÚMEDO',         obs: 'CAJA CON HUMEDAD Y DEFORMACIÓN ESTRUCTURAL VISIBLE' },
];
const ACCIONES = ['NO APERTURA DEL BULTO'];
const MOTIVOS = ['POR SEGURIDAD A LA CARGA'];

// Seed deterministico para que la misma guia siempre rinda los mismos textos.
function pick(arr, seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return arr[Math.abs(h) % arr.length];
}

function numeroActa(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 131 + seed.charCodeAt(i)) | 0;
  return `2026${String(Math.abs(h) % 1_000_000).padStart(6, '0')}`;
}

function actaFor(awb) {
  if (!awb.bultos_mal_estado || awb.bultos_mal_estado <= 0) return null;

  const danoSel = pick(TIPOS_DANO, awb.id);
  const totalBultos = awb.bultos_recibidos || awb.bultos_esperados || 0;
  const malBultos = awb.bultos_mal_estado;
  // Peso unitario aproximado segun lo recibido — se reparte proporcionalmente.
  const kgsTotal = awb.kgs_recibidos || awb.kgs_esperados || 0;
  const kgsMal = totalBultos > 0 ? +(kgsTotal * (malBultos / totalBultos)).toFixed(2) : 0;
  const kgsBuen = +(kgsTotal - kgsMal).toFixed(2);
  const fechaIng = awb.timeline?.recepcion?.fecha_inicio || awb.fecha_emision;

  return {
    numero_acta: numeroActa(awb.id),
    fecha_emision: fechaIng,
    manifiesto: awb.manifiesto_carga?.numero_manifiesto || awb.manifiesto,
    fecha_ingreso: fechaIng,
    vuelo: (awb.vuelo || '').replace(/[^0-9]/g, '').padStart(4, '0').slice(-4),
    guia_madre: awb.awb,
    guia_hija: awb.awb,
    n_detalle: 1,
    consignatario: 'DELVASESQ INDUSTRIES SAC',
    contenido_manifestado: pick(['COFFEE MACHINE', 'CONSUMER ELECTRONICS', 'HOME APPLIANCES', 'TEXTILES'], awb.id),
    totales: {
      bultos_total: totalBultos,
      bultos_mal_estado: malBultos,
      bultos_buen_estado: totalBultos - malBultos,
      peso_total: kgsTotal,
      peso_mal_estado: kgsMal,
      peso_buen_estado: kgsBuen,
    },
    descripcion: {
      grupo: String(216000 + Math.abs(numeroActa(awb.id).slice(-4) | 0) % 999),
      tipo_bulto: 'CAJA(S)',
      material_envase: 'CARTON',
      tipo_dano: danoSel.tipo,
      accion_tomada: pick(ACCIONES, awb.id),
      motivo: pick(MOTIVOS, awb.id),
      observaciones: danoSel.obs,
    },
    // Las fotos y el PDF original son compartidos para la demo. El usuario los
    // dropea a backend/data/actas/photos/foto-N.jpg y acta-original.pdf
    // respectivamente.
    fotos: [
      '/actas/photos/foto-1.png',
      '/actas/photos/foto-2.png',
      '/actas/photos/foto-3.png',
      '/actas/photos/foto-4.png',
      '/actas/photos/foto-5.png',
      '/actas/photos/foto-6.png',
    ],
    pdf: '/actas/acta-original.pdf',
  };
}

function run() {
  const data = JSON.parse(fs.readFileSync(FILE, 'utf-8'));
  let cnt = 0;
  for (const awb of data.awb_masters) {
    const acta = actaFor(awb);
    if (acta) {
      awb.acta_mal_estado = acta;
      cnt++;
    } else if (awb.acta_mal_estado) {
      // limpia si la guia perdio su mal_estado en alguna regeneracion
      delete awb.acta_mal_estado;
    }
  }
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
  console.log(`Actualizado courier_data.json: ${cnt} AWBs con acta_mal_estado.`);
}

run();
