import { useState } from 'react';

export default function FiltrosPanel({ filtros, onChange }) {
  const [open, setOpen] = useState(false);

  const update = (key, value) => {
    onChange({ ...filtros, [key]: value });
  };

  const limpiar = () => onChange({});

  const tieneFiltros = Object.values(filtros).some((v) => v && v !== '');

  return (
    <div className="relative">
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
        {tieneFiltros && <span className="w-2 h-2 bg-ok rounded-full"></span>}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-border rounded-md shadow-lg z-10 p-4 space-y-3">
          <Select
            label="Status"
            value={filtros.status || ''}
            onChange={(v) => update('status', v)}
            options={[
              { v: '', l: 'Todos' },
              { v: 'EN_PROCESO', l: 'En proceso' },
              { v: 'TARJADO', l: 'Tarjado' },
              { v: 'DESPACHADO_A_ESEER', l: 'Despachado a ESEER' },
            ]}
          />
          <Select
            label="Canal DAM"
            value={filtros.canal || ''}
            onChange={(v) => update('canal', v)}
            options={[
              { v: '', l: 'Todos' },
              { v: 'VERDE', l: 'Verde' },
              { v: 'NARANJA', l: 'Naranja' },
              { v: 'ROJO', l: 'Rojo' },
            ]}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filtros.con_alertas === 'true'}
              onChange={(e) => update('con_alertas', e.target.checked ? 'true' : '')}
            />
            Solo con alertas activas
          </label>
          <button
            onClick={limpiar}
            className="w-full px-3 py-1.5 text-xs text-muted hover:text-slate-900 border border-border rounded-md"
          >
            Limpiar filtros
          </button>
        </div>
      )}
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <div className="label-xs mb-1">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1.5 border border-border rounded-md text-sm"
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>{o.l}</option>
        ))}
      </select>
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
