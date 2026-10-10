import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LoginScreen } from './LoginScreen';

afterEach(() => vi.unstubAllGlobals());

const fill = async (id: string, token: string) => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('idInstance'), id);
  await user.type(screen.getByLabelText('apiTokenInstance'), token);
  await user.click(screen.getByRole('button', { name: 'Войти' }));
};

describe('LoginScreen', () => {
  it('отклоняет нечисловой idInstance, не обращаясь к сети', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<LoginScreen onLogin={vi.fn()} />);

    await fill('abc', 'token');

    expect(await screen.findByRole('alert')).toHaveTextContent('idInstance — это число');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('пускает в чат, если инстанс авторизован', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"stateInstance":"authorized"}')));
    const onLogin = vi.fn();
    render(<LoginScreen onLogin={onLogin} />);

    await fill('410022761607', 'tok');

    await vi.waitFor(() => expect(onLogin).toHaveBeenCalledWith({ idInstance: '410022761607', apiTokenInstance: 'tok' }));
  });

  it('необязательный apiUrl уходит в запрос и в учётные данные', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"stateInstance":"authorized"}'));
    vi.stubGlobal('fetch', fetchMock);
    const onLogin = vi.fn();
    render(<LoginScreen onLogin={onLogin} />);

    const user = userEvent.setup();
    await user.click(screen.getByText('Свой адрес API (необязательно)'));
    await user.type(screen.getByLabelText('apiUrl'), 'https://7103.api.example.com/');
    await fill('710300000000', 'tok');

    await vi.waitFor(() =>
      expect(onLogin).toHaveBeenCalledWith({
        idInstance: '710300000000',
        apiTokenInstance: 'tok',
        apiUrl: 'https://7103.api.example.com',
      }),
    );
    expect(fetchMock.mock.calls[0]![0]).toMatch(/^https:\/\/7103\.api\.example\.com\//);
  });

  it('отклоняет apiUrl без https, не обращаясь к сети', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<LoginScreen onLogin={vi.fn()} />);

    const user = userEvent.setup();
    await user.click(screen.getByText('Свой адрес API (необязательно)'));
    await user.type(screen.getByLabelText('apiUrl'), 'http://evil.example.com');
    await fill('410022761607', 'tok');

    expect(await screen.findByRole('alert')).toHaveTextContent('https-адресом');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('показывает ошибку, если инстанс не авторизован', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"stateInstance":"notAuthorized"}')));
    const onLogin = vi.fn();
    render(<LoginScreen onLogin={onLogin} />);

    await fill('410022761607', 'tok');

    expect(await screen.findByRole('alert')).toHaveTextContent('не авторизован');
    expect(onLogin).not.toHaveBeenCalled();
  });

  it('показывает понятную ошибку при неверном токене (401)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 401 })));
    render(<LoginScreen onLogin={vi.fn()} />);

    await fill('410022761607', 'bad');

    expect(await screen.findByRole('alert')).toHaveTextContent('Неверный apiTokenInstance');
  });
});
