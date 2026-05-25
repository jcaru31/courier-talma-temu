import { useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api.js';
import { IconoAlerta } from '../vuelos/alertaIconos.jsx';
import AwbDetalleModal from '../detalle/AwbDetalleModal.jsx';

const TELEFONO_INMOVILIZADOS = '(01) XXX-XXXX';

// Rango por antigüedad en almacén. Solo dos buckets operativos:
//   1–3 días → naranja (con margen)
//   4+ días  → rojo (cobro como carga general)
// Las guías de 0 días (ingresaron hoy) no se listan en este modal.
function rangoDias(dias) {
  if (dias == null || dias < 1) return null;
  return dias <= 3 ? 'naranja' : 'rojo';
}

/**
 * Modal "En almacén" — tablita simple de guías courier en almacén.
 *
 * Se alimenta de /api/inventario (una sola lectura al abrir) y filtra todo en
 * cliente: búsqueda, inmovilizadas y rango de antigüedad. Solo lista guías con
 * 1+ día en almacén; las de 0 días quedan fuera por decisión operativa.
 *
 * z-40: queda por debajo del panel de detalle (z-50), que se desliza encima al
 * hacer clic en una fila.
 */
export default function InventarioModal({ abierto, onClose }) {
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [cargado, setCargado] = useState(false);

  const [busqueda, setBusqueda] = useState('');
  const [soloInmov, setSoloInmov] = useState(false);
  const [rango, setRango] = useState(null); // null | 'naranja' | 'rojo'
  const [awbSeleccionado, setAwbSeleccionado] = useState(null);

  const [visible, setVisible] = useState(false);

  // Fade-in al abrir y carga diferida (solo la primera vez que se abre).
  useEffect(() => {
    if (!abierto) { setVisible(false); return; }
    const t = requestAnimationFrame(() => setVisible(true));
    if (!cargado) {
      setLoading(true);
      api
        .listInventario()
        .then((res) => setData(res))
        .finally(() => { setLoading(false); setCargado(true); });
    }
    return () => cancelAnimationFrame(t);
  }, [abierto, cargado]);

  // ESC cierra el modal (salvo que haya un detalle abierto encima).
  useEffect(() => {
    if (!abierto) return;
    const onEsc = (e) => { if (e.key === 'Escape' && !awbSeleccionado) onClose(); };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [abierto, awbSeleccionado, onClose]);

  // Base: solo guías con 1+ día en almacén.
  const base = useMemo(
    () => (data.items || []).filter((it) => (it.dias_almacen ?? 0) >= 1),
    [data.items]
  );

  // Conteos para los chips de filtro (sobre la base, sin aplicar el propio
  // filtro para que el usuario siempre vea el total de cada bucket).
  const conteos = useMemo(() => {
    const acc = { inmov: 0, naranja: 0, rojo: 0 };
    for (const it of base) {
      if (it.tipos_retencion?.includes('INMOVILIZACION')) acc.inmov++;
      const r = rangoDias(it.dias_almacen);
      if (r) acc[r]++;
    }
    return acc;
  }, [base]);

  // Visibles: base + filtros activos, ordenadas por antigüedad (críticas arriba).
  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return base
      .filter((it) => {
        if (soloInmov && !it.tipos_retencion?.includes('INMOVILIZACION')) return false;
        if (rango && rangoDias(it.dias_almacen) !== rango) return false;
        if (q) {
          const campos = [it.consignatario_nombre, it.awb, it.vuelo, it.manifiesto, it.origen];
          if (!campos.some((c) => (c || '').toLowerCase().includes(q))) return false;
        }
        return true;
      })
      .sort((a, b) => (b.dias_almacen ?? 0) - (a.dias_almacen ?? 0));
  }, [base, busqueda, soloInmov, rango]);

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-40" aria-modal="true">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-slate-900/50 transition-opacity duration-200 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Caja del modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={`pointer-events-auto bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden transition-all duration-200 ${
            visible ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.98]'
          }`}
        >
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-border flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-blue-50 border border-navy/15 flex items-center justify-center text-navy shrink-0">
              <IconAlmacen />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold tracking-wide text-slate-800 uppercase leading-tight">
                Guías en almacén
              </h2>
              <div className="text-[11px] text-slate-500 font-medium">
                <span className="tabular-nums font-bold text-slate-700">{base.length}</span> guías con
                1+ día en almacén
                {data.total > base.length && (
                  <span className="text-slate-400">
                    {' '}· {data.total - base.length} ingresada{data.total - base.length === 1 ? '' : 's'} hoy
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 w-8 h-8 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-500"
              aria-label="Cerrar"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="6" y1="18" x2="18" y2="6" />
              </svg>
            </button>
          </div>

          {/* Toolbar: búsqueda + filtros con conteo */}
          <div className="px-5 py-2.5 border-b border-border flex items-center gap-x-4 gap-y-2 flex-wrap bg-slate-50/60">
            <div className="relative">
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar consignatario, AWB, vuelo..."
                className="pl-8 pr-3 py-1.5 text-sm border border-border rounded-md w-64 bg-white focus:outline-none focus:ring-2 focus:ring-navy/30"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                <IconSearch />
              </span>
            </div>

            <div className="w-px h-6 bg-border" />

            <div className="flex items-center gap-1.5 flex-wrap">
              <FiltroChip
                tono="orange"
                label="Inmovilizadas"
                count={conteos.inmov}
                activa={soloInmov}
                onClick={() => setSoloInmov((v) => !v)}
                icon={<IconoAlerta tipo="inmov" size={14} />}
              />
              <div className="w-px h-5 bg-border mx-0.5" />
              <span className="text-[10px] uppercase tracking-wider text-muted font-semibold mr-0.5">Días</span>
              <FiltroChip
                tono="orange"
                label="1–3 días"
                count={conteos.naranja}
                activa={rango === 'naranja'}
                onClick={() => setRango((r) => (r === 'naranja' ? null : 'naranja'))}
              />
              <FiltroChip
                tono="red"
                label="4+ días"
                count={conteos.rojo}
                activa={rango === 'rojo'}
                onClick={() => setRango((r) => (r === 'rojo' ? null : 'rojo'))}
              />
              {(soloInmov || rango || busqueda) && (
                <button
                  onClick={() => { setSoloInmov(false); setRango(null); setBusqueda(''); }}
                  className="text-[11px] text-slate-500 hover:text-slate-900 underline font-medium ml-1"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>

          {/* Tabla */}
          <div className="overflow-auto flex-1 min-h-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr className="text-left text-[10px] tracking-wider uppercase text-muted font-semibold border-b border-border">
                  <Th className="w-7"></Th>
                  <Th>Consignatario</Th>
                  <Th>Nº Guía Master</Th>
                  <Th>Vuelo / Manifiesto</Th>
                  <Th>Ingreso / Días</Th>
                  <Th className="text-right">Bultos<br/><span className="normal-case text-[9px] opacity-70">rec / man</span></Th>
                  <Th className="text-right">Peso kg<br/><span className="normal-case text-[9px] opacity-70">rec / man</span></Th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={7} className="p-12 text-center text-muted">Cargando inventario…</td></tr>
                )}
                {!loading && visibles.length === 0 && (
                  <tr><td colSpan={7} className="p-12 text-center text-muted">No hay guías que coincidan con el filtro.</td></tr>
                )}
                {!loading && visibles.map((it) => (
                  <tr
                    key={it.id}
                    onClick={() => setAwbSeleccionado(it.id)}
                    className="border-b border-border hover:bg-blue-50/40 transition cursor-pointer"
                  >
                    <Td className="w-7 text-center px-2">
                      {it.tipos_retencion?.includes('INMOVILIZACION') ? (
                        <span className="text-orange-600" title="Inmovilizada (canal rojo sin levante)">
                          <IconoAlerta tipo="inmov" size={16} />
                        </span>
                      ) : (
                        <span className="text-slate-200">—</span>
                      )}
                    </Td>
                    <Td>
                      <div className="data-bold text-[13px] leading-tight">{it.consignatario_nombre || '—'}</div>
                    </Td>
                    <Td className="data-bold tabular-nums">{it.awb}</Td>
                    <Td>
                      <div className="flex items-center gap-1.5">
                        <span className="data-bold text-[13px]">{it.vuelo}</span>
                        {it.origen && (
                          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-px rounded">
                            {it.origen}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted tabular-nums">{it.manifiesto}</div>
                    </Td>
                    <Td>
                      <CeldaIngresoDias dias={it.dias_almacen} fecha={it.fecha_ingreso} />
                    </Td>
                    <Td className="text-right">
                      <CeldaRecMan rec={it.bultos_recibidos} man={it.bultos_esperados} />
                    </Td>
                    <Td className="text-right">
                      <CeldaRecMan rec={it.kgs_recibidos} man={it.kgs_esperados} fmt={formatKg} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Aviso TALMA — compacto */}
          <div className="px-5 py-2 border-t border-border bg-blue-50/50 flex items-center gap-2 text-[11px] text-slate-600">
            <span className="text-navy shrink-0"><IconInfo /></span>
            <span className="leading-snug">
              Ante cualquier duda sobre una guía inmovilizada, comuníquese con el{' '}
              <span className="font-semibold text-navy">Área de Inmovilizados de TALMA</span>.
            </span>
            <span className="ml-auto inline-flex items-center gap-1.5 shrink-0 font-bold tabular-nums text-navy bg-white border border-navy/20 rounded-md px-2 py-1">
              <IconPhone />{TELEFONO_INMOVILIZADOS}
            </span>
          </div>
        </div>
      </div>

      {/* Detalle de la guía — se desliza por encima (z-50) */}
      {awbSeleccionado && (
        <AwbDetalleModal awbId={awbSeleccionado} onClose={() => setAwbSeleccionado(null)} />
      )}
    </div>
  );
}

// Celda "recibido / manifestado": recibido en negrita, manifestado atenuado.
// Si recibió menos de lo manifestado, marca el faltante en ámbar.
function CeldaRecMan({ rec, man, fmt = (n) => n ?? 0 }) {
  const falta = (man ?? 0) - (rec ?? 0);
  return (
    <span className="inline-flex items-baseline gap-1 tabular-nums">
      <span className={`text-[13px] font-bold ${falta > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
        {fmt(rec)}
      </span>
      <span className="text-[12px] text-slate-400">/ {fmt(man)}</span>
    </span>
  );
}

