import type { Chat, ChatMessage } from '../state/chatReducer';
import { formatTime } from '../lib/format';
import { Avatar } from './Avatar';
import { LogoutIcon, PlusIcon } from './icons';
import styles from './Sidebar.module.css';

interface Props {
  chats: Chat[];
  messages: Record<string, ChatMessage[]>;
  unread: Record<string, number>;
  activeChatId: string | null;
  onSelect: (chatId: string) => void;
  onNewChat: () => void;
  onLogout: () => void;
}

export function Sidebar({ chats, messages, unread, activeChatId, onSelect, onNewChat, onLogout }: Props) {
  return (
    <aside className={styles.sidebar}>
      <header className={styles.header}>
        <h1 className={styles.title}>Telegram</h1>
        <button className={styles.iconButton} type="button" onClick={onNewChat} title="Новый чат" aria-label="Новый чат">
          <PlusIcon />
        </button>
        <button className={styles.iconButton} type="button" onClick={onLogout} title="Выйти" aria-label="Выйти">
          <LogoutIcon />
        </button>
      </header>

      {chats.length === 0 ? (
        <div className={styles.empty}>
          <p>Чатов пока нет</p>
          <button className={styles.primary} type="button" onClick={onNewChat}>
            Новый чат
          </button>
        </div>
      ) : (
        <ul className={styles.list}>
          {chats.map((chat) => {
            const last = messages[chat.chatId]?.at(-1);
            const count = unread[chat.chatId] ?? 0;
            return (
              <li key={chat.chatId}>
                <button
                  type="button"
                  className={styles.item}
                  aria-current={chat.chatId === activeChatId}
                  onClick={() => onSelect(chat.chatId)}
                >
                  <Avatar name={chat.title} />
                  <span className={styles.body}>
                    <span className={styles.row}>
                      <span className={styles.name}>{chat.title}</span>
                      {last && <time className={styles.time}>{formatTime(last.timestamp)}</time>}
                    </span>
                    <span className={styles.row}>
                      <span className={styles.preview}>
                        {last ? `${last.outgoing ? 'Вы: ' : ''}${last.text}` : (chat.phone ?? '')}
                      </span>
                      {count > 0 && <span className={styles.badge}>{count}</span>}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
