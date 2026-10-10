import { GreenApiError, messageForStatus } from './errors';
import type {
  CheckAccountResponse,
  Credentials,
  InstanceSettings,
  InstanceState,
  Notification,
  SendMessageResponse,
} from './types';

/**
 * Хост инстанса GREEN-API (поле apiUrl в личном кабинете): первые 4 цифры idInstance,
 * например 410022761607 → https://4100.api.green-api.com.
 */
export const apiUrlFor = (idInstance: string): string =>
  `https://${idInstance.slice(0, 4)}.api.green-api.com`;

/** Таймаут ожидания уведомления на стороне сервера, 5–60 с (long polling). */
export const RECEIVE_TIMEOUT_SEC = 20;

/** Сколько ждём ответа обычного запроса, прежде чем считать соединение оборванным. */
export const REQUEST_TIMEOUT_MS = 20_000;

/** Для long polling к таймауту сервера добавляем запас на сеть: иначе зависшее соединение остановит приём молча. */
const RECEIVE_REQUEST_TIMEOUT_MS = RECEIVE_TIMEOUT_SEC * 1000 + 10_000;

/** Приводит введённый apiUrl к виду «https://хост» без хвостового «/». Возвращает null, если это не https-адрес. */
export function normalizeApiUrl(input: string): string | null {
  try {
    const url = new URL(input.trim());
    return url.protocol === 'https:' ? url.origin : null;
  } catch {
    return null;
  }
}

/** Кого искать: по номеру (число, без «+») или по имени пользователя («@name»). */
export type AccountTarget = { phoneNumber: number } | { username: string };

export interface GreenApiClient {
  getStateInstance(signal?: AbortSignal): Promise<InstanceState>;
  getSettings(signal?: AbortSignal): Promise<InstanceSettings>;
  setSettings(settings: Partial<InstanceSettings>): Promise<void>;
  checkAccount(target: AccountTarget): Promise<CheckAccountResponse>;
  sendMessage(chatId: string, message: string): Promise<SendMessageResponse>;
  receiveNotification(signal?: AbortSignal): Promise<Notification | null>;
  deleteNotification(receiptId: number): Promise<boolean>;
}

/** Клиент GREEN-API (Telegram): по одному экземпляру на пару idInstance/apiTokenInstance. */
export function createClient(
  { idInstance, apiTokenInstance, apiUrl }: Credentials,
  baseUrl: string = apiUrl || apiUrlFor(idInstance),
): GreenApiClient {
  const url = (method: string, tail = '') =>
    `${baseUrl}/waInstance${encodeURIComponent(idInstance)}/${method}/${encodeURIComponent(apiTokenInstance)}${tail}`;

  async function request<T>(
    method: string,
    init: { verb?: string; body?: unknown; tail?: string; signal?: AbortSignal; timeoutMs?: number } = {},
  ): Promise<T> {
    const { verb = 'GET', body, tail, signal, timeoutMs = REQUEST_TIMEOUT_MS } = init;
    const timeout = AbortSignal.timeout(timeoutMs);
    let response: Response;
    try {
      response = await fetch(url(method, tail), {
        method: verb,
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      if (timeout.aborted) throw new GreenApiError('GREEN-API не отвечает. Повторим попытку.');
      throw new GreenApiError('Нет связи с GREEN-API. Проверьте интернет-соединение.');
    }

    const text = await response.text();
    if (!response.ok) {
      throw new GreenApiError(messageForStatus(response.status, readDetails(text)), response.status);
    }
    return (text ? JSON.parse(text) : null) as T;
  }

  return {
    async getStateInstance(signal) {
      const data = await request<{ stateInstance: InstanceState }>('getStateInstance', { signal });
      return data.stateInstance;
    },

    getSettings: (signal) => request<InstanceSettings>('getSettings', { signal }),

    async setSettings(settings) {
      await request('setSettings', { verb: 'POST', body: settings });
    },

    async checkAccount(target) {
      const data = await request<CheckAccountResponse>('checkAccount', {
        verb: 'POST',
        body: target,
      });
      // Часть ошибок метода приходит с HTTP 200 и полем reason.
      if (data.status === false) throw new GreenApiError(messageForReason(data.reason));
      return data;
    },

    sendMessage: (chatId, message) =>
      request<SendMessageResponse>('sendMessage', { verb: 'POST', body: { chatId, message } }),

    // Пустая очередь → тело `null`.
    receiveNotification: (signal) =>
      request<Notification | null>('receiveNotification', {
        tail: `?receiveTimeout=${RECEIVE_TIMEOUT_SEC}`,
        signal,
        timeoutMs: RECEIVE_REQUEST_TIMEOUT_MS,
      }),

    async deleteNotification(receiptId) {
      const data = await request<{ result: boolean }>('deleteNotification', {
        verb: 'DELETE',
        tail: `/${receiptId}`,
      });
      return data.result;
    },
  };
}

function readDetails(text: string): string {
  try {
    const data: unknown = JSON.parse(text);
    if (data && typeof data === 'object') {
      const { message, error } = data as { message?: unknown; error?: unknown };
      return String(message ?? error ?? '');
    }
  } catch {
    // тело не JSON — отдадим как есть
  }
  return text;
}

function messageForReason(reason: string | undefined): string {
  if (reason === 'rate_limit_exceeded') {
    return 'Слишком много проверок номеров. GREEN-API советует приостановить проверки примерно на 2 часа.';
  }
  if (reason && /not authorized|starting/i.test(reason)) {
    return 'Инстанс не авторизован или ещё запускается.';
  }
  return reason ? `Не удалось проверить номер: ${reason}` : 'Не удалось проверить номер.';
}
