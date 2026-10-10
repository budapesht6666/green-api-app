import { describe, expect, it, vi, afterEach } from 'vitest';
import { apiUrlFor, createClient } from './client';

afterEach(() => vi.unstubAllGlobals());

describe('apiUrlFor', () => {
  it('берёт хост из первых четырёх цифр idInstance', () => {
    expect(apiUrlFor('410022761607')).toBe('https://4100.api.green-api.com');
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

  it('401 → понятная ошибка про токен', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 401 })));
    await expect(createClient(creds).getStateInstance()).rejects.toThrow('Неверный apiTokenInstance.');
  });
});
