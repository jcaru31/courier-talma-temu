/**
 * Iconos sobrios para las 6 etapas de la trazabilidad de vuelo importacion.
 * Paleta: navy si activo (#0D2B6B), slate-300 si pendiente.
 */
const COLORS = {
  active: '#0D2B6B',
  pending: '#94A3B8',
};

export default function EtapaIcono({ etapa, activo, size = 28 }) {
  const stroke = activo ? COLORS.active : COLORS.pending;
  const ICONOS = {
    traslado: <Traslado color={stroke} size={size} />,
    recepcion: <Recepcion color={stroke} size={size} />,
    transmisiones: <Transmisiones color={stroke} size={size} />,
    almacenamiento: <Almacenamiento color={stroke} size={size} />,
    facturacion: <Facturacion color={stroke} size={size} />,
    despacho: <Despacho color={stroke} size={size} />,
  };
  return ICONOS[etapa] || null;
}

function svg(size, children) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

function Traslado({ color, size }) {
  // Avion aterrizando
  return svg(size, (
    <g stroke={color}>
      <path d="M2.5 19h19" />
      <path d="M21 14.5l-7.5-1.2-2.2-5L9 8l.6 4.4-4.8-.8-1.3-1.4-1 .4 1.5 3 1.2 2.5L21 16.5z" fill={color} fillOpacity="0.12" />
    </g>
  ));
}

function Recepcion({ color, size }) {
  // Clipboard con check
  return svg(size, (
    <g stroke={color}>
      <rect x="6" y="4" width="12" height="17" rx="2" fill={color} fillOpacity="0.08" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <path d="M9 12l2 2 4-4" strokeWidth="2" />
    </g>
  ));
}

function Transmisiones({ color, size }) {
  // Antena con ondas
  return svg(size, (
    <g stroke={color}>
      <path d="M12 16v4" />
      <path d="M9 20h6" />
      <circle cx="12" cy="13" r="1.5" fill={color} />
      <path d="M8 9a5 5 0 0 1 8 0" />
      <path d="M5.5 6.5a8.5 8.5 0 0 1 13 0" />
    </g>
  ));
}

function Almacenamiento({ color, size }) {
  // Bodega / cajas apiladas
  return svg(size, (
    <g stroke={color}>
      <path d="M3 9l9-5 9 5v11H3z" fill={color} fillOpacity="0.08" />
      <rect x="7" y="13" width="4" height="4" />
      <rect x="13" y="13" width="4" height="4" />
      <line x1="3" y1="20" x2="21" y2="20" />
    </g>
  ));
}

function Facturacion({ color, size }) {
  // Documento factura con $
  return svg(size, (
    <g stroke={color}>
      <path d="M7 3h8l3 3v15H7z" fill={color} fillOpacity="0.08" />
      <path d="M15 3v3h3" />
      <path d="M12 10v6" />
      <path d="M14 11.5h-2.5a1.5 1.5 0 0 0 0 3h1a1.5 1.5 0 0 1 0 3H10" />
    </g>
  ));
}

function Despacho({ color, size }) {
  // Camion saliendo
  return svg(size, (
    <g stroke={color}>
      <rect x="2" y="7" width="11" height="10" rx="1" fill={color} fillOpacity="0.08" />
      <path d="M13 10h5l3 3v4h-8z" />
      <circle cx="7" cy="19" r="1.8" fill="white" />
      <circle cx="17" cy="19" r="1.8" fill="white" />
    </g>
  ));
}
