import { useNavigate, useParams } from 'react-router-dom';
import { useVueloDetail } from '../hooks/useVuelos.js';
import VuelosTable from '../components/vuelos/VuelosTable.jsx';

/**
 * Página independiente del detalle de vuelo (/vuelos/:manifiesto). Se mantiene
 * para enlaces directos / recarga; el flujo principal es la expansión inline
 * en la lista. Reutiliza la misma fila de la lista, ya expandida.
 */
export default function DetalleVuelo() {
  const { manifiesto } = useParams();
  const navigate = useNavigate();
  const { vuelo, loading, error } = useVueloDetail(manifiesto);

  return (
    <div className="p-6 space-y-4">
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
          Detalle de vuelo
          <span className="text-slate-400 font-normal normal-case"> · MNF {manifiesto}</span>
        </h1>
      </div>

      {error && (
        <div className="card p-4 border-danger text-danger text-sm">Error: {error}</div>
      )}

      <VuelosTable
        items={vuelo ? [vuelo] : []}
        loading={loading}
        expandirInicial={manifiesto}
      />
    </div>
  );
}
