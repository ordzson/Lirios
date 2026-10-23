export function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function errorResponse(error: unknown): Response {
  if (error instanceof Response) {
    return error;
  }

  console.error(error);
  return json({ error: 'No pudimos completar la solicitud.' }, { status: 500 });
}
