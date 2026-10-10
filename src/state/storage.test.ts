import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initialChatState } from './chatReducer';
import { loadCredentials, loadHistory, saveCredentials, saveHistory } from './storage';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

const message = { id: 'm1', text: 'Привет', outgoing: false, timestamp: 1, status: 'read' as const };

describe('storage: учётные данные', () => {
  it('сохраняет и читает, включая необязательный apiUrl', () => {
    saveCredentials({ idInstance: '1', apiTokenInstance: 't', apiUrl: 'https://x.example.com' });
    expect(loadCredentials()).toEqual({ idInstance: '1', apiTokenInstance: 't', apiUrl: 'https://x.example.com' });
  });

  it('без apiUrl поле не появляется', () => {
    saveCredentials({ idInstance: '1', apiTokenInstance: 't' });
    expect(loadCredentials()).toEqual({ idInstance: '1', apiTokenInstance: 't' });
  });

  it('битый JSON даёт null и предупреждение без содержимого', () => {
    sessionStorage.setItem('green-api-chat:credentials', '{oops');
    expect(loadCredentials()).toBeNull();
    expect(console.warn).toHaveBeenCalledOnce();
    expect(vi.mocked(console.warn).mock.calls[0]![0]).not.toContain('oops');
  });
});

describe('storage: история', () => {
  it('сохраняет историю, но не сообщения «в отправке»', () => {
    const state = {
      ...initialChatState,
      chats: [{ chatId: 'c', title: 'T' }],
      messages: { c: [message, { ...message, id: 'local-1', status: 'sending' as const }] },
    };
    saveHistory('1', state);
    expect(loadHistory('1').messages.c).toEqual([message]);
  });

  it('отбрасывает испорченные записи, но оставляет хорошие', () => {
    localStorage.setItem(
      'green-api-chat:history:1',
      JSON.stringify({
        chats: [{ chatId: 'c', title: 'T' }, { nope: true }, null],
        messages: { c: [message, { id: 5 }, 'мусор'], broken: 'не массив' },
      }),
    );
    const state = loadHistory('1');
    expect(state.chats).toEqual([{ chatId: 'c', title: 'T' }]);
    expect(state.messages).toEqual({ c: [message] });
  });

  it('при неверной форме или битом JSON возвращает пустое состояние', () => {
    localStorage.setItem('green-api-chat:history:1', JSON.stringify({ chats: 'x' }));
    expect(loadHistory('1')).toEqual(initialChatState);
    localStorage.setItem('green-api-chat:history:1', 'не json');
    expect(loadHistory('1')).toEqual(initialChatState);
  });

  it('сбой записи (переполнение квоты) не ломает приложение, но предупреждает', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    expect(() => saveHistory('1', initialChatState)).not.toThrow();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('QuotaExceededError'));
  });
});
