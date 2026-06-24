import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

export interface AsyncData<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  reload: () => void;
}

/**
 * Run an async query and expose {data, loading, error, reload}. Re-runs every
 * time the screen regains focus, so lists refresh after a create/edit/delete
 * on a pushed screen without manual cache wiring.
 */
export function useAsyncData<T>(run: () => Promise<T>, deps: unknown[]): AsyncData<T> {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // run is intentionally rebuilt when deps change; the dynamic dep array is
  // the whole point of this hook's API.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(run, deps);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      setError(null);
      load()
        .then((result) => {
          if (!cancelled) {
            setData(result);
            setLoading(false);
          }
        })
        .catch((err: unknown) => {
          if (!cancelled) {
            setError(err as Error);
            setLoading(false);
          }
        });
      return () => {
        cancelled = true;
      };
    }, [load]),
  );

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    load()
      .then(setData)
      .catch((err: unknown) => setError(err as Error))
      .finally(() => setLoading(false));
  }, [load]);

  return { data, loading, error, reload };
}
