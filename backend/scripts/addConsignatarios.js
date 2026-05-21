/**
 * Agrega CLI-SERHAFEN y CLI-FEDEX como clientes y reasigna ~60% de los AWB
 * masters entre los 3 consignatarios (TEMU mantiene ~40%, SERHAFEN ~30%,
 * FEDEX ~30%). Idempotente: usa hash del id del AWB para decidir, asi la
 * asignacion es estable en cada corrida.
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'courier_data.json');

const NUEVOS = [
  {
    id: 'CLI-SERHAFEN',
    nombre: 'SERHAFEN PERU S.A.C.',
    ruc: '20554478921',
    emails_notificaciones: ['operaciones.lim@serhafen.pe'],
    whatsapp_notificaciones: ['+51999777666'],
    contactos: [
      { nombre: 'Mariana Quiroz', rol: 'Coordinadora aduanas', email: 'operaciones.lim@serhafen.pe', telefono: '+51999777666' },
    ],
  },
  {
    id: 'CLI-FEDEX',
    nombre: 'FEDEX EXPRESS PERU S.A.C.',
    ruc: '20498217643',
    emails_notificaciones: ['ops.peru@fedex.com'],
    whatsapp_notificaciones: ['+51998123456'],
    contactos: [
      { nombre: 'Carlos Rivero', rol: 'Gerente operaciones', email: 'ops.peru@fedex.com', telefono: '+51998123456' },
    ],
  },
];

// xmur3 hash — distribuye mucho mejor que el polinomial simple para IDs
// secuenciales del tipo "AWB-001..AWB-100" (que de otro modo caen en
// bloques contiguos del mismo bucket).
function hash(s) {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  h ^= h >>> 16;
  return Math.abs(h);
}

function bucketDeterminista(awbId) {
  const h = hash(awbId) % 100;
  if (h < 40) return 'CLI-TEMU';
  if (h < 70) return 'CLI-SERHAFEN';
  return 'CLI-FEDEX';
}

function run() {
  const data = JSON.parse(fs.readFileSync(FILE, 'utf-8'));
  const existentes = new Set(data.clientes.map((c) => c.id));
  for (const c of NUEVOS) {
    if (!existentes.has(c.id)) {
      data.clientes.push(c);
    }
  }
  const conteo = { 'CLI-TEMU': 0, 'CLI-SERHAFEN': 0, 'CLI-FEDEX': 0 };
  for (const a of data.awb_masters) {
    a.consignatario_id = bucketDeterminista(a.id);
    conteo[a.consignatario_id]++;
  }
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
  console.log('Clientes:', data.clientes.length);
  console.log('Distribucion AWBs:', conteo);
}

run();
