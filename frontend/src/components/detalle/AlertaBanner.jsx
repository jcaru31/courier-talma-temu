/**
 * Banner informativo de las alertas activas de la guía. Solo muestra datos —
 * la acción de notificación se gestiona desde otra superficie del producto.
 */
export default function AlertaBanner({ alertas }) {
  if (!alertas || alertas.length === 0) return null;

  return (
    <div className="space-y-2">
      {alertas.map((a) => (
        <div
          key={a.id}
          className="border-2 border-danger bg-red-50 rounded-lg p-4 flex items-start gap-3"
        >
          <div className="shrink-0 mt-0.5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#D32F2F">
              <path d="M12 2 1 21h22L12 2zm0 7 7 12H5l7-12zm-1 4v3h2v-3h-2zm0 4v2h2v-2h-2z" />
            </svg>
          </div>
          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <div className="label-xs">Tipo</div>
              <div className="font-bold text-danger uppercase">{a.tipo}</div>
            </div>
            <div>
              <div className="label-xs">Nro. acta</div>
              <div className="data-bold">{a.numero_acta}</div>
            </div>
            <div>
              <div className="label-xs">Fecha</div>
              <div className="data-bold">{formatFecha(a.fecha_emision)}</div>
            </div>
            <div className="md:col-span-4">
              <div className="label-xs">Motivo</div>
              <div className="text-sm text-slate-800">{a.motivo}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatFecha(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function pad(n) { return String(n).padStart(2, '0'); }
