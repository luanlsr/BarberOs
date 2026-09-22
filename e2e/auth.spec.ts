import { expect, test } from '@playwright/test';

test.describe('identity and access', () => {
  test('renders the login contract without exposing the shell', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Entrar no BarberOS' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Esqueci a senha' })).toHaveAttribute(
      'href',
      '/forgotpassword',
    );
    await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeHidden();
  });
  test('renders the forgot password route', async ({ page }) => {
    await page.goto('/forgotpassword');
    await expect(page.getByRole('heading', { name: 'Esqueci minha senha' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enviar link' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Voltar para o login' })).toHaveAttribute(
      'href',
      '/login',
    );
  });

  test('renders reset password mode when Supabase returns with a code', async ({ page }) => {
    await page.goto('/forgotpassword?code=recovery-code');
    await expect(page.getByRole('heading', { name: 'Criar nova senha' })).toBeVisible();
    await expect(page.getByLabel('Nova senha')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Salvar nova senha' })).toBeVisible();
  });

  test('returns a generic auth configuration or credential error', async ({ request }) => {
    const response = await request.post('/api/auth/sign-in', {
      data: { email: 'invalid@example.com', password: 'invalid' },
    });
    expect([400, 401, 503]).toContain(response.status());
    const body = await response.json();
    expect(body.message ?? body.code).toBeTruthy();
  });

  test('validates forgot password email payloads', async ({ request }) => {
    const response = await request.post('/api/auth/forgot-password', {
      data: { email: 'invalid' },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.code).toBe('INVALID_EMAIL');
  });
});
