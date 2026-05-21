import HeaderAWB from './HeaderAWB.jsx';
import TimelineHorizontal from './TimelineHorizontal.jsx';
import SubeventosColumns from './SubeventosColumns.jsx';

/**
 * Contenido del detalle de una guía (Vista 3). Se comparte entre la página
 * independiente (/awb/:id) y el modal que se abre desde la tabla de guías.
 * Las alertas activas se renderizan como etiquetas dentro del HeaderAWB.
 */
export default function AwbDetalleContenido({ awb }) {
  if (!awb) return null;
  return (
    <div className="space-y-4">
      <HeaderAWB awb={awb} />
      <TimelineHorizontal awb={awb} />
      <SubeventosColumns awb={awb} />
    </div>
  );
}
