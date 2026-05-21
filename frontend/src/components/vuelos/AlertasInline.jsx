import { IconoAlerta } from './alertaIconos.jsx';

/**
 * Alertas del vuelo en formato compacto: solo se dibujan los pills de las
 * alertas con valor > 0. Si no hay ninguna, la celda queda vacía.
 * Cuando `interactivo` es true (fila expandida) los pills filtran la tabla
 * de guías.
 */
const META = {
  faltantes:  { label: 'Falt',    accent: 'violet' },
  parciales:  { label: 'Parc',    accent: 'amber' },
  inmov:      { label: 'Inmov',   accent: 'orange' },
  mal_estado: { label: 'Mal est', accent: 'red' },
};

// Estilo compacto "gerencial": el icono y el número van en el color de la
// alerta, sin borde ni etiqueta de texto (el nombre vive en el tooltip).
const TEXT = {
  violet: 'text-violet-700',
  amber:  'text-amber-700',
  orange: 'text-orange-600',
  red:    'text-danger',
};
// Resalte cuando el filtro está activo (anillo + fondo suave del color).
const ACTIVE = {
  violet: 'bg-violet-50 ring-violet-500',
  amber:  'bg-amber-50 ring-amber-500',
  orange: 'bg-orange-50 ring-orange-500',
  red:    'bg-red-50 ring-red-500',
};

export default function AlertasInline({
  faltantes = 0,
  parciales = 0,
  inmov = 0,
  malEstado = 0,
  interactivo = false,
  alertaActiva = null,
  onAlertaClick = () => {},
}) {
  const valores = {
    faltantes,
    parciales,
    inmov,
    mal_estado: malEstado,
  };
  const activos = Object.keys(META).filter((t) => valores[t] > 0);

  // Sin alertas: la celda queda vacía (no se dibuja nada).
  if (activos.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {activos.map((tipo) => {
        const m = META[tipo];
        const clickeable = interactivo;
        const activa = clickeable && alertaActiva === tipo;
        const Comp = clickeable ? 'button' : 'div';
        return (
          <Comp
            key={tipo}
            {...(clickeable
              ? {
                  type: 'button',
                  onClick: (e) => {
                    e.stopPropagation();
                    onAlertaClick(activa ? null : tipo);
                  },
                }
              : {})}
            className={`inline-flex items-center gap-1 px-1.5 py-1 rounded-md transition ${TEXT[m.accent]} ${
              activa ? 'ring-2 ' + ACTIVE[m.accent] : clickeable ? 'hover:bg-slate-100' : ''
            } ${clickeable ? 'cursor-pointer' : ''}`}
            title={
              `${m.label}: ${valores[tipo]}` +
              (clickeable ? ' — clic para filtrar guías' : '')
            }
          >
            <IconoAlerta tipo={tipo} size={14} />
            <span className="text-[13px] font-bold tabular-nums">{valores[tipo]}</span>
          </Comp>
        );
      })}
    </div>
  );
}
