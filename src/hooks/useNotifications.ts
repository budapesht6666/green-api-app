import { useEffect, useState, type Dispatch } from 'react';
import type { GreenApiClient } from '../api/client';
import { GreenApiError } from '../api/errors';
import type { ChatAction } from '../state/chatReducer';

const RETRY_DELAY_MS = 3000;

export interface ConnectionState {
  /** Текст последней ошибки опроса; null — всё в порядке. */
  error: string | null;
}

/**
 * Получение сообщений по HTTP API: ReceiveNotification (long polling) → обработка → DeleteNotification.
 * Уведомление удаляется только после обработки, поэтому при обрыве оно придёт повторно;
 * дубликаты отсекает редьюсер по idMessage.
 */
export function useNotifications(client: GreenApiClient, dispatch: Dispatch<ChatAction>): ConnectionState {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    async function poll() {
      while (!signal.aborted) {
        try {
          const notification = await client.receiveNotification(signal);
          setError(null);
          if (!notification) continue; // очередь пуста — сервер ждал receiveTimeout

          dispatch({ type: 'notification', body: notification.body });
          await client.deleteNotification(notification.receiptId);
        } catch (e) {
          if (signal.aborted) return;
          setError(e instanceof GreenApiError ? e.message : 'Не удалось получить сообщения.');
          await sleep(RETRY_DELAY_MS, signal);
        }
      }
    }

    void poll();
    return () => controller.abort();
  }, [client, dispatch]);

  return { error };
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}
