import { useState, useRef, useEffect } from 'react';

/**
 * Selector discreto para alternar el layout de la Vista 3 (detalle de guía)
 * entre los 3 prototipos: Navegador, Acordeón y Columnas. Mismo patrón que el
 * switcher de la vista de vuelos: un botón con icono que abre un menú. La
 * selección la maneja el padre y se persiste en localStorage, de modo que el
 * equipo pueda probar cada layout y quedarse con el que prefiera.
 */
export const VERSIONES_DETALLE = [
  { key: 'navegador', label: 'Navegador', icon: IconNav,      hint: 'Hitos clicables + lista de eventos' },
  { key: 'acordeon',  label: 'Acordeón',  icon: IconAcordeon, hint: 'Hitos apilados y colapsables' },
];

export default function DetalleVersionSwitcher({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClickOut(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOut);
    return () => document.removeEventListener('mousedown', onClickOut);
  }, []);

  const actual = VERSIONES_DETALLE.find((v) => v.key === value) || VERSIONES_DETALLE[0];
  const ActualIcon = actual.icon;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Cambiar diseño de la vista"
        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition ${
          open ? 'bg-slate-50 text-slate-600' : ''
        }`}
      >
        <ActualIcon />
        <IconChevron open={open} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-border rounded-lg shadow-lg z-30 p-1">
          <div className="px-2.5 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-300">
            Diseño de la vista
          </div>
          {VERSIONES_DETALLE.map((v) => {
            const activo = v.key === value;
            const Icon = v.icon;
            return (
              <button
                key={v.key}
                type="button"
                onClick={() => { onChange(v.key); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left transition ${
                  activo ? 'bg-blue-50 text-navy' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon />
                <span className="flex flex-col leading-tight min-w-0">
                  <span className="text-[13px] font-semibold">{v.label}</span>
                  <span className="text-[10px] text-slate-400 truncate">{v.hint}</span>
                </span>
                {activo && (
                  <svg className="ml-auto shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function IconChevron({ open }) {
  return (
    <svg
      width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
      className={`transition-transform ${open ? 'rotate-180' : ''}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
function IconNav() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="6" r="1.5" /><circle cx="12" cy="6" r="1.5" /><circle cx="19" cy="6" r="1.5" />
      <line x1="4" y1="13" x2="20" y2="13" /><line x1="4" y1="18" x2="14" y2="18" />
    </svg>
  );
}
function IconAcordeon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="4" rx="1" /><rect x="3" y="11" width="18" height="4" rx="1" /><rect x="3" y="18" width="18" height="2" rx="1" />
    </svg>
  );
}
