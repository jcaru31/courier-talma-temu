export default function EtapaIcono({ etapa, activo }) {
  const color = activo ? '#0D2B6B' : '#94A3B8';
  const ICONOS = {
    recepcion: <Camion color={color} />,
    tarja: <Tarja color={color} />,
    almacenamiento: <Almacen color={color} />,
    aduanas: <Aduanas color={color} />,
    despacho_eseer: <Despacho color={color} />,
  };
  return ICONOS[etapa] || null;
}

function Camion({ color }) {
  return (
    <svg width="56" height="56" viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="22" width="32" height="22" rx="2" />
      <path d="M38 28h12l8 8v8H38z" />
      <circle cx="18" cy="48" r="5" fill="white" />
      <circle cx="46" cy="48" r="5" fill="white" />
      <line x1="14" y1="28" x2="30" y2="28" strokeWidth="1.5" />
      <line x1="14" y1="34" x2="30" y2="34" strokeWidth="1.5" />
    </svg>
  );
}

function Tarja({ color }) {
  return (
    <svg width="56" height="56" viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="14" y="20" width="36" height="24" rx="2" />
      <circle cx="22" cy="32" r="2" fill={color} />
      <line x1="28" y1="28" x2="44" y2="28" strokeWidth="1.5" />
      <line x1="28" y1="32" x2="44" y2="32" strokeWidth="1.5" />
      <line x1="28" y1="36" x2="40" y2="36" strokeWidth="1.5" />
      <path d="M30 18v-4M34 18v-4" />
      <circle cx="20" cy="50" r="2" fill={color} />
      <circle cx="44" cy="50" r="2" fill={color} />
      <line x1="14" y1="44" x2="14" y2="50" />
      <line x1="50" y1="44" x2="50" y2="50" />
    </svg>
  );
}

function Almacen({ color }) {
  return (
    <svg width="56" height="56" viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 26 32 14l24 12v22H8z" />
      <rect x="16" y="34" width="10" height="10" />
      <rect x="38" y="34" width="10" height="10" />
      <line x1="8" y1="48" x2="56" y2="48" />
    </svg>
  );
}

function Aduanas({ color }) {
  return (
    <svg width="56" height="56" viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="10" y="20" width="44" height="24" rx="2" />
      <path d="M22 20v24M42 20v24" />
      <path d="M28 32h8M28 36h8" strokeWidth="1.5" />
      <path d="M14 48h36" />
    </svg>
  );
}

function Despacho({ color }) {
  return (
    <svg width="56" height="56" viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M46 36l-2-8 8-8c2-2 4-2 6-2 0 2 0 4-2 6l-8 8 8 2-4 4-6-2z" />
      <path d="M12 18l4 14-4 6h-4l-2-2 4-4 2-14z" transform="translate(8 6)" />
      <path d="M14 50l4 2 2-4" />
    </svg>
  );
}
