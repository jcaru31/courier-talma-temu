import { useState } from 'react';
import DetalleVersionSwitcher from './versiones/DetalleVersionSwitcher.jsx';
import DetalleNavegador from './versiones/DetalleNavegador.jsx';
import DetalleAcordeon from './versiones/DetalleAcordeon.jsx';
import ServiciosIntermediosModal from './ServiciosIntermediosModal.jsx';

/**
 * Contenido del detalle de una guía (Vista 3). Se comparte entre la página
 * independiente (/awb/:id) y el modal que se abre desde la tabla de guías.
 *
 * Hay 2 prototipos de layout intercambiables (Navegador / Acordeón) para que
 * el equipo evalúe cuál resulta más digerible. El switcher es discreto y la
 * elección se persiste en localStorage.
 */
const VERSION_KEY = 'detalle_version';

const VARIANTES = {
  navegador: DetalleNavegador,
  acordeon: DetalleAcordeon,
};

export default function AwbDetalleContenido({ awb }) {
  const [version, setVersion] = useState(
    () => localStorage.getItem(VERSION_KEY) || 'navegador'
  );
  const [serviciosAbierto, setServiciosAbierto] = useState(false);

  const cambiarVersion = (v) => {
    setVersion(v);
    localStorage.setItem(VERSION_KEY, v);
  };

  if (!awb) return null;

  const Variante = VARIANTES[version] || DetalleNavegador;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between -mb-1">
        <button
          type="button"
          onClick={() => setServiciosAbierto(true)}
          className="inline-flex items-center gap-1 text-[12px] font-medium text-slate-500 hover:text-navy transition"
        >
          Servicios intermedios
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 17l9-9M17 17V8H8" />
          </svg>
        </button>
        <DetalleVersionSwitcher value={version} onChange={cambiarVersion} />
      </div>
      <Variante awb={awb} />

      {serviciosAbierto && (
        <ServiciosIntermediosModal awb={awb} onClose={() => setServiciosAbierto(false)} />
      )}
    </div>
  );
}
