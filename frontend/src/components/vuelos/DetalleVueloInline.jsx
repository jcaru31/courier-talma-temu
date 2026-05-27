import { useEffect, useMemo, useState } from 'react';
import { useVueloDetail } from '../../hooks/useVuelos.js';
import { alertaHandlingPendiente } from '../../utils/handlingAlerta.js';
import GuiasSimpleTable from './GuiasSimpleTable.jsx';
import DetalleVueloHeader from './DetalleVueloHeader.jsx';
import AwbDetalleModal from '../detalle/AwbDetalleModal.jsx';

/**
 * Detalle de un vuelo (Vista 2): tabla de guías. Ya no lleva encabezado —
 * toda la información a nivel vuelo vive en la fila de la lista. El filtrado
 * por etapa/alerta es controlado: los valores llegan por props desde la fila
 * (sus hitos y alertas son los controles). Solo añade una franja delgada con
 * los totales de bultos/kilos del vuelo.
 */
// Grupo de estados (estado_tracking) por cada nodo seleccionable. El nodo
// representa el HITO ACTUAL de la guía, así que filtrar por él trae las guías
// que están en ese hito (su 1ra actividad ya se completó pero no han pasado
// al siguiente). Las faltantes NO entran en Recepción — quedaron en Trasmisión
// Aerolínea y se filtran por su propia alerta. Las entregadas siguen en
// DESPACHO (el check verde es solo un flag visual, no un estado aparte).
const ETAPA_A_ESTADOS = {
  aerolinea: ['TRASMISION_AEROLINEA'],
  recepcion: ['MANIFESTADO'],
  transmisiones: ['TRANSMISIONES'],
  facturacion: ['FACTURACION'],
  despacho: ['DESPACHO'],
};

const LABEL_ETAPA = {
  aerolinea: 'En Trasmisión Aerolínea',
  recepcion: 'En Recepción',
  transmisiones: 'En Trasmisión Almacén',
  facturacion: 'En Facturación',
  despacho: 'En Despacho',
};

const LABEL_ALERTA = {
  faltantes: 'Faltantes',
  parciales: 'Parciales',
  inmov: 'Inmovilizadas',
  mal_estado: 'Mal estado',
  handling: 'Pago handling pendiente',
};

