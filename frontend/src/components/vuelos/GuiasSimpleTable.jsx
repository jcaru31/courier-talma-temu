import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ESTADOS_TRACK = {
  PLANIFICADO:    { bg: 'bg-slate-100',  text: 'text-slate-500',    label: 'PROGRAMADO' },
  FALTANTE:       { bg: 'bg-violet-50',  text: 'text-violet-700',   label: 'FALTANTE' },
  TRASLADO:       { bg: 'bg-blue-50',    text: 'text-blue-700',     label: 'TRASLADO' },
  RECEPCION:      { bg: 'bg-indigo-50',  text: 'text-indigo-700',   label: 'RECEPCIÓN' },
  TRANSMISIONES:  { bg: 'bg-sky-50',     text: 'text-sky-700',      label: 'TRANSMISIONES' },
  FACTURACION:    { bg: 'bg-amber-50',   text: 'text-amber-700',    label: 'FACTURACIÓN' },
  DESPACHO:       { bg: 'bg-emerald-50', text: 'text-emerald-700',  label: 'DESPACHO' },
};

const CANAL_STYLES = {
  ROJO:    { dot: 'bg-red-500',    text: 'text-red-700',    label: 'ROJO' },
  NARANJA: { dot: 'bg-orange-500', text: 'text-orange-700', label: 'NARANJA' },
  VERDE:   { dot: 'bg-emerald-500', text: 'text-emerald-700', label: 'VERDE' },
};

