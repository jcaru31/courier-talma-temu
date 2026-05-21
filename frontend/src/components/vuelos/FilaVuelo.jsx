import { useState, useEffect, Fragment } from 'react';
import { createPortal } from 'react-dom';
import TrazabilidadConteos from './TrazabilidadConteos.jsx';
import AlertasInline from './AlertasInline.jsx';
import TooltipVueloRuta from './TooltipVueloRuta.jsx';
import ManifiestoModal from './ManifiestoModal.jsx';
import DetalleVueloInline from './DetalleVueloInline.jsx';
import { nombrePuerto } from '../../utils/puertos.js';

/**
 * Una fila de la lista de vuelos (Vista 1) + su detalle expandible.
 * La fila concentra toda la información a nivel vuelo (sin encabezado de
 * Vista 2): ruta, arribo, guías manifestadas, trazabilidad con conteos y
 * alertas. Al expandir, los hitos y las alertas de la propia fila se
 * vuelven los controles que filtran la tabla de guías.
 */
export default function FilaVuelo({ v, abierto, onToggle, prefilterQuery = '' }) {
  const [etapaActiva, setEtapaActiva] = useState(null);
  const [alertaActiva, setAlertaActiva] = useState(null);
  const [manifiestoAbierto, setManifiestoAbierto] = useState(false);
  const [hoverRect, setHoverRect] = useState(null);

  // Al cerrar la fila se limpian los filtros del vuelo.
  useEffect(() => {
    if (!abierto) {
      setEtapaActiva(null);
      setAlertaActiva(null);
    }
  }, [abierto]);

  // Etapa y alerta no se combinan: activar uno limpia el otro.
  const onEtapa = (key) => {
    setEtapaActiva(key);
    if (key) setAlertaActiva(null);
  };
  const onAlerta = (tipo) => {
    setAlertaActiva(tipo);
    if (tipo) setEtapaActiva(null);
  };

  const ruta = v.estado_ruta || { estado: 'ATERRIZADO' };

  return (
    <Fragment>
      <tr
        onClick={() => onToggle(v.manifiesto)}
        className={`border-b border-border transition cursor-pointer ${
          abierto ? 'bg-blue-50' : 'hover:bg-slate-50'
        }`}
      >
        {/* Vuelo + botón de manifiesto */}
        <Td>
          <div className="data-bold text-base">{v.vuelo}</div>
          <button
            onClick={(e) => { e.stopPropagation(); setManifiestoAbierto(true); }}
            className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-navy bg-blue-50 border border-navy/30 rounded px-1.5 py-0.5 hover:bg-blue-100 transition"
            title="Ver numeración del manifiesto de carga"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="6" y="4" width="12" height="17" rx="2" />
              <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
              <path d="M9 11h6M9 15h4" />
            </svg>
            MNF {v.manifiesto}
          </button>
        </Td>

        {/* Ruta y arribo (origen → destino, matrícula, ETA, ATA) */}
        <Td>
          <CeldaRutaArribo
            v={v}
            ruta={ruta}
            onHoverIn={(rect) => setHoverRect(rect)}
            onHoverOut={() => setHoverRect(null)}
          />
        </Td>

        {/* Guías manifestadas */}
        <Td className="text-center">
          <div className="text-xl font-bold text-slate-900 tabular-nums">
            {v.total_awbs}
          </div>
        </Td>

        {/* Proceso — trazabilidad con conteos (filtro al expandir) */}
        <Td>
          <TrazabilidadConteos
            trazabilidad={v.trazabilidad}
            interactivo={abierto}
            etapaActiva={etapaActiva}
            onEtapaClick={onEtapa}
          />
        </Td>

        {/* Alertas compactas (filtro al expandir) */}
        <Td>
          <AlertasInline
            faltantes={v.guias_faltantes}
            parciales={v.guias_parciales}
            inmov={v.guias_con_inmov}
            malEstado={v.guias_con_mal_estado}
            interactivo={abierto}
            alertaActiva={alertaActiva}
            onAlertaClick={onAlerta}
          />
        </Td>

        {/* Chevron expandir/cerrar */}
        <Td>
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(v.manifiesto); }}
            className={`p-2 rounded-md hover:bg-blue-100 text-navy transition-transform ${
              abierto ? 'rotate-180' : ''
            }`}
            title={abierto ? 'Cerrar detalle' : 'Ver detalle del vuelo'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </Td>
      </tr>

      {abierto && (
        <tr>
          <td colSpan={6} className="bg-slate-100 border-b-2 border-navy/20 p-4">
            <DetalleVueloInline
              manifiesto={v.manifiesto}
              etapaActiva={etapaActiva}
              alertaActiva={alertaActiva}
              prefilterQuery={prefilterQuery}
            />
          </td>
        </tr>
      )}

      {manifiestoAbierto &&
        createPortal(
          <ManifiestoModal vuelo={v} onClose={() => setManifiestoAbierto(false)} />,
          document.body
        )}
      {hoverRect &&
        createPortal(<TooltipVueloRuta vuelo={v} anchorRect={hoverRect} />, document.body)}
    </Fragment>
  );
}

/**
 * Celda agrupada: origen → destino, matrícula, ETA y ATA. La aerolínea y los
 * nombres largos de puerto se ven en el tooltip nativo; si el vuelo está en
 * ruta, al pasar el ratón aparece el tracker de posición.
 */
function CeldaRutaArribo({ v, ruta, onHoverIn, onHoverOut }) {
  const enVuelo = ruta.estado === 'EN_VUELO';
  const programado = ruta.estado === 'PROGRAMADO';
  const ata = v.sla?.ata;
  // Sin ATA, el arribo mostrado es la ETA estimada y se habilita el tracker.
  const sinArribo = !ata;
  const titulo = `${v.aerolinea_short || v.aerolinea} · ${nombrePuerto(v.origen)} (${v.origen}) → ${nombrePuerto(v.destino)} (${v.destino})`;

  return (
    <div
      title={titulo}
      onMouseEnter={sinArribo ? (e) => onHoverIn(e.currentTarget.getBoundingClientRect()) : undefined}
      onMouseLeave={sinArribo ? onHoverOut : undefined}
      className={sinArribo ? '-m-1 p-1 rounded-md hover:bg-sky-50 transition' : ''}
    >
      <div className="flex items-center gap-1.5 data-bold text-base">
        <span>{v.origen}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="13 6 19 12 13 18" />
        </svg>
        <span>{v.destino}</span>
      </div>
      <div className="mt-1 text-[12px] tabular-nums leading-tight">
        <span className={ata ? 'text-slate-700 font-semibold' : 'text-slate-500 font-medium italic'}>
          {formatFechaHora(ata || v.eta)}
        </span>
      </div>
      {enVuelo && (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 whitespace-nowrap mt-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500" />
          </span>
          Llega en {formatRestante(ruta.minutos_para_arribo)}
        </span>
      )}
      {programado && (
        <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0">
          Programado
        </span>
      )}
    </div>
  );
}

function Td({ children, className = '' }) {
  return <td className={`px-3 py-3 align-middle ${className}`}>{children}</td>;
}

function formatFechaHora(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function formatRestante(min) {
  if (min == null) return '—';
  if (min <= 0) return 'aterrizando';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${pad(m)}m` : `${m}m`;
}
function pad(n) {
  return String(n).padStart(2, '0');
}