// Antigüedad en almacén: número de días prominente y coloreado por severidad
// (naranja 1–3, rojo 4+), con barra de acento vertical y fecha de ingreso como
// dato secundario debajo.
function CeldaIngresoDias({ dias, fecha }) {
  if (dias == null) return <span className="text-slate-300">—</span>;
  const r = rangoDias(dias);
  const texto = r === 'rojo' ? 'text-danger' : 'text-orange-600';
  const barra = r === 'rojo' ? 'bg-red-400' : 'bg-orange-400';
  return (
    <div className="flex items-stretch gap-2.5">
      <span className={`w-1 rounded-full ${barra}`} />
      <div className="leading-tight">
        <div className="flex items-baseline gap-1">
          <span className={`text-[15px] font-bold tabular-nums ${texto}`}>{dias}</span>
          <span className={`text-[10px] font-semibold ${texto} opacity-80`}>
            {dias === 1 ? 'día' : 'días'}
          </span>
        </div>
        <div className="text-[11px] text-slate-400 tabular-nums mt-0.5">
          {formatFechaHora(fecha)}
        </div>
      </div>
    </div>
  );
}

function FiltroChip({ tono, label, count, activa, onClick, icon = null }) {
  const STYLES = {
    orange: 'border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100',
    red:    'border-red-300 bg-red-50 text-danger hover:bg-red-100',
  };
  const RING = { orange: 'ring-2 ring-orange-500', red: 'ring-2 ring-red-500' };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 transition ${STYLES[tono]} ${
        activa ? RING[tono] + ' shadow-sm' : ''
      }`}
    >
      {icon}
      <span className="text-sm font-bold tabular-nums">{count}</span>
      <span className="text-[10px] uppercase tracking-wider font-semibold">{label}</span>
    </button>
  );
}

function Th({ children, className = '' }) {
  return <th className={`px-3 py-2.5 font-semibold leading-tight ${className}`}>{children}</th>;
}
function Td({ children, className = '' }) {
  return <td className={`px-3 py-2.5 align-middle ${className}`}>{children}</td>;
}

function formatFechaHora(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function formatKg(n) {
  if (n == null) return '0';
  return Number(n).toLocaleString('es-PE', { maximumFractionDigits: 0 });
}

function IconAlmacen() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
function IconPhone() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}
