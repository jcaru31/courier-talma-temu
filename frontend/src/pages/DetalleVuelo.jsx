import { useNavigate, useParams } from 'react-router-dom';
import { useVueloDetail } from '../hooks/useVuelos.js';
import VueloHeader from '../components/vuelos/VueloHeader.jsx';
import GuiasSimpleTable from '../components/vuelos/GuiasSimpleTable.jsx';

export default function DetalleVuelo() {
  const { manifiesto } = useParams();
  const navigate = useNavigate();
  const { vuelo, loading, error } = useVueloDetail(manifiesto);

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
          <VueloHeader vuelo={vuelo} />
          <GuiasSimpleTable awbs={vuelo.awbs} manifiesto={vuelo.manifiesto} />
        </>
      )}
    </div>
  );
}
