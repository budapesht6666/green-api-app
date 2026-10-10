import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GreenApiClient } from '../api/client';
import { GreenApiError } from '../api/errors';
import type { Notification } from '../api/types';
import { useNotifications } from './useNotifications';

afterEach(() => vi.useRealTimers());

const text: Notification = {
  receiptId: 7,
  body: {
    typeWebhook: 'incomingMessageReceived',
    idMessage: 'm1',
    timestamp: 1,
    senderData: { chatId: '1' },
    messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'Привет' } },
  } as Notification['body'],
};

/** Следующий вызов «висит» до отмены, как настоящий long polling на пустой очереди. */
const idle = (signal: AbortSignal) =>
  new Promise<Notification | null>((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
  });

const flush = () => act(async () => { await vi.advanceTimersByTimeAsync(0); });

const makeClient = (receive: GreenApiClient['receiveNotification']) => {
  const deleteNotification = vi.fn().mockResolvedValue(true);
  return { client: { receiveNotification: receive, deleteNotification } as unknown as GreenApiClient, deleteNotification };
};

describe('useNotifications', () => {
  it('сначала передаёт уведомление в редьюсер, потом удаляет его из очереди', async () => {
    vi.useFakeTimers();
    const receive = vi.fn().mockResolvedValueOnce(text).mockImplementation(idle);
    const { client, deleteNotification } = makeClient(receive);
    const dispatch = vi.fn();

    renderHook(() => useNotifications(client, dispatch));
    await flush();

    expect(dispatch).toHaveBeenCalledWith({ type: 'notification', body: text.body });
    expect(deleteNotification).toHaveBeenCalledWith(7);
    expect(dispatch.mock.invocationCallOrder[0]).toBeLessThan(deleteNotification.mock.invocationCallOrder[0]!);
  });

  it('пустая очередь (null) ничего не удаляет и сразу опрашивает снова', async () => {
    vi.useFakeTimers();
    const receive = vi.fn().mockResolvedValueOnce(null).mockImplementation(idle);
    const { client, deleteNotification } = makeClient(receive);
    const dispatch = vi.fn();

    renderHook(() => useNotifications(client, dispatch));
    await flush();

    expect(receive).toHaveBeenCalledTimes(2);
    expect(dispatch).not.toHaveBeenCalled();
    expect(deleteNotification).not.toHaveBeenCalled();
  });

  it('при ошибке показывает её, ждёт 3 секунды и пробует снова; успех сбрасывает ошибку', async () => {
    vi.useFakeTimers();
    const receive = vi
      .fn()
      .mockRejectedValueOnce(new GreenApiError('GREEN-API не отвечает.'))
      .mockResolvedValueOnce(null)
      .mockImplementation(idle);
    const { client } = makeClient(receive);

    const dispatch = vi.fn();
    const { result } = renderHook(() => useNotifications(client, dispatch));
    await flush();
    expect(result.current.error).toBe('GREEN-API не отвечает.');
    expect(receive).toHaveBeenCalledTimes(1);

    await act(async () => { await vi.advanceTimersByTimeAsync(2999); });
    expect(receive).toHaveBeenCalledTimes(1);

    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(receive).toHaveBeenCalledTimes(3);
    expect(result.current.error).toBeNull();
  });

  it('при размонтировании отменяет текущий запрос и больше не опрашивает', async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const receive = vi.fn((s: AbortSignal) => {
      signal = s;
      return idle(s);
    });
    const { client } = makeClient(receive as GreenApiClient['receiveNotification']);

    const dispatch = vi.fn();
    const { unmount } = renderHook(() => useNotifications(client, dispatch));
    await flush();
    unmount();
    await flush();

    expect(signal?.aborted).toBe(true);
    expect(receive).toHaveBeenCalledTimes(1);
  });
});
