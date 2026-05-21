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

export default function VersionSwitcher({ value, onChange }) {
  return (
    <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg border border-border bg-slate-50">
      {VERSIONES.map((v) => {
        const activo = v.key === value;
        const Icon = v.icon;
        return (
          <button
            key={v.key}
            type="button"
            onClick={() => onChange(v.key)}
            title={v.hint}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-semibold transition ${
              activo
                ? 'bg-white text-navy shadow-sm border border-border'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon active={activo} />
            <span className="hidden sm:inline">{v.label}</span>
          </button>
        );
      })}
    </div>
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
