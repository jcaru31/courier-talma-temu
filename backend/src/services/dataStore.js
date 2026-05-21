const fs = require('fs').promises;
const path = require('path');
const { shiftRecursive, unshiftRecursive } = require('../utils/time');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'courier_data.json');

/**
 * El archivo en disco vive anclado a un día fijo (ANCHOR_DAY). Al leer
 * desplazamos todas las fechas al día actual en Lima; al escribir hacemos
 * el camino inverso para conservar el ancla en el archivo. Así el demo
 * siempre se ve coherente con "hoy" sin regenerar el JSON.
 */
async function read() {
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  return shiftRecursive(JSON.parse(raw));
}

async function write(data) {
  const tmp = DATA_FILE + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(unshiftRecursive(data), null, 2), 'utf8');
  await fs.rename(tmp, DATA_FILE);
}

async function update(mutator) {
  const data = await read();
  const result = await mutator(data);
  await write(data);
  return result;
}

module.exports = { read, write, update, DATA_FILE };
