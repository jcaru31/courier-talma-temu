/**
 * Iconos por tipo de alerta. Se usan tanto en los pills de filtro
 * (AlertasInline) como en el icono al inicio de la fila de la tabla de guías,
 * para que el mismo símbolo identifique la alerta en ambos lugares.
 * El color lo controla el contenedor vía `currentColor`.
 */
export function IconoAlerta({ tipo, size = 14 }) {
  switch (tipo) {
    case 'faltantes':  return <IconFaltante size={size} />;
    case 'parciales':  return <IconParcial size={size} />;
    case 'inmov':      return <IconInmov size={size} />;
    case 'mal_estado': return <IconMalEstado size={size} />;
    default:           return null;
  }
}

// Faltante — solo el signo de interrogación (sin círculo ni cuadro): la guía
// manifestada no arribó al terminal.
function IconFaltante({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 8.5a3.5 3.5 0 1 1 5.5 2.9c-1 .7-2 1.3-2 2.6" />
      <line x1="12" y1="18.5" x2="12.01" y2="18.5" />
    </svg>
  );
}

// Parcial — círculo pintado a la mitad (arribó con menos bultos de lo manifestado).
function IconParcial({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />
    </svg>
  );
}

// Inmovilizada — candado.
function IconInmov({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5zm-3 5a3 3 0 0 1 6 0v3H9V6z" />
    </svg>
  );
}

// Mal estado — una X grande.
function IconMalEstado({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="5" x2="19" y2="19" />
      <line x1="19" y1="5" x2="5" y2="19" />
    </svg>
  );
}
