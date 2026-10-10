import { formatTime } from '../lib/format';
import type { ChatMessage } from '../state/chatReducer';
import { CheckIcon, ClockIcon, DoubleCheckIcon } from './icons';
import styles from './MessageBubble.module.css';

function StatusIcon({ status }: { status: ChatMessage['status'] }) {
  switch (status) {
    case 'sending':
      return <ClockIcon className={styles.icon} />;
    case 'sent':
      return <CheckIcon className={styles.icon} />;
    case 'delivered':
      return <DoubleCheckIcon className={styles.icon} />;
    case 'read':
      return <DoubleCheckIcon className={styles.icon} />;
    case 'failed':
      return null;
  }
}

const STATUS_LABELS: Record<ChatMessage['status'], string> = {
  sending: 'Отправляется',
  sent: 'Отправлено',
  delivered: 'Доставлено',
  read: 'Прочитано',
  failed: 'Не отправлено',
};

export function MessageBubble({ message }: { message: ChatMessage }) {
  const { outgoing, status } = message;
  return (
    <div className={`${styles.row} ${outgoing ? styles.out : styles.in}`}>
      <div className={styles.bubble} data-status={status}>
        <span className={styles.text}>{message.text}</span>
        <span className={styles.meta}>
          {formatTime(message.timestamp)}
          {outgoing && (
            <span className={styles.status} title={STATUS_LABELS[status]}>
              <StatusIcon status={status} />
            </span>
          )}
        </span>
        {message.error && (
          <div className={styles.error} role="alert">
            {message.error}
          </div>
        )}
      </div>
    </div>
  );
}
