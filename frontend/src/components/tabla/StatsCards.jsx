export default function StatsCards({ stats, filtros, onFiltrar }) {
  if (!stats) return null;

  const totalActivo = filtros.con_alertas !== 'true' && !filtros.tipo_alerta && !filtros.status;
  const aceActivo = filtros.tipo_alerta === 'ACE';
  const inmovActivo = filtros.tipo_alerta === 'INMOVILIZACION';
  const malEstadoActivo = filtros.tipo_alerta === 'MAL_ESTADO';

  const setTipoAlerta = (tipo) => {
    if (filtros.tipo_alerta === tipo) {
      const { tipo_alerta, ...rest } = filtros;
      onFiltrar(rest);
    } else {
      onFiltrar({ ...filtros, tipo_alerta: tipo, con_alertas: '' });
    }
  };

  const verTodas = () => onFiltrar({});

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <Card
        activo={totalActivo}
        onClick={verTodas}
        label="Total de guias"
        value={stats.total}
        accent="navy"
        sub={`${stats.por_status?.EN_PROCESO || 0} en proceso · ${stats.por_status?.DESPACHADO_A_ESEER || 0} despachadas`}
        icon={<IconBox />}
      />
      <Card
        activo={aceActivo}
        onClick={() => setTipoAlerta('ACE')}
        label="Con ACE activa"
        value={stats.alertas?.ACE || 0}
        accent="danger"
        sub="Accion de Control Extraordinario"
        icon={<IconWarn />}
      />
      <Card
        activo={inmovActivo}
        onClick={() => setTipoAlerta('INMOVILIZACION')}
        label="Inmovilizadas"
        value={stats.alertas?.INMOVILIZACION || 0}
        accent="orange"
        sub="Diferencias o retencion preventiva"
        icon={<IconLock />}
      />
      <Card
        activo={malEstadoActivo}
        onClick={() => setTipoAlerta('MAL_ESTADO')}
        label="Mal estado"
        value={stats.alertas?.MAL_ESTADO || 0}
        accent="warn"
        sub="Reporte de carga danada"
        icon={<IconBroken />}
      />
    </div>
  );
}

function Card({ label, value, sub, accent, icon, activo, onClick }) {
  const ACCENTS = {
    navy: {
      ring: 'ring-navy',
      bg: 'bg-navy/5',
      text: 'text-navy',
      badge: 'bg-navy text-white',
      border: activo ? 'border-navy' : 'border-border',
    },
    danger: {
      ring: 'ring-danger',
      bg: 'bg-red-50',
      text: 'text-danger',
      badge: 'bg-danger text-white',
      border: activo ? 'border-danger' : 'border-border',
    },
    orange: {
      ring: 'ring-orange-500',
      bg: 'bg-orange-50',
      text: 'text-orange-600',
      badge: 'bg-orange-500 text-white',
      border: activo ? 'border-orange-500' : 'border-border',
    },
    warn: {
      ring: 'ring-amber-400',
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      badge: 'bg-amber-400 text-slate-900',
      border: activo ? 'border-amber-400' : 'border-border',
    },
  };
  const a = ACCENTS[accent];

  return (
    <button
      onClick={onClick}
      className={`card text-left p-4 transition border-2 ${a.border} ${activo ? `${a.bg} ring-2 ${a.ring} ring-opacity-30` : 'hover:bg-slate-50'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="label-xs">{label}</div>
          <div className={`mt-1 text-3xl font-bold ${a.text}`}>{value}</div>
          <div className="text-[11px] text-muted mt-1 truncate">{sub}</div>
        </div>
        <div className={`w-9 h-9 rounded-md flex items-center justify-center ${a.badge}`}>
          {icon}
        </div>
      </div>
    </button>
  );
}

function IconBox() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}
function IconWarn() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2 1 21h22L12 2zm0 7 7 12H5l7-12zm-1 4v3h2v-3h-2zm0 4v2h2v-2h-2z" />
    </svg>
  );
}
function IconLock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
function IconBroken() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7" />
      <path d="M9 12l3 4 3-4" />
    </svg>
  );
}
