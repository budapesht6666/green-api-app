import type {
  MessageData,
  MessageNotification,
  NotificationBody,
  SenderData,
  StatusNotification,
} from '../api/types';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Chat {
  chatId: string;
  title: string;
  /** Номер, по которому чат создан (для подписи под названием). */
  phone?: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  outgoing: boolean;
  /** Unix-время в миллисекундах. */
  timestamp: number;
  status: MessageStatus;
  error?: string;
}

export interface ChatState {
  chats: Chat[];
  messages: Record<string, ChatMessage[]>;
  unread: Record<string, number>;
  activeChatId: string | null;
}

export const initialChatState: ChatState = {
  chats: [],
  messages: {},
  unread: {},
  activeChatId: null,
};

export type ChatAction =
  | { type: 'chatOpened'; chat: Chat }
  | { type: 'chatSelected'; chatId: string }
  | { type: 'messageQueued'; chatId: string; tempId: string; text: string; timestamp: number }
  | { type: 'messageSent'; chatId: string; tempId: string; idMessage: string }
  | { type: 'messageFailed'; chatId: string; tempId: string; error: string }
  | { type: 'notification'; body: NotificationBody };

const STATUS_RANK: Record<MessageStatus, number> = {
  sending: 0,
  failed: 0,
  sent: 1,
  delivered: 2,
  read: 3,
};

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'chatOpened': {
      const exists = state.chats.some((c) => c.chatId === action.chat.chatId);
      return {
        ...state,
        chats: exists ? state.chats : [action.chat, ...state.chats],
        activeChatId: action.chat.chatId,
        unread: withoutKey(state.unread, action.chat.chatId),
      };
    }

    case 'chatSelected':
      return {
        ...state,
        activeChatId: action.chatId,
        unread: withoutKey(state.unread, action.chatId),
      };

    case 'messageQueued':
      return addMessage(state, action.chatId, {
        id: action.tempId,
        text: action.text,
        outgoing: true,
        timestamp: action.timestamp,
        status: 'sending',
      });

    case 'messageSent': {
      const list = state.messages[action.chatId] ?? [];
      // Уведомление outgoingAPIMessageReceived могло прийти раньше ответа SendMessage —
      // тогда настоящее сообщение уже в списке, а временное надо просто убрать.
      if (list.some((m) => m.id === action.idMessage)) {
        return setMessages(state, action.chatId, list.filter((m) => m.id !== action.tempId));
      }
      return updateMessage(state, action.chatId, action.tempId, (m) => ({
        ...m,
        id: action.idMessage,
        status: 'sent',
      }));
    }

    case 'messageFailed':
      return updateMessage(state, action.chatId, action.tempId, (m) => ({
        ...m,
        status: 'failed',
        error: action.error,
      }));

    case 'notification':
      return applyNotification(state, action.body);
  }
}

function applyNotification(state: ChatState, body: NotificationBody): ChatState {
  if (isMessageNotification(body)) return applyMessage(state, body);
  if (isStatusNotification(body)) return applyStatus(state, body);
  return state;
}

function applyMessage(state: ChatState, n: MessageNotification): ChatState {
  const text = extractText(n.messageData);
  if (text === null) return state; // по ТЗ — только текстовые сообщения

  const { chatId } = n.senderData;
  if (!isPrivateChat(n.senderData)) return state; // группы и каналы вне задачи
  if ((state.messages[chatId] ?? []).some((m) => m.id === n.idMessage)) return state;

  const outgoing = n.typeWebhook !== 'incomingMessageReceived';
  let next = state;
  if (!state.chats.some((c) => c.chatId === chatId)) {
    const title = n.senderData.chatName || n.senderData.senderName || chatId;
    next = { ...state, chats: [{ chatId, title }, ...state.chats] };
  }
  next = addMessage(next, chatId, {
    id: n.idMessage,
    text,
    outgoing,
    timestamp: n.timestamp * 1000,
    status: outgoing ? 'sent' : 'read',
  });
  if (!outgoing && next.activeChatId !== chatId) {
    next = { ...next, unread: { ...next.unread, [chatId]: (next.unread[chatId] ?? 0) + 1 } };
  }
  return next;
}

function applyStatus(state: ChatState, n: StatusNotification): ChatState {
  if (!n.idMessage) return state;
  const id = n.idMessage;
  return updateMessage(state, n.chatId, id, (m) => {
    if (n.status === 'failed' || n.status === 'noAccount') {
      return { ...m, status: 'failed', error: describeFailure(n) };
    }
    return STATUS_RANK[n.status] > STATUS_RANK[m.status] ? { ...m, status: n.status } : m;
  });
}

function describeFailure(n: StatusNotification): string {
  if (n.status === 'noAccount') return 'У получателя нет Telegram или номер скрыт настройками приватности.';
  return n.description ? `Не доставлено: ${n.description}` : 'Не удалось доставить сообщение.';
}

/** У личного чата chatType = "user" и положительный chatId; у групп и каналов chatId начинается с «-». */
function isPrivateChat({ chatId, chatType }: SenderData): boolean {
  return !chatId.startsWith('-') && (chatType === undefined || chatType === 'user');
}

export function extractText(data: MessageData): string | null {
  if (data.typeMessage === 'textMessage') return data.textMessageData?.textMessage ?? null;
  if (data.typeMessage === 'extendedTextMessage') return data.extendedTextMessageData?.text ?? null;
  return null;
}

const MESSAGE_TYPES = ['incomingMessageReceived', 'outgoingMessageReceived', 'outgoingAPIMessageReceived'];

function isMessageNotification(body: NotificationBody): body is MessageNotification {
  return MESSAGE_TYPES.includes(body.typeWebhook) && 'senderData' in body && 'messageData' in body;
}

function isStatusNotification(body: NotificationBody): body is StatusNotification {
  return body.typeWebhook === 'outgoingMessageStatus' && 'chatId' in body && 'status' in body;
}

function addMessage(state: ChatState, chatId: string, message: ChatMessage): ChatState {
  return setMessages(state, chatId, [...(state.messages[chatId] ?? []), message]);
}

function setMessages(state: ChatState, chatId: string, list: ChatMessage[]): ChatState {
  return { ...state, messages: { ...state.messages, [chatId]: list } };
}

function updateMessage(
  state: ChatState,
  chatId: string,
  id: string,
  change: (m: ChatMessage) => ChatMessage,
): ChatState {
  const list = state.messages[chatId];
  if (!list?.some((m) => m.id === id)) return state;
  return setMessages(state, chatId, list.map((m) => (m.id === id ? change(m) : m)));
}

function withoutKey(record: Record<string, number>, key: string): Record<string, number> {
  if (!(key in record)) return record;
  const rest = { ...record };
  delete rest[key];
  return rest;
}
