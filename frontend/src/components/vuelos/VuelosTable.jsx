import { useState } from 'react';
import FilaVuelo from './FilaVuelo.jsx';

const ETAPAS_LABELS = ['Trasmisión Aerolínea', 'Recepción', 'Trasmisión Almacén', 'Facturación', 'Despacho'];

/**
 * Lista de vuelos (Vista 1). Cada fila concentra la información a nivel
 * vuelo y se expande inline para mostrar la tabla de guías (Vista 2).
 * Acordeón: un solo vuelo expandido a la vez.
 */
export default function VuelosTable({ items, loading, expandirInicial = null, prefilterQuery = '' }) {
  const [expandido, setExpandido] = useState(expandirInicial);
  const toggle = (manifiesto) =>
    setExpandido((actual) => (actual === manifiesto ? null : manifiesto));

  if (loading && items.length === 0) {
    return <div className="card p-12 text-center text-muted">Cargando...</div>;
  }
  if (!loading && items.length === 0) {
    return <div className="card p-12 text-center text-muted">No se encontraron vuelos</div>;
  }

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-base" style={{ minWidth: '1080px' }}>
        <thead>
          <tr className="text-left text-[11px] tracking-wider uppercase text-muted font-semibold border-b border-border">
            <Th className="min-w-[150px]">Vuelo</Th>
            <Th className="min-w-[190px]">Ruta y arribo</Th>
            <Th className="min-w-[110px] text-center">Guías manifestadas</Th>
            <Th className="min-w-[470px]">
              <div className="text-center mb-2">Proceso</div>
              <div className="grid grid-cols-5 text-center text-[10px] font-semibold normal-case text-slate-500">
                {ETAPAS_LABELS.map((label) => (
                  <div key={label} className="px-1 leading-tight">{label}</div>
                ))}
              </div>
            </Th>
            <Th className="min-w-[200px]">Alertas</Th>
            <Th className="w-12"></Th>
          </tr>
        </thead>
        <tbody>
          {items.map((v) => (
            <FilaVuelo
              key={v.manifiesto}
              v={v}
              abierto={expandido === v.manifiesto}
              onToggle={toggle}
              prefilterQuery={prefilterQuery}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, className = '' }) {
  return <th className={`px-3 py-3 font-semibold align-bottom ${className}`}>{children}</th>;
}
