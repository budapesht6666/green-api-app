# Telegram-чат на GREEN-API

Веб-интерфейс для отправки и получения текстовых сообщений Telegram через [GREEN-API](https://green-api.com/telegram). React 19 + TypeScript + Vite.

## Как попробовать

1. В [личном кабинете GREEN-API](https://console.green-api.com) создайте Telegram-инстанс (тариф «Разработчик» бесплатный) и авторизуйте его: Telegram → Настройки → Устройства → Подключить устройство, затем «Получить QR» у инстанса.
2. Откройте приложение и введите `idInstance` и `apiTokenInstance` инстанса.
3. Нажмите «+» и введите номер получателя (у него должен быть Telegram) — чат появится в списке.
4. Напишите сообщение. Ответ получателя из Telegram появится в чате в течение нескольких секунд.

Если над чатом появилась жёлтая плашка «выключены уведомления» — нажмите «Включить уведомления» (инстанс перезапустится, это занимает до 5 минут).

> Тариф «Разработчик»: 3 чата и 100 проверок номеров.

## Как это работает

| Действие | Метод GREEN-API |
|---|---|
| Проверка входа | `getStateInstance` |
| Номер → chatId | `checkAccount` |
| Отправка текста | `sendMessage` |
| Получение сообщений | `receiveNotification` + `deleteNotification` (HTTP API, long polling) |

Бэкенда нет: браузер обращается к GREEN-API напрямую. Учётные данные хранятся только в `sessionStorage` вкладки, история переписки — в `localStorage`.

## Разработка

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Vitest
npm run lint
npm run build      # tsc + vite build → dist/
```
