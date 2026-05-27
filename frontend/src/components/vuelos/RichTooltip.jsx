import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Wrapper que muestra un tooltip oscuro estilo "card" al pasar el cursor
 * sobre cualquier elemento. Mismo estilo que IconosTooltip de GuiasSimpleTable.
 *
 * Uso:
 *   <RichTooltipTrigger
 *     title="Responsabilidad"
 *     rows={[{label: 'Tiempo restante', desc: '2h 30min'}, ...]}
 *   >
 *     <span>...</span>
 *   </RichTooltipTrigger>
 *
 * El trigger es un wrapper inline-block que no agrega estilo visual: el hijo
 * mantiene su apariencia. Render-portaled para no chocar con overflow.
 *
 * Posicionamiento: se ancla debajo del trigger por default, pero hace flip
 * hacia arriba si no cabe (igual que TooltipVueloRuta). Horizontalmente se
 * clampea al viewport y el caret se reposiciona para seguir apuntando al
 * trigger. Re-mide al hacer scroll o resize para no quedar desfasado.
 */
export default function RichTooltipTrigger({ title, rows = [], width = 256, children, className = '' }) {
  const ref = useRef(null);
  const [rect, setRect] = useState(null);

  const mostrar = () => setRect(ref.current?.getBoundingClientRect() || null);
  const ocultar = () => setRect(null);

  return (
    <>
      <span
        ref={ref}
        className={`inline-flex cursor-help ${className}`}
        onMouseEnter={mostrar}
        onMouseLeave={ocultar}
      >
        {children}
      </span>
      {rect && createPortal(
        <TooltipPanel title={title} rows={rows} anchorRect={rect} width={width} />,
        document.body
      )}
    </>
  );
}

function TooltipPanel({ title, rows, anchorRect, width }) {
  const panelRef = useRef(null);
  const [pos, setPos] = useState({ left: -9999, top: -9999, flipped: false, caretLeft: 0 });

  useLayoutEffect(() => {
    if (!anchorRect || !panelRef.current) return;
    const margen = 8;
    const h = panelRef.current.offsetHeight;
    const w = Math.min(width, window.innerWidth - margen * 2);

    // Horizontal: clamp al viewport.
    let left = Math.min(
      Math.max(margen, anchorRect.left),
      window.innerWidth - w - margen
    );

    // Vertical: por default abajo, flip si no cabe (y arriba sí).
    const espacioAbajo = window.innerHeight - anchorRect.bottom - margen;
    const espacioArriba = anchorRect.top - margen;
    let top;
    let flipped = false;
    if (h + 8 <= espacioAbajo || espacioAbajo >= espacioArriba) {
      top = anchorRect.bottom + 8;
    } else {
      top = anchorRect.top - h - 8;
      flipped = true;
    }
    // Clamp final vertical para que nunca se salga.
    top = Math.max(margen, Math.min(top, window.innerHeight - h - margen));

    // Caret: se queda apuntando al centro del trigger.
    const caretLeft = Math.min(
      Math.max(10, anchorRect.left - left + anchorRect.width / 2 - 6),
      w - 22
    );
    setPos({ left, top, flipped, caretLeft });
  }, [anchorRect, width]);

  const w = Math.min(width, window.innerWidth - 16);

  return (
    <div
      ref={panelRef}
      style={{ position: 'fixed', top: pos.top, left: pos.left, width: w, zIndex: 80 }}
      className="pointer-events-none bg-slate-900 text-white rounded-lg shadow-2xl ring-1 ring-black/10 px-3 py-2.5"
    >
      <span
        className={`absolute w-3 h-3 rotate-45 bg-slate-900 ${pos.flipped ? '-bottom-1.5' : '-top-1.5'}`}
        style={{ left: pos.caretLeft }}
      />
      {title && (
        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2">
          {title}
        </div>
      )}
      <div className="space-y-1.5">
        {rows.map((r, i) => (
          <div key={i} className="flex items-start gap-2">
            {r.icon && <span className={`mt-0.5 shrink-0 ${r.iconCls || ''}`}>{r.icon}</span>}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-1.5 justify-between">
                <span className="text-[12px] font-bold leading-tight">{r.label}</span>
                {r.valor && <span className="text-[12px] font-bold tabular-nums leading-tight text-white">{r.valor}</span>}
              </div>
              {r.desc && <div className="text-[11px] text-slate-300 leading-snug">{r.desc}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
