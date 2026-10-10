import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { GreenApiClient } from '../api/client';
import { NewChatDialog } from './NewChatDialog';

const setup = (checkAccount: GreenApiClient['checkAccount']) => {
  const onCreate = vi.fn();
  const client = { checkAccount } as GreenApiClient;
  render(<NewChatDialog client={client} onCreate={onCreate} onClose={vi.fn()} />);
  return { onCreate, user: userEvent.setup() };
};

const submit = async (user: ReturnType<typeof userEvent.setup>, value: string) => {
  await user.type(screen.getByLabelText('Номер телефона или @username'), value);
  await user.click(screen.getByRole('button', { name: 'Создать чат' }));
};

describe('NewChatDialog', () => {
  it('по номеру: проверяет аккаунт и создаёт чат с chatId из CheckAccount', async () => {
    const checkAccount = vi.fn().mockResolvedValue({ exist: true, chatId: '688534819', username: '@dorozhkin_pv' });
    const { onCreate, user } = setup(checkAccount);

    await submit(user, '+7 904 040-10-38');

    expect(checkAccount).toHaveBeenCalledWith({ phoneNumber: 79040401038 });
    expect(onCreate).toHaveBeenCalledWith({ chatId: '688534819', title: '@dorozhkin_pv', phone: '+79040401038' });
  });

  it('по @username: ищет по имени', async () => {
    const checkAccount = vi.fn().mockResolvedValue({ exist: true, chatId: '1' });
    const { user } = setup(checkAccount);

    await submit(user, 'dorozhkin_pv');

    expect(checkAccount).toHaveBeenCalledWith({ username: '@dorozhkin_pv' });
  });

  it('если Telegram на номере нет — понятное сообщение и чат не создаётся', async () => {
    const { onCreate, user } = setup(vi.fn().mockResolvedValue({ exist: false, chatId: '' }));

    await submit(user, '+79990000000');

    expect(await screen.findByRole('alert')).toHaveTextContent('нет Telegram');
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('некорректный ввод не уходит в API', async () => {
    const checkAccount = vi.fn();
    const { user } = setup(checkAccount);

    await submit(user, '123');

    expect(await screen.findByRole('alert')).toHaveTextContent('международном формате');
    expect(checkAccount).not.toHaveBeenCalled();
  });
});
