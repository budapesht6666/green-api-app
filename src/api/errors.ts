/** Ошибка GREEN-API с текстом, который можно показать пользователю. */
export class GreenApiError extends Error {
  readonly status: number | undefined;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'GreenApiError';
    this.status = status;
  }
}

/** Человекочитаемое сообщение по HTTP-коду (см. «Стандартные ошибки» в документации). */
export function messageForStatus(status: number, details: string): string {
  switch (status) {
    case 400:
      if (/not authorized/i.test(details)) {
        return 'Инстанс не авторизован: отсканируйте QR-код в личном кабинете GREEN-API.';
      }
      if (/starting/i.test(details)) {
        return 'Инстанс запускается, повторите через несколько секунд.';
      }
      return details ? `Некорректный запрос: ${details}` : 'Некорректный запрос.';
    case 401:
      return 'Неверный apiTokenInstance.';
    case 403:
      return 'Неверный idInstance или нет доступа к инстансу.';
    case 429:
      return 'Слишком много запросов, подождите секунду.';
    case 466:
      return 'Исчерпан лимит тарифа Developer (3 чата в месяц). Используйте уже созданные чаты.';
    case 469:
      return 'Telegram временно ограничил аккаунт, повторите позже.';
    case 499:
    case 502:
    case 504:
      return 'GREEN-API временно недоступен, повторите позже.';
    default:
      return `Ошибка GREEN-API (HTTP ${status}).`;
  }
}
