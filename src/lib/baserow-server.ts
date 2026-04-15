import { getBaserowConfig } from './env';

type BaserowListResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export async function baserowListRows<T>(
  tableId: string,
  searchParams: URLSearchParams,
): Promise<BaserowListResponse<T>> {
  const { apiUrl, token } = getBaserowConfig();
  const url = `${apiUrl}/database/rows/table/${tableId}/?${searchParams.toString()}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Baserow HTTP ${response.status}: ${text.slice(0, 200)}`);
  }
  return (await response.json()) as BaserowListResponse<T>;
}

export async function baserowGetRow<T>(
  tableId: string,
  rowId: number,
): Promise<T | null> {
  const { apiUrl, token } = getBaserowConfig();
  const url = `${apiUrl}/database/rows/table/${tableId}/${rowId}/?user_field_names=true`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as T;
}

export async function baserowCreateRow<T>(
  tableId: string,
  fields: Record<string, unknown>,
): Promise<T> {
  const { apiUrl, token } = getBaserowConfig();
  const url = `${apiUrl}/database/rows/table/${tableId}/?user_field_names=true`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(fields),
    cache: 'no-store',
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Baserow HTTP ${response.status}: ${text.slice(0, 400)}`);
  }
  return (await response.json()) as T;
}

export async function baserowPatchRow<T>(
  tableId: string,
  rowId: number,
  fields: Record<string, unknown>,
): Promise<T> {
  const { apiUrl, token } = getBaserowConfig();
  const url = `${apiUrl}/database/rows/table/${tableId}/${rowId}/?user_field_names=true`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(fields),
    cache: 'no-store',
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Baserow HTTP ${response.status}: ${text.slice(0, 400)}`);
  }
  return (await response.json()) as T;
}
