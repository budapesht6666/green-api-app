import type { Credentials } from '../api/types';
import { initialChatState, type Chat, type ChatMessage, type ChatState } from './chatReducer';

// Учётные данные живут только в рамках вкладки (sessionStorage), история переписки — в localStorage
// по ключу инстанса. Любой сбой хранилища (приватный режим, квота, битые данные) не должен ломать
// приложение: чтение откатывается к пустому состоянию, запись пропускается — но не молча.

const CREDENTIALS_KEY = 'green-api-chat:credentials';
const historyKey = (idInstance: string) => `green-api-chat:history:${idInstance}`;

/** В консоль уходит только название ошибки: ни токенов, ни текста сообщений. */
function warn(action: string, error: unknown): void {
  const name = typeof error === 'object' && error !== null && 'name' in error ? String(error.name) : 'ошибка';
  console.warn(`Хранилище: не удалось ${action} (${name}).`);
}

export function loadCredentials(): Credentials | null {
  try {
    const raw = sessionStorage.getItem(CREDENTIALS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<Credentials>;
    if (!data.idInstance || !data.apiTokenInstance) return null;
    return {
      idInstance: data.idInstance,
      apiTokenInstance: data.apiTokenInstance,
      ...(data.apiUrl ? { apiUrl: data.apiUrl } : {}),
    };
  } catch (error) {
    warn('прочитать учётные данные', error);
    return null;
  }
}

export function saveCredentials(credentials: Credentials | null): void {
  try {
    if (credentials) sessionStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
    else sessionStorage.removeItem(CREDENTIALS_KEY);
  } catch (error) {
    // без сохранения придётся ввести данные заново после перезагрузки
    warn('сохранить учётные данные', error);
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isChat = (value: unknown): value is Chat =>
  isRecord(value) && typeof value.chatId === 'string' && typeof value.title === 'string';

const isMessage = (value: unknown): value is ChatMessage =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.text === 'string' &&
  typeof value.outgoing === 'boolean' &&
  typeof value.timestamp === 'number' &&
  typeof value.status === 'string';

/** Оставляет только корректные записи: одна испорченная не должна ронять рендер всей истории. */
function sanitizeHistory(data: unknown): ChatState {
  if (!isRecord(data) || !Array.isArray(data.chats) || !isRecord(data.messages)) return initialChatState;
  const messages: Record<string, ChatMessage[]> = {};
  for (const [chatId, list] of Object.entries(data.messages)) {
    if (Array.isArray(list)) messages[chatId] = list.filter(isMessage);
  }
  return { ...initialChatState, chats: data.chats.filter(isChat), messages };
}

export function loadHistory(idInstance: string): ChatState {
  try {
    const raw = localStorage.getItem(historyKey(idInstance));
    return raw ? sanitizeHistory(JSON.parse(raw)) : initialChatState;
  } catch (error) {
    warn('прочитать историю', error);
    return initialChatState;
  }
}

export function saveHistory(idInstance: string, state: ChatState): void {
  try {
    // Сообщения «в отправке» после перезагрузки уже не отправятся — не сохраняем их.
    const messages = Object.fromEntries(
      Object.entries(state.messages).map(([id, list]) => [id, list.filter((m) => m.status !== 'sending')]),
    );
    localStorage.setItem(historyKey(idInstance), JSON.stringify({ chats: state.chats, messages }));
  } catch (error) {
    // история не сохранится — не критично
    warn('сохранить историю', error);
  }
}