export default function GuiasSimpleTable({
  awbs,
  totalSinFiltrar,
  consignatarioNombre,
  filtroActivoLabel = null,
  alturaMaxima = '60vh',
}) {
  const navigate = useNavigate();
  const irADetalleAwb = (id) => navigate(`/awb/${id}`);

  const [busqueda, setBusqueda] = useState('');

  const awbsVisibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return awbs;
    return awbs.filter((a) => {
      const cns = (consignatarioNombre || 'PERU BOX S.A.C.').toLowerCase();
      return cns.includes(q) || (a.awb || '').toLowerCase().includes(q);
    });
  }, [awbs, busqueda, consignatarioNombre]);

  return (
    <div className="card flex flex-col" style={{ minHeight: '50vh' }}>
      {/* Cabecera de la tabla */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3 flex-wrap">
        <IconBox />
        <h3 className="text-base font-bold tracking-wider text-slate-800 uppercase">
          Guías asociadas
        </h3>
        <span className="text-sm text-muted font-medium">
          {awbsVisibles.length} {awbsVisibles.length === 1 ? 'guía' : 'guías'}
          {totalSinFiltrar != null && awbsVisibles.length !== totalSinFiltrar && (
            <span className="ml-1 text-slate-400">de {totalSinFiltrar}</span>
          )}
        </span>
        {filtroActivoLabel && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-navy text-white px-2 py-1 rounded">
            Filtro: {filtroActivoLabel}
          </span>
        )}

        <div className="ml-auto relative">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar consignatario o Nº guía..."
            className="pl-8 pr-3 py-1.5 text-sm border border-border rounded-md w-72 focus:outline-none focus:ring-2 focus:ring-navy/30"
          />
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
            <IconSearch />
          </span>
        </div>
      </div>

      {/* Tabla con scroll interno y header sticky */}
      <div className="overflow-auto flex-1" style={{ maxHeight: alturaMaxima }}>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 sticky top-0 z-10">
            <tr className="text-left text-[10px] tracking-wider uppercase text-muted font-semibold border-b border-border">
              <Th>Consignatario</Th>
              <Th>Nº Guía Master</Th>
              <Th className="text-right">Bultos<br/>(rec/man)</Th>
              <Th className="text-right">Peso<br/>(rec/man)</Th>
              <Th className="text-center">Bultos<br/>mal estado</Th>
              <Th className="text-center">Guías<br/>faltantes</Th>
              <Th className="text-center">Bultos<br/>faltantes</Th>
              <Th>DAM</Th>
              <Th>Canal</Th>
              <Th>Estado proceso</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {awbsVisibles.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-12 text-center text-muted">
                  No hay guías que coincidan con el filtro.
                </td>
              </tr>
            )}
            {awbsVisibles.map((a) => {
              const trk = ESTADOS_TRACK[a.estado_tracking] || ESTADOS_TRACK.TRASLADO;
              const esFaltante = a.status === 'GUIA_FALTANTE';
              const canal = a.canal_dam?.color ? CANAL_STYLES[a.canal_dam.color] : null;
              const levante = a.canal_dam?.con_levante;
              const bultosMal = a.bultos_mal_estado || 0;
              const bultosFalt = a.bultos_faltantes || 0;

              return (
                <tr
                  key={a.id}
                  onClick={() => irADetalleAwb(a.id)}
                  className="border-b border-border hover:bg-slate-50 transition cursor-pointer"
                >
                  <Td>
                    <div className="data-bold text-sm leading-tight">
                      {consignatarioNombre || 'PERU BOX S.A.C.'}
                    </div>
                  </Td>
                  <Td className="data-bold text-sm">{a.awb}</Td>
                  <Td className="text-right tabular-nums">
                    <RatioCell num={a.bultos_recibidos} den={a.bultos_esperados} highlightLow={esFaltante || bultosFalt > 0} />
                  </Td>
                  <Td className="text-right tabular-nums">
                    <RatioCell num={a.kgs_recibidos} den={a.kgs_esperados} decimals={1} highlightLow={esFaltante || bultosFalt > 0} />
                  </Td>
                  <Td className="text-center tabular-nums">
                    <ChipNumero valor={bultosMal} accent="red" />
                  </Td>
                  <Td className="text-center tabular-nums">
                    <ChipNumero valor={esFaltante ? 1 : 0} accent="violet" />
                  </Td>
                  <Td className="text-center tabular-nums">
                    <ChipNumero valor={bultosFalt} accent="amber" />
                  </Td>
                  <Td className="text-[11px] text-slate-600 tabular-nums">
                    {a.dam || <span className="text-slate-300">—</span>}
                  </Td>
                  <Td>
                    {canal ? (
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${canal.dot}`} />
                        <span className={`text-[11px] font-bold uppercase tracking-wider ${canal.text}`}>
                          {canal.label}
                        </span>
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            levante
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {levante ? 'c/ levante' : 's/ levante'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </Td>
                  <Td>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide ${trk.bg} ${trk.text}`}>
                      {trk.label}
                    </span>
                  </Td>
                  <Td>
                    <button
                      onClick={(e) => { e.stopPropagation(); irADetalleAwb(a.id); }}
                      className="text-ok hover:opacity-80"
                      title="Ver detalle"
                    >
                      <IconArrow />
                    </button>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RatioCell({ num, den, decimals = 0, highlightLow = false }) {
  const showN = decimals > 0 ? (num ?? 0).toFixed(decimals) : (num ?? 0);
  const showD = decimals > 0 ? (den ?? 0).toFixed(decimals) : (den ?? 0);
  return (
    <span className="text-[12px]">
      <span className={`font-bold ${highlightLow ? 'text-danger' : 'text-slate-900'}`}>{showN}</span>
      <span className="text-slate-400">/{showD}</span>
    </span>
  );
}

function ChipNumero({ valor, accent }) {
  const ACTIVE = {
    violet: 'bg-violet-100 text-violet-800',
    amber:  'bg-amber-100 text-amber-800',
    red:    'bg-red-100 text-danger',
  };
  if (!valor) {
    return <span className="text-slate-300 text-[12px] font-bold">0</span>;
  }
  return (
    <span className={`inline-flex items-center justify-center min-w-[28px] px-1.5 py-0.5 rounded-md text-[12px] font-bold ${ACTIVE[accent]}`}>
      {valor}
    </span>
  );
}

function Th({ children, className = '' }) {
  return <th className={`px-3 py-2.5 font-semibold leading-tight ${className}`}>{children}</th>;
}
function Td({ children, className = '' }) {
  return <td className={`px-3 py-2.5 align-middle ${className}`}>{children}</td>;
}
function IconBox() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0D2B6B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
function IconArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17l9-9M17 17V8H8" />
    </svg>
  );
}
