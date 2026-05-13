import { useEffect, useRef, useState } from 'react';

const OPCIONES_DIA = [
  { value: '', label: 'Últimos 7 días (hoy + 7 atrás)' },
  { value: 'incluir_manana', label: 'Mañana + últimos 7 días' },
  { value: 'manana', label: 'Solo mañana (programados)' },
  { value: 'hoy', label: 'Solo hoy' },
  { value: 'anteriores', label: 'Solo anteriores (sin hoy/mañana)' },
  { value: 'todos', label: 'Todos los vuelos' },
];

const OPCIONES_AEROLINEA = [
  { value: '', label: 'Todas' },
  { value: 'LATAM', label: 'LATAM' },
  { value: 'ATLAS', label: 'ATLAS' },
];

export default function FiltrosVuelos({ filtros, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClickOut(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOut);
    return () => document.removeEventListener('mousedown', onClickOut);
  }, []);

  const tieneFiltros = ['dia', 'aerolinea', 'fecha_desde', 'fecha_hasta'].some(
    (k) => filtros[k] && filtros[k] !== ''
  );

  const update = (key, value) => onChange({ ...filtros, [key]: value });
  const limpiar = () =>
    onChange({
      ...filtros,
      dia: '',
      aerolinea: '',
      fecha_desde: '',
      fecha_hasta: '',
    });

  // Si hay rango personalizado, no aplicar 'dia'
  const tieneRangoCustom = filtros.fecha_desde || filtros.fecha_hasta;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 px-4 py-2 border rounded-md text-sm font-medium transition ${
          tieneFiltros
            ? 'border-navy text-navy bg-blue-50'
            : 'border-border text-slate-700 hover:bg-slate-50'
        }`}
      >
        <IconFilter />
        Filtros
        {tieneFiltros && <span className="w-2 h-2 bg-ok rounded-full" />}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-border rounded-md shadow-lg z-10 p-4 space-y-3">
          <Select
            label="Día"
            value={filtros.dia || ''}
            options={OPCIONES_DIA}
            onChange={(v) => update('dia', v)}
            disabled={tieneRangoCustom}
            hint={tieneRangoCustom ? 'Se está usando un rango de fechas personalizado' : null}
          />
          <Select
            label="Aerolínea"
            value={filtros.aerolinea || ''}
            options={OPCIONES_AEROLINEA}
            onChange={(v) => update('aerolinea', v)}
          />
          <div>
            <div className="label-xs mb-1">Rango de fechas (personalizado)</div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={filtros.fecha_desde || ''}
                onChange={(e) => update('fecha_desde', e.target.value)}
                className="px-2 py-1.5 border border-border rounded-md text-sm"
                title="Desde"
              />
              <input
                type="date"
                value={filtros.fecha_hasta || ''}
                onChange={(e) => update('fecha_hasta', e.target.value)}
                className="px-2 py-1.5 border border-border rounded-md text-sm"
                title="Hasta"
              />
            </div>
          </div>
          {tieneFiltros && (
            <button
              onClick={limpiar}
              className="w-full px-3 py-1.5 text-xs text-muted hover:text-slate-900 border border-border rounded-md"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Select({ label, value, options, onChange, disabled = false, hint = null }) {
  return (
    <div>
      <div className="label-xs mb-1">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-2 py-1.5 border border-border rounded-md text-sm bg-white disabled:bg-slate-50 disabled:text-slate-400"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <div className="text-[10px] text-slate-400 mt-1">{hint}</div>}
    </div>
  );
}

function IconFilter() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}
