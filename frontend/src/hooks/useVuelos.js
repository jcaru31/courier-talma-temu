import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api.js';

export function useVuelos(filtros = {}, page = 1, limit = 10) {
  const [data, setData] = useState({ items: [], total: 0, total_pages: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit, ...filtros };
      Object.keys(params).forEach((k) => {
        if (params[k] === '' || params[k] == null) delete params[k];
      });
      const result = await api.listVuelos(params);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filtros), page, limit]);

  useEffect(() => { fetch(); }, [fetch]);

  return { ...data, loading, error, refetch: fetch };
}

export function useVueloDetail(manifiesto) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    if (!manifiesto) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.getVuelo(manifiesto);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [manifiesto]);

  useEffect(() => { fetch(); }, [fetch]);

  return { vuelo: data, loading, error, refetch: fetch };
}
