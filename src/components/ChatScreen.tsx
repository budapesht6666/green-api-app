import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { createClient } from '../api/client';
import { GreenApiError } from '../api/errors';
import type { Credentials } from '../api/types';
import { useNotifications } from '../hooks/useNotifications';
import { chatReducer, type Chat } from '../state/chatReducer';
import { loadHistory, saveHistory } from '../state/storage';
import styles from './ChatScreen.module.css';
import { ChatWindow } from './ChatWindow';
import { NewChatDialog } from './NewChatDialog';
import { SetupBanner } from './SetupBanner';
import { Sidebar } from './Sidebar';

interface Props {
  credentials: Credentials;
  onLogout: () => void;
}

export function ChatScreen({ credentials, onLogout }: Props) {
  const client = useMemo(() => createClient(credentials), [credentials]);
  const [state, dispatch] = useReducer(chatReducer, credentials.idInstance, loadHistory);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const { error: connectionError } = useNotifications(client, dispatch);

  useEffect(() => {
    saveHistory(credentials.idInstance, state);
  }, [credentials.idInstance, state]);

  const sendMessage = useCallback(
    async (chatId: string, text: string) => {
      const tempId = `local-${crypto.randomUUID()}`;
      dispatch({ type: 'messageQueued', chatId, tempId, text, timestamp: Date.now() });
      try {
        const { idMessage } = await client.sendMessage(chatId, text);
        dispatch({ type: 'messageSent', chatId, tempId, idMessage });
      } catch (e) {
        const error = e instanceof GreenApiError ? e.message : 'Не удалось отправить сообщение.';
        dispatch({ type: 'messageFailed', chatId, tempId, error });
      }
    },
    [client],
  );

  const openChat = (chat: Chat) => {
    dispatch({ type: 'chatOpened', chat });
    setNewChatOpen(false);
  };

  const activeChat = state.chats.find((c) => c.chatId === state.activeChatId) ?? null;

  return (
    <div className={styles.app} data-chat-open={activeChat ? 'true' : 'false'}>
      <Sidebar
        chats={state.chats}
        messages={state.messages}
        unread={state.unread}
        activeChatId={state.activeChatId}
        onSelect={(chatId) => dispatch({ type: 'chatSelected', chatId })}
        onNewChat={() => setNewChatOpen(true)}
        onLogout={onLogout}
      />

      <section className={styles.main}>
        <SetupBanner client={client} />
        {connectionError && (
          <div className={styles.connectionError} role="alert">
            Нет связи при получении сообщений: {connectionError} Пробуем снова…
          </div>
        )}
        <ChatWindow
          chat={activeChat}
          messages={activeChat ? (state.messages[activeChat.chatId] ?? []) : []}
          onSend={(text) => activeChat && sendMessage(activeChat.chatId, text)}
          onBack={() => dispatch({ type: 'chatSelected', chatId: '' })}
          onNewChat={() => setNewChatOpen(true)}
        />
      </section>

      {newChatOpen && (
        <NewChatDialog client={client} onCreate={openChat} onClose={() => setNewChatOpen(false)} />
      )}
    </div>
  );
}
