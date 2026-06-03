// Lightweight API response normalizers to handle varying backend payload shapes
export function normalizeList<T>(resp: any): T[] {
  // Normalize common shapes: resp.data.data, resp.data, resp, etc.
  if (!resp) return [];
  // Prefer the nested data container if present
  const d = resp?.data ?? resp;
  if (Array.isArray(d)) return d as T[];
  if (d?.data && Array.isArray(d.data)) return d.data as T[];
  // Common API wrappers
  if (d?.messages && Array.isArray(d.messages)) return d.messages as T[];
  if ((d as any).loans && Array.isArray((d as any).loans)) return (d as any).loans as T[];
  if (d?.results && Array.isArray(d.results)) return d.results as T[];
  if (d?.items && Array.isArray(d.items)) return d.items as T[];
  return [];
}

export function normalizeSingle<T>(resp: any): T | undefined {
  if (!resp) return undefined;
  const d = resp?.data ?? resp;
  if (Array.isArray(d)) return d[0] as T;
  return d as T;
}
