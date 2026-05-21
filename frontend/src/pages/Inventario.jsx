import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api.js';
import { IconoAlerta } from '../components/vuelos/alertaIconos.jsx';
import AwbDetalleModal from '../components/detalle/AwbDetalleModal.jsx';
import ActaMalEstadoModal from '../components/inventario/ActaMalEstadoModal.jsx';

const MOTIVOS = [
  { key: 'INMOVILIZADA', label: 'Inmovilizadas', accent: 'orange' },
];

const TELEFONO_INMOVILIZADOS = '(01) XXX-XXXX';

export default function Inventario() {
  const [data, setData] = useState({ items: [], total: 0, conteo_motivos: {} });
  const [loading, setLoading] = useState(true);
  const [filtroMotivo, setFiltroMotivo] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [awbSeleccionado, setAwbSeleccionado] = useState(null);
  // Acta de mercancia en mal estado para la guia seleccionada.
  const [actaActiva, setActaActiva] = useState(null);

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    const params = {};
    if (filtroMotivo) params.motivo = filtroMotivo;
    if (busqueda) params.buscar = busqueda;
    api
      .listInventario(params)
      .then((res) => { if (!cancelado) setData(res); })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, [filtroMotivo, busqueda]);

  // Cuentas por rango de dias para la leyenda visual.
  // Reglas operativas: 0-1 dias OK, 2 dias proximo (cobro como general inminente),
  // 3+ ya cobra como carga general.
  const conteoRangos = useMemo(() => {
    const acc = { ok: 0, proximo: 0, excedido: 0 };
    for (const it of data.items || []) {
      const r = rangoDias(it.dias_almacen);
      if (r) acc[r]++;
    }
    return acc;
  }, [data.items]);

  // Items ordenados por dias DESC (los criticos arriba). El backend ya
  // devuelve asi pero re-sorteamos por si cambian los filtros.
  const itemsOrdenados = useMemo(
    () => [...(data.items || [])].sort((a, b) => (b.dias_almacen ?? -1) - (a.dias_almacen ?? -1)),
    [data.items]
  );

  return (
    <div className="p-6 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <IconAlmacen />
          <div>
            <h1 className="text-lg font-bold tracking-wider text-slate-800 uppercase leading-tight">
              Inventario de guías courier — En almacén
            </h1>
            <div className="text-[11px] text-slate-500 mt-0.5 font-medium tracking-wide">
              <span className="uppercase text-slate-400 font-semibold">Total en almacén: </span>
              <span className="tabular-nums">{data.total}</span> guías
            </div>
          </div>
        </div>
      </div>

      {/* Aviso de contacto — Área de Inmovilizados TALMA */}
      <div className="flex items-start gap-2.5 rounded-md border border-navy/20 bg-blue-50/60 px-3 py-2">
        <span className="text-navy shrink-0 mt-px"><IconInfo /></span>
        <p className="text-[11px] text-slate-600 leading-relaxed">
          <span className="font-semibold text-slate-700">
            Ante cualquier duda sobre una guía retenida
          </span>{' '}
          (inmovilización por canal rojo sin levante), comuníquese con el{' '}
          <span className="font-semibold text-navy">Área de Inmovilizados de TALMA</span>{' '}
          al teléfono{' '}
          <span className="font-bold tabular-nums text-navy">{TELEFONO_INMOVILIZADOS}</span>.
        </p>
      </div>

      {/* Toolbar */}
      <div className="card px-3 py-2.5 flex items-center gap-x-4 gap-y-2 flex-wrap">
        <div className="relative">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar AWB, manifiesto o vuelo..."
            className="pl-8 pr-3 py-1.5 text-sm border border-border rounded-md w-72 focus:outline-none focus:ring-2 focus:ring-navy/30"
          />
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
            <IconSearch />
          </span>
        </div>

        <div className="w-px h-6 bg-border" />

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] uppercase tracking-wider text-muted font-semibold mr-1">
            Motivo de retención
          </span>
          {MOTIVOS.map((m) => (
            <MotivoChip
              key={m.key}
              label={m.label}
              count={data.conteo_motivos?.[m.key] || 0}
              accent={m.accent}
              activa={filtroMotivo === m.key}
              onClick={() => setFiltroMotivo(filtroMotivo === m.key ? null : m.key)}
            />
          ))}
          {filtroMotivo && (
            <button
              onClick={() => setFiltroMotivo(null)}
              className="text-[11px] text-slate-500 hover:text-slate-900 underline font-medium ml-1"
            >
              Quitar
            </button>
          )}
        </div>
      </div>

      {/* Leyenda visual de días en almacén */}
      <LeyendaDias conteo={conteoRangos} />

      {/* Tabla */}
      <div className="card overflow-hidden">
        <div className="overflow-auto" style={{ maxHeight: '65vh' }}>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr className="text-left text-[10px] tracking-wider uppercase text-muted font-semibold border-b border-border">
                <Th className="w-8"></Th>
                <Th>Nº Guía Master</Th>
                <Th>Vuelo / Manifiesto</Th>
                <Th>Origen</Th>
                <Th>Ingreso almacén</Th>
                <Th className="text-center">Días</Th>
                <Th className="text-right">Bultos<br/>(rec/man)</Th>
                <Th className="text-right">Peso kg<br/>(rec/man)</Th>
                <Th className="text-center">Bultos<br/>mal estado</Th>
                <Th className="text-center">Parciales</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={11} className="p-12 text-center text-muted">Cargando inventario...</td></tr>
              )}
              {!loading && data.items.length === 0 && (
                <tr><td colSpan={11} className="p-12 text-center text-muted">No hay guías en almacén que coincidan con el filtro.</td></tr>
              )}
              {itemsOrdenados.map((it) => (
                <tr
                  key={it.id}
                  onClick={() => setAwbSeleccionado(it.id)}
                  className="border-b border-border hover:bg-slate-50 transition cursor-pointer"
                >
                  <Td className="w-8">
                    <IconoRetencion tipos={it.tipos_retencion} />
                  </Td>
                  <Td className="data-bold">{it.awb}</Td>
                  <Td>
                    <div className="data-bold text-[13px]">{it.vuelo}</div>
                    <div className="text-[11px] text-muted">MNF {it.manifiesto}</div>
                  </Td>
                  <Td className="text-[12px] font-semibold">{it.origen}</Td>
                  <Td>
                    <div className="text-[13px] data-bold tabular-nums">{formatFechaHora(it.fecha_ingreso)}</div>
                  </Td>
                  <Td className="text-center">
                    <DiasBadge dias={it.dias_almacen} />
                  </Td>
                  <Td className="text-right tabular-nums text-[12px]">
                    <span className="font-bold">{it.bultos_recibidos}</span>
                    <span className="text-slate-400">/{it.bultos_esperados}</span>
                  </Td>
                  <Td className="text-right tabular-nums text-[12px]">
                    <span className="font-bold">{formatKg(it.kgs_recibidos)}</span>
                    <span className="text-slate-400">/{formatKg(it.kgs_esperados)}</span>
                  </Td>
                  <Td className="text-center tabular-nums text-[12px]">
                    <CeldaMalEstado
                      n={it.bultos_mal_estado}
                      acta={it.acta_mal_estado}
                      onAbrirActa={(e) => {
                        e.stopPropagation();
                        setActaActiva({ acta: it.acta_mal_estado, awb: it.awb });
                      }}
                    />
                  </Td>
                  <Td className="text-center tabular-nums text-[12px]">
                    <ConteoBultos n={it.bultos_faltantes} tono="warning" />
                  </Td>
                  <Td>
                    <button
                      onClick={(e) => { e.stopPropagation(); setAwbSeleccionado(it.id); }}
                      className="text-ok hover:opacity-80"
                      title="Ver detalle"
                    >
                      <IconArrow />
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {awbSeleccionado && (
        <AwbDetalleModal awbId={awbSeleccionado} onClose={() => setAwbSeleccionado(null)} />
      )}

      {actaActiva && (
        <ActaMalEstadoModal
          acta={actaActiva.acta}
          awb={actaActiva.awb}
          onClose={() => setActaActiva(null)}
        />
      )}
    </div>
  );
}

// Rango visual segun dias en almacen.
// 0-1: ok (verde) · 2: proximo (ambar) · >=3: excedido (rojo, ya cobra como general)
function rangoDias(dias) {
  if (dias == null) return null;
  if (dias <= 1) return 'ok';
  if (dias === 2) return 'proximo';
  return 'excedido';
}

// Leyenda visual de rangos: chips con el conteo por categoria + tooltip.
// Pensado para que el usuario sepa de un vistazo cuantas guias ya excedieron
// los 2 dias (cobro como carga general) y cuantas estan proximas.
function LeyendaDias({ conteo }) {
  return (
    <div className="card px-3 py-2 flex items-center gap-3 flex-wrap text-[11px]">
      <span className="text-[10px] uppercase tracking-wider text-muted font-semibold">
        Días en almacén
      </span>
      <RangoChip
        tono="ok"
        rango="0 – 1 día"
        nota="Con margen"
        count={conteo.ok}
      />
      <RangoChip
        tono="proximo"
        rango="2 días"
        nota="Próximo al cobro"
        count={conteo.proximo}
      />
      <RangoChip
        tono="excedido"
        rango="≥ 3 días"
        nota="Cobro como carga general"
        count={conteo.excedido}
      />
      <span className="ml-auto text-[10px] text-muted italic">
        Ordenado por antigüedad (más críticos arriba)
      </span>
    </div>
  );
}

function RangoChip({ tono, rango, nota, count }) {
  const STYLE = {
    ok:       'border-emerald-300 bg-emerald-50  text-ok',
    proximo:  'border-amber-300   bg-amber-50    text-amber-800',
    excedido: 'border-red-300     bg-red-50      text-danger',
  };
  return (
    <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-md border ${STYLE[tono]}`}>
      <span className="text-sm font-bold tabular-nums">{count}</span>
      <span className="leading-tight">
        <span className="font-semibold">{rango}</span>
        <span className="text-[10px] opacity-80 ml-1">· {nota}</span>
      </span>
    </div>
  );
}

// Celda interactiva: cuando hay bultos en mal estado y hay acta disponible,
// el numero se vuelve clickeable y se muestra un icono junto. Abre el modal
// con el acta y el carrusel de fotos.
function CeldaMalEstado({ n, acta, onAbrirActa }) {
  if (!n) return <span className="text-slate-300">—</span>;
  if (!acta) {
    return (
      <span className="inline-flex items-center justify-center min-w-[26px] px-1.5 py-0.5 rounded text-[12px] font-bold tabular-nums bg-red-50 border border-red-200 text-danger">
        {n}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onAbrirActa}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-red-200 bg-red-50 text-danger hover:bg-red-100 hover:border-red-300 transition"
      title={`Ver acta ${acta.numero_acta}`}
    >
      <span className="text-[12px] font-bold tabular-nums">{n}</span>
      <IconActa />
    </button>
  );
}

function IconActa() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <line x1="8" y1="13" x2="14" y2="13" />
      <line x1="8" y1="17" x2="13" y2="17" />
    </svg>
  );
}

function MotivoChip({ label, count, accent, activa, onClick }) {
  const STYLES = {
    orange: 'border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100',
    amber:  'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100',
    red:    'border-red-300 bg-red-50 text-danger hover:bg-red-100',
    slate:  'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100',
  };
  const RING = {
    orange: 'ring-2 ring-orange-500',
    amber:  'ring-2 ring-amber-500',
    red:    'ring-2 ring-red-500',
    slate:  'ring-2 ring-slate-500',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 transition ${STYLES[accent]} ${
        activa ? RING[accent] + ' shadow-sm' : ''
      }`}
    >
      <span className="text-sm font-bold tabular-nums">{count}</span>
      <span className="text-[10px] uppercase tracking-wider font-semibold">{label}</span>
    </button>
  );
}

