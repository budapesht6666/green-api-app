import { useEffect, useState } from 'react';
import type { GreenApiClient } from '../api/client';
import { GreenApiError } from '../api/errors';
import type { InstanceSettings } from '../api/types';
import styles from './SetupBanner.module.css';

/** Настройки, без которых HTTP API не отдаёт входящие, исходящие и статусы сообщений. */
const REQUIRED: Partial<InstanceSettings> = {
  webhookUrl: '',
  incomingWebhook: 'yes',
  outgoingWebhook: 'yes',
  outgoingAPIMessageWebhook: 'yes',
  outgoingMessageWebhook: 'yes',
};

const isConfigured = (s: InstanceSettings) =>
  (Object.keys(REQUIRED) as (keyof InstanceSettings)[]).every((key) => s[key] === REQUIRED[key]);

type Phase = 'checking' | 'ok' | 'needsSetup' | 'applying' | 'applied';

/**
 * Проверяет настройки инстанса и, если уведомления выключены, предлагает включить их одной кнопкой.
 * SetSettings перезапускает инстанс, и настройки применяются в течение ~5 минут — об этом говорим явно.
 */
export function SetupBanner({ client }: { client: GreenApiClient }) {
  const [phase, setPhase] = useState<Phase>('checking');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    client
      .getSettings(controller.signal)
      .then((settings) => setPhase(isConfigured(settings) ? 'ok' : 'needsSetup'))
      .catch(() => setPhase('ok')); // не смогли проверить — не мешаем работать
    return () => controller.abort();
  }, [client]);

  const apply = async () => {
    setPhase('applying');
    setError(null);
    try {
      await client.setSettings(REQUIRED);
      setPhase('applied');
    } catch (e) {
      setError(e instanceof GreenApiError ? e.message : 'Не удалось сохранить настройки.');
      setPhase('needsSetup');
    }
  };

  if (phase === 'checking' || phase === 'ok') return null;

  if (phase === 'applied') {
    return (
      <div className={styles.banner} role="status">
        Настройки сохранены. Инстанс перезапускается — уведомления заработают в течение 5 минут.
      </div>
    );
  }

  return (
    <div className={styles.banner} role="alert">
      <span>
        В инстансе выключены уведомления, поэтому ответы из Telegram не появятся в чате.
        {error && <b> {error}</b>}
      </span>
      <button type="button" onClick={apply} disabled={phase === 'applying'}>
        {phase === 'applying' ? 'Сохраняем…' : 'Включить уведомления'}
      </button>
    </div>
  );
}
