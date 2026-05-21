/**
 * Catálogo de aeropuertos: nombre legible + coordenadas aproximadas en el
 * viewBox del mapa estilizado (proyección equirectangular 400 x 200).
 */
export const PUERTOS = {
  LIM: { ciudad: 'Lima',         pais: 'Perú',          x: 114, y: 113 },
  MIA: { ciudad: 'Miami',        pais: 'EE.UU.',        x: 111, y: 71 },
  JFK: { ciudad: 'Nueva York',   pais: 'EE.UU.',        x: 118, y: 55 },
  LAX: { ciudad: 'Los Ángeles',  pais: 'EE.UU.',        x: 68,  y: 62 },
  PVG: { ciudad: 'Shanghái',     pais: 'China',         x: 335, y: 65 },
  HKG: { ciudad: 'Hong Kong',    pais: 'China',         x: 327, y: 75 },
  CAN: { ciudad: 'Cantón',       pais: 'China',         x: 326, y: 74 },
  MAD: { ciudad: 'Madrid',       pais: 'España',        x: 196, y: 55 },
  AMS: { ciudad: 'Ámsterdam',    pais: 'Países Bajos',  x: 205, y: 42 },
  CDG: { ciudad: 'París',        pais: 'Francia',       x: 204, y: 46 },
  GRU: { ciudad: 'São Paulo',    pais: 'Brasil',        x: 148, y: 126 },
  NRT: { ciudad: 'Tokio',        pais: 'Japón',         x: 356, y: 60 },
  ICN: { ciudad: 'Seúl',         pais: 'Corea del Sur', x: 340, y: 58 },
};

export function puerto(iata) {
  return PUERTOS[iata] || { ciudad: iata || '—', pais: '', x: 200, y: 100 };
}

/** Nombre corto "Ciudad, País" para mostrar como Puerto de Origen. */
export function nombrePuerto(iata) {
  const p = PUERTOS[iata];
  if (!p) return iata || '—';
  return p.pais ? `${p.ciudad}, ${p.pais}` : p.ciudad;
}