export default function DetalleVueloInline({
  manifiesto,
  etapaActiva: etapaProp = null,
  alertaActiva: alertaProp = null,
  prefilterQuery = '',
  fillHeight = false,
  withHeader = false,
}) {
  const { vuelo, loading, error } = useVueloDetail(manifiesto);
  const [awbSeleccionado, setAwbSeleccionado] = useState(null);

  // Con `withHeader` (vista Split) el detalle gestiona sus propios filtros: el
  // encabezado (hitos + alertas) es el control. Sin él, los recibe por props
  // desde la fila (vista clásica). Al cambiar de vuelo, se limpian.
  const [etapaInt, setEtapaInt] = useState(null);
  const [alertaInt, setAlertaInt] = useState(null);
  useEffect(() => { setEtapaInt(null); setAlertaInt(null); }, [manifiesto]);

  const etapaActiva = withHeader ? etapaInt : etapaProp;
  const alertaActiva = withHeader ? alertaInt : alertaProp;
  const onEtapa = (key) => { setEtapaInt(key); if (key) setAlertaInt(null); };
  const onAlerta = (tipo) => { setAlertaInt(tipo); if (tipo) setEtapaInt(null); };

  const awbsFiltrados = useMemo(() => {
    if (!vuelo?.awbs) return [];
    let lista = vuelo.awbs;
    if (etapaActiva && ETAPA_A_ESTADOS[etapaActiva]) {
      const objetivos = ETAPA_A_ESTADOS[etapaActiva];
      lista = lista.filter((a) => objetivos.includes(a.estado_tracking));
    } else if (alertaActiva === 'faltantes') {
      lista = lista.filter((a) => a.status === 'GUIA_FALTANTE');
    } else if (alertaActiva === 'parciales') {
      lista = lista.filter((a) => a.status !== 'GUIA_FALTANTE' && (a.bultos_faltantes || 0) > 0);
    } else if (alertaActiva === 'inmov') {
      lista = lista.filter((a) => a.canal_dam?.color === 'ROJO' && a.canal_dam?.con_levante === false);
    } else if (alertaActiva === 'mal_estado') {
      lista = lista.filter((a) => (a.bultos_mal_estado || 0) > 0);
    } else if (alertaActiva === 'handling') {
      lista = lista.filter(alertaHandlingPendiente);
    }
    return lista;
  }, [vuelo, etapaActiva, alertaActiva]);

  const filtroActivoLabel = etapaActiva
    ? LABEL_ETAPA[etapaActiva]
    : alertaActiva
    ? LABEL_ALERTA[alertaActiva]
    : null;

  // Handling se paga por guía (no por consignatario). Contamos cuántas
  // guías del vuelo aún tienen handling pendiente para mostrarlo como chip.
  const handlingPendientes = useMemo(() => {
    if (!vuelo?.awbs) return 0;
    return vuelo.awbs.filter(alertaHandlingPendiente).length;
  }, [vuelo]);

  if (loading) {
    return <div className="card p-8 text-center text-muted">Cargando guías...</div>;
  }
  if (error) {
    return <div className="card p-4 border-danger text-danger text-sm">Error: {error}</div>;
  }
  if (!vuelo) return null;

  // Guías entregadas = hito Despacho de la trazabilidad (entrega de carga).
  const despacho = (vuelo.trazabilidad || []).find((t) => t.key === 'despacho');
  const entregadas = despacho?.completados ?? 0;
  const totalGuias = despacho?.total ?? 0;

  return (
    <div className={fillHeight ? 'flex flex-col gap-3 h-full min-h-0' : 'space-y-3'}>
      {withHeader ? (
        /* Vista Split: encabezado optimizado con hitos + alertas como filtros */
        <DetalleVueloHeader
          vuelo={vuelo}
          etapaActiva={etapaActiva}
          alertaActiva={alertaActiva}
          onEtapa={onEtapa}
          onAlerta={onAlerta}
        />
      ) : (
        /* Vista clásica: franja resumen (los controles viven en la fila) */
        <div className={`card px-4 py-2.5 flex items-center gap-x-7 gap-y-1.5 flex-wrap ${fillHeight ? 'shrink-0' : ''}`}>
          <span className="text-[10px] uppercase tracking-wider text-muted font-bold">
            Resumen del vuelo
          </span>
          <Metric label="Bultos" rec={vuelo.bultos_recibidos} man={vuelo.bultos_esperados} />
          <Metric
            label="Kilos"
            rec={formatKg(vuelo.kgs_recibidos)}
            man={formatKg(vuelo.kgs_esperados)}
          />

          <div className="ml-auto flex items-center gap-2.5 flex-wrap">
            {handlingPendientes > 0 && (
              <span
                className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-fuchsia-50 border border-fuchsia-300 text-fuchsia-700 px-2 py-1 rounded-md"
                title="Guías con Handling pendiente de pago"
              >
                <IconHandling />
                {handlingPendientes} {handlingPendientes === 1 ? 'guía' : 'guías'} sin pago Handling
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[12px] font-bold ${
                entregadas > 0
                  ? 'bg-emerald-50 border-ok text-ok'
                  : 'bg-slate-50 border-slate-300 text-slate-400'
              }`}
              title="Guías con entrega de carga registrada"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="tabular-nums">{entregadas} / {totalGuias}</span>
              <span className="text-[10px] uppercase tracking-wider">guías entregadas</span>
            </span>
          </div>
        </div>
      )}

      <GuiasSimpleTable
        awbs={awbsFiltrados}
        totalSinFiltrar={vuelo.awbs.length}
        filtroActivoLabel={filtroActivoLabel}
        onSelectAwb={setAwbSeleccionado}
        prefilterQuery={prefilterQuery}
        alturaMaxima="45vh"
        alturaMinima="0px"
        fill={fillHeight}
        preAta={!vuelo.sla?.ata}
      />

      {awbSeleccionado && (
        <AwbDetalleModal awbId={awbSeleccionado} onClose={() => setAwbSeleccionado(null)} />
      )}
    </div>
  );
}

function Metric({ label, rec, man }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[10px] uppercase tracking-wider text-muted font-semibold">{label}</span>
      <span className="text-sm font-bold tabular-nums text-slate-900">
        {rec ?? '—'}
        <span className="text-slate-400 font-medium"> / {man ?? '—'}</span>
      </span>
      <span className="text-[9px] uppercase tracking-wide text-slate-400 font-medium">rec / man</span>
    </div>
  );
}

function formatKg(n) {
  if (n == null) return '—';
  return n.toLocaleString('es-PE', { minimumFractionDigits: 1, maximumFractionDigits: 1, useGrouping: false });
}

// Icono dedicado para "handling pendiente de pago" — moneda con $. Color
// fuchsia para que no se confunda con los iconos de alertas (faltante violet,
// parcial amber, inmov orange, mal estado rojo).
function IconHandling() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6v12" />
      <path d="M16 9c0-1.5-1.8-2.5-4-2.5s-4 1-4 2.5 1.8 2 4 2.5 4 1 4 2.5-1.8 2.5-4 2.5-4-1-4-2.5" />
    </svg>
  );
}
