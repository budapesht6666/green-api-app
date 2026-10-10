import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { Chat, ChatMessage } from '../state/chatReducer';
import { Avatar } from './Avatar';
import { useStickToBottom } from '../hooks/useStickToBottom';
import { BackIcon, SendIcon } from './icons';
import { MessageBubble } from './MessageBubble';
import styles from './ChatWindow.module.css';

const MAX_LENGTH = 4096; // лимит SendMessage

interface Props {
  chat: Chat | null;
  messages: ChatMessage[];
  onSend: (text: string) => void;
  onRetry: (message: ChatMessage) => void;
  onBack: () => void;
  onNewChat: () => void;
}

export function ChatWindow({ chat, messages, onSend, onRetry, onBack, onNewChat }: Props) {
  const [draft, setDraft] = useState('');
  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { onScroll, unseen, jumpToBottom } = useStickToBottom(messagesRef, {
    chatKey: chat?.chatId ?? null,
    messageCount: messages.length,
    lastIsOutgoing: messages.at(-1)?.outgoing ?? false,
  });

  // Высота поля растёт вместе с текстом (до ~6 строк).
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 140)}px`;
  }, [draft, chat?.chatId]);

  if (!chat) {
    return (
      <div className={styles.placeholder}>
        <span>Выберите чат или начните новый</span>
        <button type="button" onClick={onNewChat}>
          Новый чат
        </button>
      </div>
    );
  }

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft('');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className={styles.window}>
      <header className={styles.header}>
        <button className={styles.back} type="button" onClick={onBack} aria-label="Назад к списку чатов">
          <BackIcon />
        </button>
        <Avatar name={chat.title} size={40} />
        <div className={styles.headerText}>
          <div className={styles.headerTitle}>{chat.title}</div>
          {chat.phone && <div className={styles.headerSub}>{chat.phone}</div>}
        </div>
      </header>

      <div className={styles.messages} ref={messagesRef} onScroll={onScroll}>
        {messages.length === 0 ? (
          <div className={styles.empty}>Сообщений пока нет. Напишите первым.</div>
        ) : (
          messages.map((message) => <MessageBubble key={message.id} message={message} onRetry={onRetry} />)
        )}
      </div>

      {unseen > 0 && (
        <button className={styles.jump} type="button" onClick={jumpToBottom}>
          ↓ Новые сообщения: {unseen}
        </button>
      )}

      <form className={styles.composer} onSubmit={submit}>
        <textarea
          ref={inputRef}
          className={styles.input}
          value={draft}
          rows={1}
          maxLength={MAX_LENGTH}
          placeholder="Сообщение"
          aria-label="Сообщение"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button className={styles.send} type="submit" disabled={!draft.trim()} aria-label="Отправить">
          <SendIcon />
        </button>
      </form>
    </div>
  );
}
