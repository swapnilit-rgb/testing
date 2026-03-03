export async function openHeaderMenu(page, menuLabel) {
  const menu = page.getByRole('link', { name: menuLabel }).first();
  await menu.waitFor({ state: 'visible' });
  await menu.hover();
  await page.waitForTimeout(150);
}

export async function clickHeaderMenuItem(page, menuLabel, itemLabel) {
  await openHeaderMenu(page, menuLabel);

  const headerNav = page.locator('header').first();

  // First try a straightforward accessible-name match inside the header.
  let item = headerNav.getByRole('link', { name: itemLabel }).last();
  const count = await item.count();

  // If nothing matched (e.g. due to smart quotes / extra spaces),
  // fall back to a looser text contains match within header links.
  if (count === 0) {
    item = headerNav.locator('a', { hasText: itemLabel }).last();
  }

  await item.waitFor({ state: 'visible' });
  await item.click();
}
