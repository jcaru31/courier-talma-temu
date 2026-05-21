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

// Faltante — signo de interrogación (la guía manifestada no arribó).
function IconFaltante({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  );
}

// Parcial — círculo a media carga (faltan bultos).
function IconParcial({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" stroke="none" />
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

// Mal estado — triángulo de advertencia.
function IconMalEstado({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2 1 21h22L12 2zm0 6 6 11H6l6-11zm-1 4v3h2v-3h-2zm0 4v2h2v-2h-2z" />
    </svg>
  );
}
