const fs = require('fs').promises;
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'courier_data.json');

async function read() {
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  return JSON.parse(raw);
}

async function write(data) {
  const tmp = DATA_FILE + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tmp, DATA_FILE);
}

async function update(mutator) {
  const data = await read();
  const result = await mutator(data);
  await write(data);
  return result;
}

module.exports = { read, write, update, DATA_FILE };
