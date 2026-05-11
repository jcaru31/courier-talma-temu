import { useEffect, useRef, useState } from 'react';

const INTERVALO_SEG = 5 * 60;

export function useAutoRefresh(onRefresh) {
  const [segundos, setSegundos] = useState(INTERVALO_SEG);
  const cbRef = useRef(onRefresh);
  cbRef.current = onRefresh;

  useEffect(() => {
    const id = setInterval(() => {
      setSegundos((s) => {
        if (s <= 1) {
          cbRef.current?.();
          return INTERVALO_SEG;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const reset = () => setSegundos(INTERVALO_SEG);

  return {
    minutos: String(Math.floor(segundos / 60)).padStart(2, '0'),
    segundos: String(segundos % 60).padStart(2, '0'),
    reset,
  };
}
