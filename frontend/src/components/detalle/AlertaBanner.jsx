import { useState } from 'react';
import { api } from '../../services/api.js';

export default function AlertaBanner({ alertas, onNotificado }) {
  const [enviando, setEnviando] = useState(null);
  const [mensaje, setMensaje] = useState(null);

  if (!alertas || alertas.length === 0) return null;

  const notificar = async (alertaId) => {
    setEnviando(alertaId);
    setMensaje(null);
    try {
      const res = await api.notificarAlerta(alertaId);
      setMensaje({
        tipo: 'ok',
        texto: `Notificacion enviada: ${res.generadas.length} mensajes (${res.generadas.filter((g) => g.mock).length} en modo MOCK)`,
      });
      onNotificado?.();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    } finally {
      setEnviando(null);
    }
  };

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
          <button
            onClick={() => notificar(a.id)}
            disabled={enviando === a.id}
            className="shrink-0 self-start bg-danger hover:bg-red-700 disabled:bg-red-300 text-white text-xs font-semibold uppercase tracking-wide px-4 py-2 rounded-md flex items-center gap-2"
          >
            {enviando === a.id ? 'Enviando...' : 'Notificar a Temu'}
            {enviando !== a.id && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </div>
      ))}
      {mensaje && (
        <div className={`text-sm px-3 py-2 rounded-md ${mensaje.tipo === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-100 text-danger'}`}>
          {mensaje.texto}
        </div>
      )}
    </div>
  );
}

function formatFecha(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function pad(n) { return String(n).padStart(2, '0'); }
