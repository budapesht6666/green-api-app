import { describe, expect, it } from 'vitest';
import { normalizePhone, normalizeUsername } from './phone';

describe('normalizePhone', () => {
  it.each([
    ['+7 999 888-77-66', 79998887766],
    ['7(999)8887766', 79998887766],
    ['79998887766', 79998887766],
  ])('%s → %d', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each(['', 'abc', '123', '+7 999 xx', '1234567890123456'])('отклоняет «%s»', (input) => {
    expect(normalizePhone(input)).toBeNull();
  });
});

describe('normalizeUsername', () => {
  it.each([['@budopesht666', '@budopesht666'], ['durov', '@durov'], ['  @Some_Name1 ', '@Some_Name1']])('%s → %s', (input, expected) => {
    expect(normalizeUsername(input)).toBe(expected);
  });

  it.each(['', '@abc', '1user_name', '@имя', '@a b c d e'])('отклоняет «%s»', (input) => {
    expect(normalizeUsername(input)).toBeNull();
  });
});
