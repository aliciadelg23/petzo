// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import { LoginForm } from './login-form';
import { HttpError } from '@/lib/errors';

// Mocks: navigation, hooks, store — só o que a LoginForm exige.
const replaceMock = vi.fn();
const searchGetMock = vi.fn().mockReturnValue(null);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
  useSearchParams: () => ({ get: searchGetMock }),
}));

// Mock da mutação de login — controlamos o comportamento por teste
const mutateAsyncMock = vi.fn();
vi.mock('../hooks', () => ({
  useLoginMutation: () => ({ mutateAsync: mutateAsyncMock, isPending: false }),
}));

describe('LoginForm', () => {
  beforeEach(() => {
    replaceMock.mockClear();
    mutateAsyncMock.mockReset();
  });

  it('valida email antes de submeter', async () => {
    renderWithProviders(<LoginForm />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), 'não-é-email');
    await user.type(screen.getByLabelText(/senha/i), 'x');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByText(/email inválido/i)).toBeInTheDocument();
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });

  it('sucesso: envia valores e redireciona para /conta (default)', async () => {
    mutateAsyncMock.mockResolvedValueOnce({ user: { role: 'CUSTOMER' } });
    renderWithProviders(<LoginForm />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), 'alice@petzo.test');
    await user.type(screen.getByLabelText(/senha/i), 'Password!1');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() =>
      expect(mutateAsyncMock).toHaveBeenCalledWith({
        email: 'alice@petzo.test',
        password: 'Password!1',
      }),
    );
    expect(replaceMock).toHaveBeenCalledWith('/conta');
  });

  it('redireciona para ?redirect=/carrinho quando query param presente', async () => {
    searchGetMock.mockImplementation((k: string) => (k === 'redirect' ? '/carrinho' : null));
    mutateAsyncMock.mockResolvedValueOnce({});
    renderWithProviders(<LoginForm />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/senha/i), 'x');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/carrinho'));
    searchGetMock.mockReturnValue(null); // restore
  });

  it('mostra erro amigável em 401', async () => {
    mutateAsyncMock.mockRejectedValueOnce(
      new HttpError({ status: 401, message: 'unauthorized' }),
    );
    renderWithProviders(<LoginForm />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/senha/i), 'errada');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByText(/email ou senha incorretos/i)).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
