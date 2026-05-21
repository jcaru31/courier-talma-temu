/**
 * Etiquetas compactas con las alertas activas de la guía. Solo muestran el
 * tipo (sin nro. de acta ni fecha — innecesarios en el cabezal). El motivo
 * completo queda como tooltip por si el operador lo necesita.
 */
const ESTILO_POR_TIPO = {
  INMOVILIZACION: { cls: 'bg-orange-50 border-orange-300 text-orange-700', label: 'Inmovilizada' },
  MAL_ESTADO:     { cls: 'bg-red-50    border-red-300    text-danger',     label: 'Mal estado' },
  GUIA_FALTANTE:  { cls: 'bg-violet-50 border-violet-300 text-violet-700', label: 'Faltante' },
};

export default function AlertasEtiquetas({ alertas }) {
  if (!alertas || alertas.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {alertas.map((a) => {
        const est = ESTILO_POR_TIPO[a.tipo] || { cls: 'bg-slate-50 border-slate-300 text-slate-700', label: a.tipo };
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
