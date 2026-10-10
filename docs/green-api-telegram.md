# GREEN-API для Telegram — шпаргалка

Документация: https://green-api.com/telegram/docs/ · консоль: https://console.green-api.com
(ссылки из ТЗ `green-api.com/v3/docs/...` — это MAX, не Telegram.)

URL: `{apiUrl}/waInstance{idInstance}/{метод}/{apiTokenInstance}`, `apiUrl` — персональный хост инстанса из кабинета: `https://{первые 4 цифры idInstance}.api.green-api.com` (проверено на 410022761607 → `4100`).

| Метод | HTTP | Тело / параметры | Ответ |
|---|---|---|---|
| `getStateInstance` | GET | — | `{stateInstance}`: `authorized`, `notAuthorized`, `starting`, `pendingPassword`, `blocked`, `suspended` |
| `getSettings` / `setSettings` | GET / POST | см. ниже | настройки; `setSettings` перезапускает инстанс (до 5 мин) |
| `checkAccount` | POST | `{phoneNumber: 79998887766}` (число, без `+`) или `{username:"@x"}` | `{exist, chatId, username?, phoneNumber?, fromCache}`; нет аккаунта: `{exist:false, chatId:""}`; ошибки с HTTP 200: `{status:false, reason}`; 469 — лимит Telegram |
| `sendMessage` | POST | `{chatId, message}` (≤4096 симв.) | `{idMessage}` — сообщение поставлено в очередь, не доставлено |
| `receiveNotification` | GET | `?receiveTimeout=5..60` | `{receiptId, body}` или `null` |
| `deleteNotification` | DELETE | `/{receiptId}` | `{result: true}` |

Лимиты в секунду на инстанс: receive/delete 100, send 50, checkAccount 10. Превышение → 429.

## Настройки для приёма по HTTP API
`webhookUrl: ""`, `incomingWebhook`, `outgoingWebhook` (статусы), `outgoingAPIMessageWebhook` (отправленные через API), `outgoingMessageWebhook` (отправленные с телефона) — `"yes"`.

## Формат уведомлений (`body`)
- Входящее текстовое: `typeWebhook: "incomingMessageReceived"`, `idMessage`, `timestamp` (сек), `senderData{chatId, chatName, senderName, senderPhoneNumber}`, `messageData{typeMessage:"textMessage", textMessageData{textMessage}}`. Ссылки — `extendedTextMessage` → `extendedTextMessageData.text`.
- Отправленное через API: `outgoingAPIMessageReceived` (то же тело).
- Отправленное с телефона: `outgoingMessageReceived`.
- Статус: `{typeWebhook:"outgoingMessageStatus", chatId, idMessage, status: delivered|read|failed|noAccount, description?}`. `failed`/`noAccount` отключить нельзя — обрабатывать обязательно.
- Для приватного чата `chatId` — положительное число строкой (`"10000000"`), для групп — отрицательное.

## Ограничения тарифа Developer
3 чата в месяц, 100 `checkAccount`. Ошибка 466 (`CORRESPONDENTS_QUOTA_EXCEEDED`). Один получатель в разных форматах (`номер@c.us` и `chatId`) считается двумя чатами — поэтому всегда используем только `chatId` из `checkAccount`.

## Авторизация инстанса
Один инстанс = один аккаунт Telegram. Telegram → Настройки → Устройства → Подключить устройство, затем в консоли у инстанса «Получить QR» (или `StartAuthorization` + `SendAuthorizationCode`). Создание инстанса может занять до 2 минут.
