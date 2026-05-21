import { NavLink } from 'react-router-dom';

export default function Sidebar() {
  return (
    <aside className="w-16 bg-navy text-white flex flex-col items-center py-4 shrink-0">
      <div className="mb-6 font-bold text-sm">
        T<span className="text-ok">.</span>
      </div>

      <nav className="flex flex-col gap-2">
        <NavLink
          to="/vuelos"
          className={({ isActive }) =>
            `w-10 h-10 rounded-md flex items-center justify-center transition ${
              isActive ? 'bg-white/15' : 'hover:bg-white/10'
            }`
          }
          title="Importaciones - Avance de vuelos"
        >
          <IconAvion />
        </NavLink>
        <NavLink
          to="/inventario"
          className={({ isActive }) =>
            `w-10 h-10 rounded-md flex items-center justify-center transition ${
              isActive ? 'bg-white/15' : 'hover:bg-white/10'
            }`
          }
          title="Inventario de guías TEMU"
        >
          <IconAlmacen />
        </NavLink>
      </nav>

      <div className="mt-auto flex flex-col gap-2 items-center">
        <button className="w-10 h-10 rounded-md hover:bg-white/10 flex items-center justify-center" title="Usuario">
          <IconUser />
        </button>
        <div className="w-10 h-10 rounded-md bg-white/10 flex items-center justify-center text-[11px] font-semibold">
          CA
        </div>
      </div>
    </aside>
  );
}

function IconAvion() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
    </svg>
  );
}

function IconAlmacen() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-5 9 5v11H3z" />
      <rect x="7" y="13" width="3" height="4" />
      <rect x="14" y="13" width="3" height="4" />
      <line x1="3" y1="20" x2="21" y2="20" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c2-4 6-6 8-6s6 2 8 6" />
    </svg>
  );
}
