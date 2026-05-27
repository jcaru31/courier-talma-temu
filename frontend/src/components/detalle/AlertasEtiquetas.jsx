/**
 * Etiquetas compactas con las alertas activas de la guía. Solo muestran el
 * tipo (sin nro. de acta ni fecha — innecesarios en el cabezal). El motivo
 * completo queda como tooltip por si el operador lo necesita.
 */
const ESTILO_POR_TIPO = {
  INMOVILIZACION: { cls: 'bg-orange-50 border-orange-300 text-orange-700', label: 'Inmovilizada' },
  MAL_ESTADO:     { cls: 'bg-red-50    border-red-300    text-danger',     label: 'Mal estado' },
  GUIA_FALTANTE:  { cls: 'bg-slate-100 border-slate-300 text-slate-600', label: 'Faltante' },
  PARCIAL:        { cls: 'bg-amber-50  border-amber-300  text-amber-700', label: 'Parcial' },
};

// `onMalEstado` (opcional): si se pasa, la etiqueta "Mal estado" se vuelve un
// botón que abre el acta (con un ícono de documento). El resto de etiquetas
// siguen siendo informativas.
export default function AlertasEtiquetas({ alertas, onMalEstado = null }) {
  if (!alertas || alertas.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {alertas.map((a) => {
        const est = ESTILO_POR_TIPO[a.tipo] || { cls: 'bg-slate-50 border-slate-300 text-slate-700', label: a.tipo };
        const clickable = a.tipo === 'MAL_ESTADO' && onMalEstado;
        if (clickable) {
          return (
            <button
              key={a.id}
              type="button"
              onClick={onMalEstado}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider transition hover:brightness-95 hover:shadow-sm ${est.cls}`}
              title={`${a.motivo || 'Mal estado'} — ver acta`}
            >
              {est.label}
              <IconDoc />
            </button>
          );
        }
        return (
          <span
            key={a.id}
            className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${est.cls}`}
            title={a.motivo}
          >
            {est.label}
          </span>
        );
      })}
    </div>
  );
}

function IconDoc() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <line x1="8" y1="13" x2="14" y2="13" />
      <line x1="8" y1="17" x2="13" y2="17" />
    </svg>
  );
}