// Icono(s) al inicio de la fila segun tipo(s) de retencion activa.
// Mismos symbols que se usan en Vista 1 para que se reconozcan de inmediato.
function IconoRetencion({ tipos }) {
  if (!tipos || tipos.length === 0) return <span className="text-slate-200">—</span>;
  return (
    <div className="flex items-center gap-1">
      {tipos.includes('INMOVILIZACION') && (
        <span className="text-orange-600" title="Inmovilizada">
          <IconoAlerta tipo="inmov" size={16} />
        </span>
      )}
    </div>
  );
}

// Conteos pequenos para bultos en mal estado / parciales.
// Si n === 0 mostramos un guion suave para que la columna no genere ruido.
function ConteoBultos({ n, tono }) {
  if (!n) return <span className="text-slate-300">—</span>;
  const cls = tono === 'danger'
    ? 'bg-red-50 border border-red-200 text-danger'
    : 'bg-amber-50 border border-amber-200 text-amber-800';
  return (
    <span className={`inline-flex items-center justify-center min-w-[26px] px-1.5 py-0.5 rounded text-[12px] font-bold tabular-nums ${cls}`}>
      {n}
    </span>
  );
}

function DiasBadge({ dias }) {
  if (dias == null) return <span className="text-slate-300">—</span>;
  // 0-1: verde · 2: ambar (proximo) · >=3: rojo (cobro como carga general)
  const r = rangoDias(dias);
  const cls =
    r === 'excedido' ? 'bg-red-50 border border-red-300 text-danger'
    : r === 'proximo' ? 'bg-amber-50 border border-amber-300 text-amber-800'
    : 'bg-emerald-50 border border-emerald-300 text-ok';
  return (
    <span className={`inline-flex items-center justify-center min-w-[30px] px-1.5 py-0.5 rounded text-[12px] font-bold tabular-nums ${cls}`}>
      {dias}
    </span>
  );
}

function Th({ children, className = '' }) {
  return <th className={`px-3 py-2.5 font-semibold leading-tight ${className}`}>{children}</th>;
}
function Td({ children, className = '' }) {
  return <td className={`px-3 py-2.5 align-middle ${className}`}>{children}</td>;
}
function IconAlmacen() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0D2B6B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-5 9 5v11H3z" />
      <rect x="7" y="13" width="3" height="4" />
      <rect x="14" y="13" width="3" height="4" />
      <line x1="3" y1="20" x2="21" y2="20" />
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
function IconInfo() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
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

function formatFechaHora(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatKg(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString('es-PE', { maximumFractionDigits: 0 });
}
