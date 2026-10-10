/**
 * Приводит введённый номер к виду, который принимает CheckAccount (международный формат, только цифры).
 * Возвращает null, если номер не похож на телефон (E.164: 8–15 цифр).
 */
export function normalizePhone(input: string): number | null {
  const digits = input.replace(/[\s\-().+]/g, '');
  if (!/^\d{8,15}$/.test(digits)) return null;
  return Number(digits);
}

export function formatPhone(phone: number | string): string {
  return `+${phone}`;
}

/** Имя пользователя Telegram: 5–32 символа, латиница/цифры/«_», начинается с буквы. Возвращает вид «@name». */
export function normalizeUsername(input: string): string | null {
  const name = input.trim().replace(/^@/, '');
  return /^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(name) ? `@${name}` : null;
}
