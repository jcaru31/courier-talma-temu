import { useState, useRef, useEffect } from 'react';

/**
 * Control segmentado para alternar el layout de la vista de vuelos entre la
 * versión Clásica (la tabla densa actual) y los 3 prototipos UI/UX:
 * Minimal, Split (master-detail) y Agenda (timeline). La selección la maneja
 * el padre (AvanceVuelos) y se persiste en localStorage.
 */
export const VERSIONES = [
  { key: 'clasica', label: 'Clásica',  icon: IconTable,    hint: 'Tabla densa actual' },
  { key: 'minimal', label: 'Minimal',  icon: IconMinimal,  hint: 'Lista ligera, detalle al expandir' },
  { key: 'split',   label: 'Split',    icon: IconSplit,    hint: 'Lista + panel de detalle' },
  { key: 'agenda',  label: 'Agenda',   icon: IconAgenda,   hint: 'Línea de tiempo por arribo' },
];

/**
 * Selector de vista discreto: un botón con icono que abre un pequeño menú con
 * las opciones de layout. Mantiene el cambio de vista accesible sin acaparar
 * la cabecera (los 4 layouts son sobre todo prototipos).
 */
export default function VersionSwitcher({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClickOut(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOut);
    return () => document.removeEventListener('mousedown', onClickOut);
  }, []);

  const actual = VERSIONES.find((v) => v.key === value) || VERSIONES[0];
  const ActualIcon = actual.icon;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Cambiar vista"
        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition ${
          open ? 'bg-slate-50 text-slate-600' : ''
        }`}
      >
        <ActualIcon active={false} />
        <IconChevron open={open} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 bg-white border border-border rounded-lg shadow-lg z-30 p-1">
          {VERSIONES.map((v) => {
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
                <Icon active={activo} />
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

function IconTable() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="1" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="14" x2="21" y2="14" />
    </svg>
  );
}
function IconMinimal() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="14" y2="17" />
    </svg>
  );
}
function IconSplit() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="1" />
      <line x1="10" y1="4" x2="10" y2="20" />
    </svg>
  );
}
function IconAgenda() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="7" r="1.5" />
      <circle cx="6" cy="16" r="1.5" />
      <line x1="6" y1="8.5" x2="6" y2="14.5" />
      <line x1="11" y1="7" x2="20" y2="7" />
      <line x1="11" y1="16" x2="20" y2="16" />
    </svg>
  );
}
