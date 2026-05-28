import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api.js';

const TELEFONO_E164 = /^\+[1-9]\d{6,14}$/;

export default function SimulacionVuelo() {
  const [vuelo, setVuelo] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [errorCarga, setErrorCarga] = useState(null);

  const [tipoAlerta, setTipoAlerta] = useState('');
  const [telefono, setTelefono] = useState('');
  const [guia, setGuia] = useState('');

  const [enviando, setEnviando] = useState(false);
  const [respuesta, setRespuesta] = useState(null);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const [v, t] = await Promise.all([
          api.getSimulacionVuelo(),
          api.getSimulacionTemplates(),
        ]);
        if (!activo) return;
        setVuelo(v);
        setTemplates(t.items || []);
        if ((t.items || []).length > 0) setTipoAlerta(t.items[0].clave);
        if ((v.awbs || []).length > 0) setGuia(v.awbs[0].guia);
      } catch (err) {
        if (activo) setErrorCarga(err.message);
      }
    })();
    return () => {
      activo = false;
    };
  }, []);

  const telefonoValido = useMemo(() => TELEFONO_E164.test(telefono), [telefono]);
  const puedeEnviar = tipoAlerta && telefonoValido && !enviando;

  async function handleDisparar() {
    setEnviando(true);
    setRespuesta(null);
    try {
      const res = await api.simularNotificacion({ tipoAlerta, telefono, guia });
      setRespuesta(res);
    } catch (err) {
      setRespuesta({ ok: false, error: err.message });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-5xl">
      <header className="flex items-center gap-3">
        <IconBell />
        <h1 className="text-lg font-bold tracking-wider text-slate-800 uppercase leading-tight">
          Simulación de notificaciones — vuelo 5Y 8676
        </h1>
      </header>

      <p className="text-[13px] text-muted">
        Panel de pruebas controladas. Envía un template de WhatsApp por la cuenta de Meta del
        proyecto a un número específico, sin tocar el flujo real de alertas.
      </p>

      {errorCarga && (
        <div className="card p-4 border border-danger text-danger text-sm">
          No se pudo cargar el panel: {errorCarga}
        </div>
      )}

      {vuelo && <VueloHeader vuelo={vuelo} />}

      <div className="card p-5 space-y-4 bg-card border border-border rounded-md">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
          Disparar alerta
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Campo label="Tipo de alerta (template)">
            <select
              value={tipoAlerta}
              onChange={(e) => setTipoAlerta(e.target.value)}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy/30"
            >
              {templates.length === 0 && <option value="">(cargando...)</option>}
              {templates.map((t) => (
                <option key={t.clave} value={t.clave}>
                  {t.description}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted mt-1">
              Hoy solo <code>hello_world</code> está garantizado APPROVED. Los 11 templates de
              negocio se agregan a este dropdown cuando Meta los apruebe.
            </p>
          </Campo>

          <Campo label="Número destino (E.164)">
            <input
              type="text"
              value={telefono}
              placeholder="+51933660928"
              onChange={(e) => setTelefono(e.target.value.trim())}
              className={`w-full border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 ${
                telefono === ''
                  ? 'border-border focus:ring-navy/30'
                  : telefonoValido
                  ? 'border-ok focus:ring-ok/30'
                  : 'border-danger focus:ring-danger/30'
              }`}
            />
            <p className="text-[11px] text-muted mt-1">
              Formato internacional, ej. <code>+51933660928</code>. El número debe estar
              verificado en Meta (test mode).
            </p>
          </Campo>

          {vuelo && vuelo.awbs && vuelo.awbs.length > 0 && (
            <Campo label="Guía (opcional)">
              <select
                value={guia}
                onChange={(e) => setGuia(e.target.value)}
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy/30"
              >
                {vuelo.awbs.map((a) => (
                  <option key={a.guia} value={a.guia}>
                    {a.guia} — {a.consignatario}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted mt-1">
                Se pasa como variable a templates que la necesiten. <code>hello_world</code> la
                ignora.
              </p>
            </Campo>
          )}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            disabled={!puedeEnviar}
            onClick={handleDisparar}
            className={`px-5 py-2 rounded-md text-sm font-semibold shadow-sm transition ${
              puedeEnviar
                ? 'bg-navy text-white hover:bg-navy/90'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {enviando ? 'Enviando...' : 'Disparar alerta'}
          </button>
          {telefono !== '' && !telefonoValido && (
            <span className="text-[12px] text-danger">
              El número debe estar en formato E.164.
            </span>
          )}
        </div>
      </div>

      {respuesta && <PanelRespuesta respuesta={respuesta} />}
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
        {label}
      </span>
      {children}
    </label>
  );
}

function VueloHeader({ vuelo }) {
  return (
    <div className="card p-5 bg-card border border-border rounded-md">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted">Vuelo en curso</div>
          <div className="text-2xl font-bold text-slate-800">{vuelo.vuelo}</div>
          <div className="text-sm text-slate-600">
            {vuelo.aerolinea} · {vuelo.ruta}
          </div>
        </div>
        <div className="text-right">
          <Dato label="Estado" valor={<EstadoBadge estado={vuelo.estado} />} />
          <Dato label="ETA" valor={formatFechaCorta(vuelo.eta)} />
        </div>
      </div>

      {vuelo.awbs && vuelo.awbs.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <div className="text-[11px] uppercase tracking-wider text-muted mb-2">
            Guías embarcadas ({vuelo.awbs.length})
          </div>
          <ul className="space-y-1 text-sm">
            {vuelo.awbs.map((a) => (
              <li key={a.guia} className="flex items-center justify-between gap-3">
                <span className="font-mono text-slate-800">{a.guia}</span>
                <span className="text-slate-600">{a.consignatario}</span>
                <span className="text-muted tabular-nums">
                  {a.piezas} pzs · {a.kg} kg
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Dato({ label, valor }) {
  return (
    <div className="flex items-baseline gap-2 justify-end">
      <span className="text-[11px] uppercase tracking-wider text-muted">{label}</span>
      <span className="text-sm font-semibold text-slate-800">{valor}</span>
    </div>
  );
}

function EstadoBadge({ estado }) {
  const color =
    estado === 'EN_RUTA'
      ? 'bg-warn/20 text-warn'
      : estado === 'ARRIBADO'
      ? 'bg-ok/20 text-ok'
      : 'bg-slate-200 text-slate-600';
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${color}`}>
      {estado}
    </span>
  );
}

function PanelRespuesta({ respuesta }) {
  const ok = respuesta.ok === true;
  return (
    <div
      className={`card p-4 rounded-md border ${
        ok ? 'border-ok/40 bg-ok/5' : 'border-danger/40 bg-danger/5'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`inline-block w-2.5 h-2.5 rounded-full ${ok ? 'bg-ok' : 'bg-danger'}`}
        />
        <span className="text-sm font-bold">
          {ok ? (respuesta.mock ? 'Enviado (modo MOCK)' : 'Enviado a Meta') : 'Error'}
        </span>
      </div>

      {ok && respuesta.messageId && (
        <Linea label="messageId" valor={<code className="text-[12px]">{respuesta.messageId}</code>} />
      )}
      {ok && respuesta.template && <Linea label="template" valor={respuesta.template} />}
      {ok && respuesta.telefono && <Linea label="teléfono" valor={respuesta.telefono} />}

      {!ok && (
        <>
          <Linea label="error" valor={respuesta.error} />
          {respuesta.code && <Linea label="code" valor={respuesta.code} />}
          {respuesta.meta && (
            <>
              <Linea
                label="meta.code"
                valor={<code className="text-[12px]">{respuesta.meta.code}</code>}
              />
              <Linea label="meta.message" valor={respuesta.meta.message} />
              {respuesta.meta.hint && (
                <Linea label="pista" valor={<em>{respuesta.meta.hint}</em>} />
              )}
            </>
          )}
        </>
      )}

      {ok && respuesta.payload && (
        <details className="mt-3">
          <summary className="text-[12px] text-muted cursor-pointer">
            Ver payload (MOCK)
          </summary>
          <pre className="text-[11px] bg-slate-50 border border-border rounded p-2 mt-2 overflow-auto">
            {JSON.stringify(respuesta.payload, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

function Linea({ label, valor }) {
  return (
    <div className="flex items-baseline gap-2 text-sm py-0.5">
      <span className="text-[11px] uppercase tracking-wider text-muted min-w-[88px]">
        {label}
      </span>
      <span className="text-slate-800">{valor}</span>
    </div>
  );
}

function formatFechaCorta(iso) {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    return d.toLocaleString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function IconBell() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-navy">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
