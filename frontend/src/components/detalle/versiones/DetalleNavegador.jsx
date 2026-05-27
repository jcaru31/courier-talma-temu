import { useState } from 'react';
import { buildHitosAwb } from '../../../utils/hitosAwb.js';
import {
  FichaGuiaCard, HitosStrip,
  EventoItem, EventosHeader, hitoInicial,
} from './comun.jsx';

/**
 * Variante 1 — Navegador + lista. Los 5 hitos arriba como íconos clicables;
 * al elegir uno, debajo aparece la lista vertical de SUS eventos con contador
 * total y pills de estado. Es la más fiel al ejemplo móvil de referencia.
 */
export default function DetalleNavegador({ awb }) {
  const hitos = buildHitosAwb(awb);
  const [selKey, setSelKey] = useState(() => hitoInicial(hitos));
  const sel = hitos.find((h) => h.key === selKey) || hitos[0];

  return (
    <div className="space-y-4">
      <FichaGuiaCard awb={awb} />

      <HitosStrip hitos={hitos} selectedKey={selKey} onSelect={setSelKey} />

      <div className="card p-4">
        <EventosHeader label={sel.label} total={sel.subeventos.length} />
        {sel.subeventos.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center text-[12px] text-slate-300 italic">
            Sin información para este hito
          </div>
        ) : (
          <div className="space-y-2">
            {sel.subeventos.map((s, i) => (
              <EventoItem key={i} subevento={s} awb={awb} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
