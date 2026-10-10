/** Учётные данные инстанса GREEN-API (личный кабинет → инстанс). */
export interface Credentials {
  idInstance: string;
  apiTokenInstance: string;
  /** Хост инстанса из кабинета; если не задан, выводится из idInstance (см. apiUrlFor). */
  apiUrl?: string;
}

export type InstanceState =
  | 'notAuthorized'
  | 'authorized'
  | 'blocked'
  | 'suspended'
  | 'starting'
  | 'pendingPassword';

/** Часть ответа GetSettings, которая нужна для получения сообщений по HTTP API. */
export interface InstanceSettings {
  webhookUrl: string;
  incomingWebhook: 'yes' | 'no';
  outgoingWebhook: 'yes' | 'no';
  outgoingAPIMessageWebhook: 'yes' | 'no';
  outgoingMessageWebhook: 'yes' | 'no';
}

export interface CheckAccountResponse {
  exist: boolean;
  chatId: string;
  username?: string;
  phoneNumber?: number;
  fromCache?: boolean;
  /** Приходит вместо exist при ошибках уровня метода (HTTP 200). */
  status?: boolean;
  reason?: string;
  retryAfter?: number;
}

export interface SendMessageResponse {
  idMessage: string;
}

export interface SenderData {
  chatId: string;
  chatType?: string;
  chatName?: string;
  sender?: string;
  senderName?: string;
  senderContactName?: string;
  senderPhoneNumber?: number;
}

export interface MessageData {
  typeMessage: string;
  textMessageData?: { textMessage: string };
  extendedTextMessageData?: { text: string };
}

interface NotificationBase {
  idMessage: string;
  timestamp: number;
}

export interface MessageNotification extends NotificationBase {
  typeWebhook:
    | 'incomingMessageReceived'
    | 'outgoingMessageReceived'
    | 'outgoingAPIMessageReceived';
  senderData: SenderData;
  messageData: MessageData;
}

export type DeliveryStatus = 'delivered' | 'read' | 'failed' | 'noAccount';

export interface StatusNotification extends Partial<NotificationBase> {
  typeWebhook: 'outgoingMessageStatus';
  chatId: string;
  status: DeliveryStatus;
  description?: string;
}

/** Остальные типы (stateInstanceChanged, quotaExceeded, файлы, …) приложению не нужны. */
export interface OtherNotification {
  typeWebhook: string;
}

export type NotificationBody = MessageNotification | StatusNotification | OtherNotification;

export interface Notification {
  receiptId: number;
  body: NotificationBody;
}
