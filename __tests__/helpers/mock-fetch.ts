// Shared global.fetch mock helper with response factory.

interface MockResponseOptions {
  status?: number;
  ok?: boolean;
  json?: unknown;
  headers?: Record<string, string>;
}

export function mockFetchResponse(options: MockResponseOptions = {}) {
  const { status = 200, ok = status >= 200 && status < 300, json = {} } = options;
  return {
    status,
    ok,
    json: jest.fn().mockResolvedValue(json),
    headers: new Headers(options.headers),
  } as unknown as Response;
}

export function setupFetchMock() {
  const fetchMock = jest.fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>();
  global.fetch = fetchMock;
  return fetchMock;
}
