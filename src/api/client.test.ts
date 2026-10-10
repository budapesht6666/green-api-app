import { describe, expect, it, vi, afterEach } from 'vitest';
import { apiUrlFor, createClient, normalizeApiUrl, RECEIVE_TIMEOUT_SEC, REQUEST_TIMEOUT_MS } from './client';

afterEach(() => vi.unstubAllGlobals());

describe('apiUrlFor', () => {
  it('берёт хост из первых четырёх цифр idInstance', () => {
    expect(apiUrlFor('410022761607')).toBe('https://4100.api.green-api.com');
  });
});

describe('normalizeApiUrl', () => {
  it('оставляет только https-origin', () => {
    expect(normalizeApiUrl(' https://4100.api.green-api.com/ ')).toBe('https://4100.api.green-api.com');
    expect(normalizeApiUrl('https://4100.api.green-api.com/waInstance1/')).toBe('https://4100.api.green-api.com');
  });

  it('отклоняет http и мусор', () => {
    expect(normalizeApiUrl('http://4100.api.green-api.com')).toBeNull();
    expect(normalizeApiUrl('api.green-api.com')).toBeNull();
    expect(normalizeApiUrl('')).toBeNull();
  });
});

describe('createClient', () => {
  const creds = { idInstance: '410022761607', apiTokenInstance: 'tok' };

  it('sendMessage шлёт POST на хост инстанса с chatId и message', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"idMessage":"42"}'));
    vi.stubGlobal('fetch', fetchMock);

    const result = await createClient(creds).sendMessage('10000000', 'Привет');

    expect(result).toEqual({ idMessage: '42' });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://4100.api.green-api.com/waInstance410022761607/sendMessage/tok');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ chatId: '10000000', message: 'Привет' });
  });

  it('receiveNotification возвращает null при пустой очереди', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('null')));
    expect(await createClient(creds).receiveNotification()).toBeNull();
  });

  it('deleteNotification шлёт DELETE с receiptId', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"result":true}'));
    vi.stubGlobal('fetch', fetchMock);
    await createClient(creds).deleteNotification(7);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toMatch(/deleteNotification\/tok\/7$/);
    expect(init.method).toBe('DELETE');
  });

  it('checkAccount передаёт номер числом и превращает reason в ошибку', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"status":false,"reason":"rate_limit_exceeded"}'));
    vi.stubGlobal('fetch', fetchMock);
    await expect(createClient(creds).checkAccount({ phoneNumber: 79998887766 })).rejects.toThrow(/Слишком много проверок/);
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({ phoneNumber: 79998887766 });
  });

  it('использует apiUrl из учётных данных вместо вычисленного хоста', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('null'));
    vi.stubGlobal('fetch', fetchMock);

    await createClient({ ...creds, apiUrl: 'https://7103.api.example.com' }).receiveNotification();

    expect(fetchMock.mock.calls[0]![0]).toMatch(/^https:\/\/7103\.api\.example\.com\/waInstance410022761607\/receiveNotification\/tok\?receiveTimeout=/);
  });

  it('зависший запрос обрывается по таймауту с понятной ошибкой', async () => {
    // AbortSignal.timeout не подчиняется fake timers, поэтому подменяем сигнал и проверяем длительность.
    const timeout = new AbortController();
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(timeout.signal);
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init.signal!.addEventListener('abort', () => reject(new DOMException('timeout', 'TimeoutError')));
        });
      }),
    );

    const result = createClient(creds).sendMessage('1', 'hi');
    timeout.abort();

    await expect(result).rejects.toThrow('GREEN-API не отвечает');
    expect(timeoutSpy).toHaveBeenCalledWith(REQUEST_TIMEOUT_MS);
    timeoutSpy.mockRestore();
  });

  it('для long polling таймаут запроса больше серверного receiveTimeout', async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('null')));

    await createClient(creds).receiveNotification();

    expect(timeoutSpy).toHaveBeenCalledWith(RECEIVE_TIMEOUT_SEC * 1000 + 10_000);
    timeoutSpy.mockRestore();
  });

  it('отмена со стороны вызывающего не превращается в «ошибку связи»', async () => {
    const controller = new AbortController();
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init.signal!.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        });
      }),
    );
    const pending = createClient(creds).receiveNotification(controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('401 → понятная ошибка про токен', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 401 })));
    await expect(createClient(creds).getStateInstance()).rejects.toThrow('Неверный apiTokenInstance.');
  });
});
