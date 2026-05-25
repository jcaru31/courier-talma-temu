import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api.js';
import InventarioModal from '../components/inventario/InventarioModal.jsx';

/**
 * Contexto del modal de inventario "En almacén". Vive a nivel App para que
 * tanto la cabecera de Vuelos como el ícono del sidebar puedan abrirlo sin
 * prop-drilling, y el modal se renderiza una sola vez aquí.
 *
 * `total` es el conteo físico real en almacén (incluye las de 0 días); se usa
 * para el badge del botón. El detalle de rangos y el filtrado por antigüedad
 * (solo 1+ día) vive dentro del propio modal.
 */
const Ctx = createContext({ open: () => {}, total: null });

export function useInventarioModal() {
  return useContext(Ctx);
}

export function InventarioModalProvider({ children }) {
  const [abierto, setAbierto] = useState(false);
  const [total, setTotal] = useState(null);

  // Conteo ligero al montar para el badge del botón. El modal vuelve a leer
  // el detalle completo cuando se abre.
  useEffect(() => {
    let cancelado = false;
    api
      .listInventario()
      .then((r) => { if (!cancelado) setTotal(r.total); })
      .catch(() => {});
    return () => { cancelado = true; };
  }, []);

  return (
    <Ctx.Provider value={{ open: () => setAbierto(true), total }}>
      {children}
      <InventarioModal abierto={abierto} onClose={() => setAbierto(false)} />
    </Ctx.Provider>
  );
}
