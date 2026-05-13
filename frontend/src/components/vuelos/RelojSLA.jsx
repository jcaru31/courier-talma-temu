import { useEffect, useState } from 'react';

/**
 * Cronometro de la META del vuelo (antes SLA).
 *  - Mide desde ATA (arribo) hasta fin de la ultima transmision
 *  - Threshold: 5h 30m
 *  - Si esta corriendo, tickea cada segundo
 *  - Colores: verde (OK), amarillo (cerca del limite), rojo (incumplida)
 *  - Version compacta para Vista 2 (no ocupa demasiado espacio).
 */
export default function RelojSLA({ sla }) {
  const [extraSeg, setExtraSeg] = useState(0);
  const [loadedAt] = useState(Date.now());

  useEffect(() => {
    if (!sla?.corriendo) return;
    const id = setInterval(() => {
      setExtraSeg(Math.floor((Date.now() - loadedAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [sla?.corriendo, loadedAt]);

  if (!sla || sla.ata === null || sla.sla_minutos === null) {
    return (
      <div className="border border-border bg-slate-50 rounded-md px-3 py-2 inline-flex items-center gap-2">
        <ClockIcon color="#94A3B8" size={20} />
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted font-semibold">META</div>
          <div className="text-[12px] font-semibold text-slate-400 leading-tight">
            Sin medición — vuelo no arriba
          </div>
        </div>
      </div>
    );
  }

  const totalSeg = sla.sla_minutos * 60 + extraSeg;
  const hh = Math.floor(totalSeg / 3600);
  const mm = Math.floor((totalSeg % 3600) / 60);
  const ss = totalSeg % 60;

  const thresholdSeg = sla.threshold_minutos * 60;
  const ratio = totalSeg / thresholdSeg;
  const ok = ratio < 0.85;
  const warn = ratio >= 0.85 && ratio < 1;
  const tone = ok ? 'ok' : warn ? 'warn' : 'fail';

  const COLORS = {
    ok:   { border: 'border-ok',     bg: 'bg-emerald-50', text: 'text-ok',         track: 'bg-emerald-100', bar: 'bg-ok',     pill: 'bg-ok text-white',         pillLabel: 'EN PLAZO' },
    warn: { border: 'border-warn',   bg: 'bg-amber-50',   text: 'text-amber-700',  track: 'bg-amber-100',   bar: 'bg-warn',   pill: 'bg-warn text-slate-900',   pillLabel: 'POR VENCER' },
    fail: { border: 'border-danger', bg: 'bg-red-50',     text: 'text-danger',     track: 'bg-red-100',     bar: 'bg-danger', pill: 'bg-danger text-white',     pillLabel: 'INCUMPLIDA' },
  }[tone];

  const pct = Math.min(100, Math.round(ratio * 100));

  return (
    <div className={`border ${COLORS.border} ${COLORS.bg} rounded-md px-3 py-2`}>
      <div className="flex items-center gap-2.5">
        <ClockIcon color={tone === 'ok' ? '#00C853' : tone === 'warn' ? '#FFC107' : '#D32F2F'} size={22} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider text-muted font-semibold">META</span>
            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${COLORS.pill}`}>
              {COLORS.pillLabel}
            </span>
            {sla.corriendo && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </div>
          <div className={`text-xl font-bold tabular-nums leading-none mt-0.5 tracking-tight ${COLORS.text}`}>
            {pad(hh)}:{pad(mm)}:{pad(ss)}
          </div>
        </div>
        <div className="text-right leading-tight">
          <div className="text-[9px] uppercase tracking-wider text-muted font-semibold">Límite</div>
          <div className="text-[13px] font-bold text-slate-700 tabular-nums">05:30:00</div>
        </div>
      </div>

      <div className={`w-full h-1 rounded-full mt-1.5 overflow-hidden ${COLORS.track}`}>
        <div className={`h-full ${COLORS.bar} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>

      <div className="flex justify-between text-[9px] text-muted mt-1 tabular-nums">
        <span>ATA {formatHora(sla.ata)}</span>
        <span>
          {sla.fin_transmisiones
            ? `Fin transmisiones ${formatHora(sla.fin_transmisiones)}`
            : 'Transmisiones en curso'}
        </span>
      </div>
    </div>
  );
}

function ClockIcon({ color, size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 14" />
    </svg>
  );
}

function pad(n) { return String(n).padStart(2, '0'); }
function formatHora(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
