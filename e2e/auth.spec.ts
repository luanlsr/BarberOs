import { expect, test } from '@playwright/test';

test.describe('identity and access', () => {
  test('renders the login contract without exposing the shell', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Entrar no BarberOS' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeHidden();
  });

  test('returns a generic auth configuration or credential error', async ({ request }) => {
    const response = await request.post('/api/auth/sign-in', {
      data: { email: 'invalid@example.com', password: 'invalid' },
    });
    expect([400, 401, 503]).toContain(response.status());
    const body = await response.json();
    expect(body.message ?? body.code).toBeTruthy();
  });
});
