import { useEffect, useState, type FormEvent } from 'react';
import type { GreenApiClient } from '../api/client';
import { GreenApiError } from '../api/errors';
import { formatPhone, normalizePhone, normalizeUsername } from '../lib/phone';
import type { Chat } from '../state/chatReducer';
import styles from './NewChatDialog.module.css';

interface Props {
  client: GreenApiClient;
  /** Уже созданные чаты: повторный ввод того же номера не должен тратить квоту CheckAccount. */
  chats: Chat[];
  onCreate: (chat: Chat) => void;
  onClose: () => void;
}

export function NewChatDialog({ client, chats, onCreate, onClose }: Props) {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const phoneNumber = normalizePhone(phone);
    const username = phoneNumber === null ? normalizeUsername(phone) : null;
    if (phoneNumber === null && username === null) {
      setError('Введите номер в международном формате (+7 999 888-77-66) или @username.');
      return;
    }

    const known = chats.find((chat) =>
      phoneNumber !== null
        ? chat.phone === formatPhone(phoneNumber)
        : chat.title.toLowerCase() === username!.toLowerCase(),
    );
    if (known) {
      onCreate(known);
      return;
    }

    setError(null);
    setLoading(true);
    try {
      // В Telegram chatId ≠ номер телефона: сначала узнаём chatId через CheckAccount.
      const account = await client.checkAccount(phoneNumber !== null ? { phoneNumber } : { username: username! });
      if (!account.exist || !account.chatId) {
        setError(
          phoneNumber !== null
            ? 'На этом номере нет Telegram, либо номер скрыт настройками приватности. Попробуйте ввести @username.'
            : 'Пользователь с таким именем не найден.',
        );
        return;
      }
      onCreate({
        chatId: account.chatId,
        title: account.username ? `@${account.username.replace(/^@/, '')}` : formatPhone(phoneNumber!),
        phone: phoneNumber !== null ? formatPhone(phoneNumber) : undefined,
      });
    } catch (e) {
      setError(e instanceof GreenApiError ? e.message : 'Не удалось проверить номер.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.backdrop} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="new-chat-title" onSubmit={submit} noValidate>
        <h2 id="new-chat-title" className={styles.title}>
          Новый чат
        </h2>
        <p className={styles.hint}>Номер телефона получателя (или @username), у которого есть Telegram.</p>

        <input
          className={styles.input}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          type="text"
          inputMode="text"
          placeholder="+7 999 888-77-66 или @username"
          aria-label="Номер телефона или @username"
          autoComplete="off"
          autoFocus
        />

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <div className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={onClose}>
            Отмена
          </button>
          <button type="submit" className={styles.create} disabled={loading}>
            {loading ? 'Проверяем…' : 'Создать чат'}
          </button>
        </div>
      </form>
    </div>
  );
}
