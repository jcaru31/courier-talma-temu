import DetalleNavegador from './versiones/DetalleNavegador.jsx';

/**
 * Contenido del detalle de una guía (Vista 3). Se comparte entre la página
 * independiente (/awb/:id) y el modal que se abre desde la tabla de guías.
 */
export default function AwbDetalleContenido({ awb }) {
  if (!awb) return null;
  return <DetalleNavegador awb={awb} />;
}
