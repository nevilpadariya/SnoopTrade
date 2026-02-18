import { authFetch } from './authFetch';

export const fetchData = async (url: string, token?: string | null) => {
  const response = await authFetch(
    url,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    },
    token ?? undefined,
  );

  if (!response.ok) {
    const error = new Error(`Error ${response.status}: ${response.statusText}`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return response.json();
};
