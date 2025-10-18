const { test, expect } = require('@playwright/test');

test.describe('Modal functionality', () => {
  test('should open and close the "Zelda" project modal', async ({ page }) => {
    await page.goto('http://localhost:8000/index.html');

    // Open the modal
    await page.click('a[href="#case-zeta"]');
    const modal = await page.locator('#case-zeta');
    await expect(modal).toBeVisible();
    await page.screenshot({ path: 'tests/modal_fix/screenshot-open.png' });

    // Close the modal
    await page.click('#case-zeta .modal-close');
    await expect(modal).not.toBeVisible();
    await page.screenshot({ path: 'tests/modal_fix/screenshot-closed.png' });
  });
});