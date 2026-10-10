import { describe, expect, it } from 'vitest';
import type { MessageNotification, StatusNotification } from '../api/types';
import { chatReducer, initialChatState, isRetryable, type ChatState } from './chatReducer';

const CHAT = '10000000';

const incoming = (over: Partial<MessageNotification> = {}): MessageNotification => ({
  typeWebhook: 'incomingMessageReceived',
  idMessage: 'm1',
  timestamp: 1700000000,
  senderData: { chatId: CHAT, chatName: 'Василиса' },
  messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'Привет' } },
  ...over,
});

const notify = (state: ChatState, body: MessageNotification | StatusNotification) =>
  chatReducer(state, { type: 'notification', body });

describe('chatReducer: входящие', () => {
  it('создаёт чат и добавляет текстовое сообщение', () => {
    const state = notify(initialChatState, incoming());
    expect(state.chats).toEqual([{ chatId: CHAT, title: 'Василиса' }]);
    expect(state.messages[CHAT]).toMatchObject([{ id: 'm1', text: 'Привет', outgoing: false }]);
    expect(state.unread[CHAT]).toBe(1);
  });

  it('не дублирует повторно доставленное уведомление', () => {
    const once = notify(initialChatState, incoming());
    expect(notify(once, incoming()).messages[CHAT]).toHaveLength(1);
  });

  it('читает extendedTextMessage', () => {
    const state = notify(
      initialChatState,
      incoming({ messageData: { typeMessage: 'extendedTextMessage', extendedTextMessageData: { text: 'ссылка' } } }),
    );
    expect(state.messages[CHAT]?.[0]?.text).toBe('ссылка');
  });

  it('игнорирует нетекстовые сообщения', () => {
    const state = notify(initialChatState, incoming({ messageData: { typeMessage: 'imageMessage' } }));
    expect(state).toBe(initialChatState);
  });

  it('игнорирует сообщения групп и каналов', () => {
    const group = incoming({ senderData: { chatId: '-100500', chatType: 'supergroup', chatName: 'Группа' } });
    expect(notify(initialChatState, group)).toBe(initialChatState);
  });

  it('не копит непрочитанные в открытом чате', () => {
    const opened = chatReducer(initialChatState, { type: 'chatOpened', chat: { chatId: CHAT, title: 'В' } });
    expect(notify(opened, incoming()).unread).toEqual({});
  });
});

describe('chatReducer: отправка', () => {
  const queued = chatReducer(initialChatState, {
    type: 'messageQueued',
    chatId: CHAT,
    tempId: 'local-1',
    text: 'Привет',
    timestamp: 1,
  });

  it('заменяет временный id на idMessage', () => {
    const sent = chatReducer(queued, { type: 'messageSent', chatId: CHAT, tempId: 'local-1', idMessage: 'srv-1' });
    expect(sent.messages[CHAT]).toMatchObject([{ id: 'srv-1', status: 'sent' }]);
  });

  it('не создаёт дубль, если outgoingAPIMessageReceived пришло раньше ответа SendMessage', () => {
    const echoed = notify(queued, incoming({ typeWebhook: 'outgoingAPIMessageReceived', idMessage: 'srv-1' }));
    const sent = chatReducer(echoed, { type: 'messageSent', chatId: CHAT, tempId: 'local-1', idMessage: 'srv-1' });
    expect(sent.messages[CHAT]).toHaveLength(1);
    expect(sent.messages[CHAT]?.[0]?.id).toBe('srv-1');
  });

  it('помечает ошибку отправки', () => {
    const failed = chatReducer(queued, { type: 'messageFailed', chatId: CHAT, tempId: 'local-1', error: 'ой' });
    expect(failed.messages[CHAT]).toMatchObject([{ status: 'failed', error: 'ой' }]);
  });

  it('повтор возвращает неудавшееся сообщение в «отправляется» и убирает ошибку', () => {
    const failed = chatReducer(queued, { type: 'messageFailed', chatId: CHAT, tempId: 'local-1', error: 'ой' });
    const retried = chatReducer(failed, { type: 'messageRetry', chatId: CHAT, tempId: 'local-1' });
    expect(retried.messages[CHAT]).toHaveLength(1);
    expect(retried.messages[CHAT]?.[0]).toMatchObject({ id: 'local-1', status: 'sending', text: 'Привет' });
    expect(retried.messages[CHAT]?.[0]?.error).toBeUndefined();
  });

  it('повтор не трогает принятое сообщение: иначе вышел бы дубль', () => {
    const sent = chatReducer(queued, { type: 'messageSent', chatId: CHAT, tempId: 'local-1', idMessage: 'srv-1' });
    const undelivered = notify(sent, {
      typeWebhook: 'outgoingMessageStatus', chatId: CHAT, idMessage: 'srv-1', status: 'failed',
    });
    const after = chatReducer(undelivered, { type: 'messageRetry', chatId: CHAT, tempId: 'srv-1' });
    expect(after).toEqual(undelivered);
    expect(isRetryable(undelivered.messages[CHAT]![0]!)).toBe(false);
  });
});

describe('chatReducer: статусы', () => {
  const sent = (): ChatState => {
    let s = chatReducer(initialChatState, {
      type: 'messageQueued', chatId: CHAT, tempId: 't', text: 'x', timestamp: 1,
    });
    s = chatReducer(s, { type: 'messageSent', chatId: CHAT, tempId: 't', idMessage: 'srv-1' });
    return s;
  };
  const status = (s: StatusNotification['status'], description?: string): StatusNotification => ({
    typeWebhook: 'outgoingMessageStatus', chatId: CHAT, idMessage: 'srv-1', status: s, description,
  });

  it('повышает статус и не понижает его обратно', () => {
    const read = notify(notify(sent(), status('read')), status('delivered'));
    expect(read.messages[CHAT]?.[0]?.status).toBe('read');
  });

  it('noAccount → ошибка про отсутствие Telegram', () => {
    const state = notify(sent(), status('noAccount'));
    expect(state.messages[CHAT]?.[0]).toMatchObject({ status: 'failed' });
    expect(state.messages[CHAT]?.[0]?.error).toMatch(/нет Telegram/);
  });
});
