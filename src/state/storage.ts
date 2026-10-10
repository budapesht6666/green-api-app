import type { Credentials } from '../api/types';
import { initialChatState, type ChatState } from './chatReducer';

// Учётные данные живут только в рамках вкладки (sessionStorage), история переписки — в localStorage
// по ключу инстанса. Любой сбой хранилища (приватный режим, квота) не должен ломать приложение.

const CREDENTIALS_KEY = 'green-api-chat:credentials';
const historyKey = (idInstance: string) => `green-api-chat:history:${idInstance}`;

export function loadCredentials(): Credentials | null {
  try {
    const raw = sessionStorage.getItem(CREDENTIALS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<Credentials>;
    return data.idInstance && data.apiTokenInstance
      ? { idInstance: data.idInstance, apiTokenInstance: data.apiTokenInstance }
      : null;
  } catch {
    return null;
  }
}

export function saveCredentials(credentials: Credentials | null): void {
  try {
    if (credentials) sessionStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
    else sessionStorage.removeItem(CREDENTIALS_KEY);
  } catch {
    // без сохранения придётся ввести данные заново после перезагрузки
  }
}

export function loadHistory(idInstance: string): ChatState {
  try {
    const raw = localStorage.getItem(historyKey(idInstance));
    if (!raw) return initialChatState;
    const data = JSON.parse(raw) as Partial<ChatState>;
    if (!Array.isArray(data.chats) || typeof data.messages !== 'object' || !data.messages) {
      return initialChatState;
    }
    return { ...initialChatState, chats: data.chats, messages: data.messages };
  } catch {
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
  } catch {
    // история не сохранится — не критично
  }
}

export function clearHistory(idInstance: string): void {
  try {
    localStorage.removeItem(historyKey(idInstance));
  } catch {
    // ignore
  }
}
