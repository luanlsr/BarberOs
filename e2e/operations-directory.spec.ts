import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const areas = [
  { path: '/clientes', title: 'Clientes', sample: 'Marcos Vinicius' },
  { path: '/equipe', title: 'Equipe', sample: 'Carlos Mendes' },
  { path: '/servicos', title: 'Servicos', sample: 'Corte classico' },
];
const viewports = [320, 390, 768, 1024, 1440, 1920];

for (const area of areas) {
  for (const width of viewports) {
    test(`${area.title} fits ${width}px viewport`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(area.path);

      await expect(page.getByRole('heading', { name: area.title, exact: true })).toBeVisible();
      await expect(page.getByText(area.sample).first()).toBeVisible();
      await expect(page.locator('#directory-form')).toBeVisible();

      const overflow = await page.evaluate(() => ({
        html: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
        viewport: window.innerWidth,
      }));
      expect(overflow.html).toBeLessThanOrEqual(width);
      expect(overflow.body).toBeLessThanOrEqual(width);
    });
  }
}

test('operations directory supports empty error offline disabled and accessibility states', async ({
  page,
}) => {
  await page.goto('/clientes?state=empty');
  await expect(page.getByRole('heading', { name: 'Ainda nao ha clientes' })).toBeVisible();

  await page.goto('/clientes?state=error');
  await expect(page.getByText('Codigo CORE_VALIDATION_ERROR')).toBeVisible();

  await page.goto('/clientes?state=offline');
  await expect(page.getByText('Offline ativo')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Salvar rascunho' })).toBeDisabled();

  await page.goto('/clientes?state=disabled');
  await expect(page.getByText('Formulario bloqueado')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Salvar rascunho' })).toBeDisabled();

  await page.goto('/servicos');
  const accessibilityScan = await new AxeBuilder({ page }).analyze();
  expect(accessibilityScan.violations).toEqual([]);
});
