import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useVueloDetail } from '../hooks/useVuelos.js';
import VueloHeader from '../components/vuelos/VueloHeader.jsx';
import GuiasSimpleTable from '../components/vuelos/GuiasSimpleTable.jsx';

const ETAPA_A_TRACKING = {
  traslado: 'TRASLADO',
  recepcion: 'RECEPCION',
  transmisiones: 'TRANSMISIONES',
  facturacion: 'FACTURACION',
  despacho: 'DESPACHO',
};

const LABEL_ETAPA = {
  traslado: 'En Traslado',
  recepcion: 'En Recepción',
  transmisiones: 'En Transmisiones',
  facturacion: 'En Facturación',
  despacho: 'Despachadas',
};

const LABEL_ALERTA = {
  faltantes: 'Faltantes',
  parciales: 'Parciales',
  inmov: 'Inmovilizadas',
  mal_estado: 'Mal estado',
};

export default function DetalleVuelo() {
  const { manifiesto } = useParams();
  const navigate = useNavigate();
  const { vuelo, loading, error } = useVueloDetail(manifiesto);

  const [etapaActiva, setEtapaActiva] = useState(null);
  const [alertaActiva, setAlertaActiva] = useState(null);

  // Al activar uno, limpia el otro (no se combinan).
  const onEtapaClick = (key) => {
    setEtapaActiva(key);
    if (key) setAlertaActiva(null);
  };
  const onAlertaClick = (tipo) => {
    setAlertaActiva(tipo);
    if (tipo) setEtapaActiva(null);
  };

  const awbsFiltrados = useMemo(() => {
    if (!vuelo?.awbs) return [];
    let lista = vuelo.awbs;
    if (etapaActiva) {
      const trackingObjetivo = ETAPA_A_TRACKING[etapaActiva];
      lista = lista.filter((a) => a.estado_tracking === trackingObjetivo);
    } else if (alertaActiva === 'faltantes') {
      // Guia faltante: status === GUIA_FALTANTE (campo guias_faltantes a nivel guia = 1)
      lista = lista.filter((a) => a.status === 'GUIA_FALTANTE');
    } else if (alertaActiva === 'parciales') {
      // Parcial: bultos_faltantes > 0 (excluyendo las totalmente faltantes)
      lista = lista.filter((a) => a.status !== 'GUIA_FALTANTE' && (a.bultos_faltantes || 0) > 0);
    } else if (alertaActiva === 'inmov') {
      // Inmovilizada: canal ROJO sin levante
      lista = lista.filter((a) => a.canal_dam?.color === 'ROJO' && a.canal_dam?.con_levante === false);
    } else if (alertaActiva === 'mal_estado') {
      // Mal estado: bultos_mal_estado > 0
      lista = lista.filter((a) => (a.bultos_mal_estado || 0) > 0);
    }
    return lista;
  }, [vuelo, etapaActiva, alertaActiva]);

  const filtroActivoLabel = etapaActiva
    ? LABEL_ETAPA[etapaActiva]
    : alertaActiva
    ? LABEL_ALERTA[alertaActiva]
    : null;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/vuelos')}
            className="flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-md text-sm font-medium hover:bg-navy-700"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Volver
          </button>
          <h1 className="text-base font-semibold text-slate-700 uppercase tracking-wide">
            {vuelo ? `Vuelo ${vuelo.vuelo}` : 'Detalle de vuelo'}
          </h1>
        </div>
      </div>

      {loading && <div className="card p-12 text-center text-muted">Cargando...</div>}
      {error && <div className="card p-4 border-danger text-danger text-sm">Error: {error}</div>}

      {vuelo && (
        <>
          <VueloHeader
            vuelo={vuelo}
            etapaActiva={etapaActiva}
            onEtapaClick={onEtapaClick}
            alertaActiva={alertaActiva}
            onAlertaClick={onAlertaClick}
          />
          <GuiasSimpleTable
            awbs={awbsFiltrados}
            totalSinFiltrar={vuelo.awbs.length}
            manifiesto={vuelo.manifiesto}
            filtroActivoLabel={filtroActivoLabel}
            alturaMaxima="55vh"
          />
        </>
      )}
    </div>
  );
}
