import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api.js';

export function useAwbMasters(filtros = {}, page = 1, limit = 10) {
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
      const result = await api.listAwbMasters(params);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filtros), page, limit]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { ...data, loading, error, refetch: fetch };
}
