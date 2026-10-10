import { useState, type FormEvent } from 'react';
import { createClient } from '../api/client';
import { GreenApiError } from '../api/errors';
import type { Credentials, InstanceState } from '../api/types';
import { TelegramLogo } from './icons';
import styles from './LoginScreen.module.css';

const STATE_MESSAGES: Partial<Record<InstanceState, string>> = {
  notAuthorized: 'Инстанс не авторизован: отсканируйте QR-код Telegram в личном кабинете GREEN-API.',
  pendingPassword: 'Для инстанса нужен пароль двухфакторной защиты Telegram (метод SendAuthorizationPassword).',
  starting: 'Инстанс ещё запускается (до 5 минут). Повторите попытку чуть позже.',
  blocked: 'Аккаунт Telegram заблокирован.',
  suspended: 'На аккаунт Telegram наложены временные ограничения.',
};

interface Props {
  onLogin: (credentials: Credentials) => void;
}

export function LoginScreen({ onLogin }: Props) {
  const [idInstance, setIdInstance] = useState('');
  const [apiTokenInstance, setApiTokenInstance] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const credentials = { idInstance: idInstance.trim(), apiTokenInstance: apiTokenInstance.trim() };

    if (!/^\d+$/.test(credentials.idInstance)) {
      setError('idInstance — это число, например 4100000000.');
      return;
    }
    if (!credentials.apiTokenInstance) {
      setError('Введите apiTokenInstance.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const state = await createClient(credentials).getStateInstance();
      if (state !== 'authorized') {
        setError(STATE_MESSAGES[state] ?? `Инстанс не готов к работе (состояние: ${state}).`);
        return;
      }
      onLogin(credentials);
    } catch (e) {
      setError(e instanceof GreenApiError ? e.message : 'Не удалось проверить учётные данные.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <form className={styles.card} onSubmit={submit} noValidate>
        <TelegramLogo className={styles.logo} />
        <h1 className={styles.title}>Вход в Telegram-чат</h1>
        <p className={styles.hint}>
          Введите данные инстанса из личного кабинета{' '}
          <a href="https://console.green-api.com" target="_blank" rel="noreferrer">
            GREEN-API
          </a>
          .
        </p>

        <label className={styles.field}>
          <span>idInstance</span>
          <input
            value={idInstance}
            onChange={(e) => setIdInstance(e.target.value)}
            inputMode="numeric"
            autoComplete="off"
            autoFocus
          />
        </label>

        <label className={styles.field}>
          <span>apiTokenInstance</span>
          <input
            value={apiTokenInstance}
            onChange={(e) => setApiTokenInstance(e.target.value)}
            type="password"
            autoComplete="off"
          />
        </label>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <button className={styles.submit} type="submit" disabled={loading}>
          {loading ? 'Проверяем…' : 'Войти'}
        </button>
      </form>
    </main>
  );
}
