import { puerto } from '../../utils/puertos.js';

/**
 * Mapa estilizado minimalista para ver dónde se encuentra un vuelo en ruta.
 * Dibuja la trayectoria origen → LIM como un arco; la parte recorrida en
 * sólido y la restante punteada, con el avión interpolado según el progreso.
 *
 * Props:
 *   origen   — código IATA del aeropuerto de origen
 *   progreso — 0..100 (% de la ruta recorrido)
 */
export default function MapaVueloRuta({ origen, progreso = 0 }) {
  const t = Math.min(1, Math.max(0, progreso / 100));
  const o = puerto(origen);
  const d = puerto('LIM');

  // Punto de control del arco: a media ruta, elevado perpendicular para curvar.
  const midX = (o.x + d.x) / 2;
  const midY = (o.y + d.y) / 2;
  const dx = d.x - o.x;
  const dy = d.y - o.y;
  const dist = Math.hypot(dx, dy) || 1;
  // Normal hacia "arriba" (norte) para el arco
  const arco = Math.min(48, dist * 0.32);
  const cx = midX - (dy / dist) * arco;
  const cy = midY + (dx / dist) * arco;

  // Bézier cuadrática: P0=o, P1=(cx,cy), P2=d
  const bez = (tt) => {
    const u = 1 - tt;
    return {
      x: u * u * o.x + 2 * u * tt * cx + tt * tt * d.x,
      y: u * u * o.y + 2 * u * tt * cy + tt * tt * d.y,
    };
  };
  const pos = bez(t);
  // Tangente para rotar el avión
  const tg = {
    x: 2 * (1 - t) * (cx - o.x) + 2 * t * (d.x - cx),
    y: 2 * (1 - t) * (cy - o.y) + 2 * t * (d.y - cy),
  };
  const angulo = (Math.atan2(tg.y, tg.x) * 180) / Math.PI;

  // De Casteljau para la sub-curva recorrida [0, t]
  const A = { x: o.x + (cx - o.x) * t, y: o.y + (cy - o.y) * t };
  const pathRecorrido = `M ${o.x} ${o.y} Q ${A.x} ${A.y} ${pos.x} ${pos.y}`;
  const pathCompleto = `M ${o.x} ${o.y} Q ${cx} ${cy} ${d.x} ${d.y}`;

  return (
    <svg viewBox="0 0 400 200" className="w-full rounded-lg" style={{ background: 'linear-gradient(180deg,#EFF6FF 0%,#F8FAFC 100%)' }}>
      {/* Continentes simplificados (decorativos) */}
      <g fill="#E2E8F0" opacity="0.9">
        <path d="M40 28 L132 26 L126 58 L150 56 L150 78 L120 92 L96 74 L72 96 L46 58 Z" />
        <path d="M96 96 L150 92 L156 120 L138 168 L120 178 L108 138 L102 112 Z" />
        <path d="M182 32 L246 26 L262 50 L236 64 L200 66 L184 50 Z" />
        <path d="M196 70 L250 66 L260 118 L228 156 L206 132 L196 96 Z" />
        <path d="M250 24 L372 28 L378 78 L320 96 L276 78 L256 56 Z" />
        <path d="M322 120 L372 116 L378 148 L332 150 Z" />
      </g>
      {/* Grilla sutil */}
      <g stroke="#CBD5E1" strokeWidth="0.4" opacity="0.5">
        {[40, 80, 120, 160].map((y) => (
          <line key={y} x1="0" y1={y} x2="400" y2={y} />
        ))}
        {[80, 160, 240, 320].map((x) => (
          <line key={x} x1={x} y1="0" x2={x} y2="200" />
        ))}
      </g>

      {/* Ruta completa (punteada) */}
      <path d={pathCompleto} fill="none" stroke="#94A3B8" strokeWidth="1.6" strokeDasharray="4 3" strokeLinecap="round" />
      {/* Ruta recorrida (sólida) */}
      <path d={pathRecorrido} fill="none" stroke="#0D2B6B" strokeWidth="2.4" strokeLinecap="round" />

      {/* Punto origen */}
      <circle cx={o.x} cy={o.y} r="5" fill="#0D2B6B" />
      <circle cx={o.x} cy={o.y} r="9" fill="none" stroke="#0D2B6B" strokeWidth="1" opacity="0.4" />
      <text x={o.x} y={o.y - 13} textAnchor="middle" fontSize="9" fontWeight="700" fill="#0D2B6B">
        {origen}
      </text>

      {/* Punto destino LIM */}
      <circle cx={d.x} cy={d.y} r="5" fill="#00C853" />
      <circle cx={d.x} cy={d.y} r="9" fill="none" stroke="#00C853" strokeWidth="1" opacity="0.5" />
      <text x={d.x} y={d.y + 20} textAnchor="middle" fontSize="9" fontWeight="700" fill="#059669">
        LIM
      </text>

      {/* Avión en posición actual */}
      <g transform={`translate(${pos.x} ${pos.y}) rotate(${angulo})`}>
        <circle r="11" fill="#0D2B6B" opacity="0.12" />
        <g transform="rotate(45) scale(0.85)">
          <path
            d="M10 0 L-4 4 L-2 1 L-8 1 L-9 3 L-10 3 L-9 0 L-10 -3 L-9 -3 L-8 -1 L-2 -1 L-4 -4 Z"
            fill="#0D2B6B"
          />
        </g>
      </g>
    </svg>
  );
}
