export async function openHeaderMenu(page, menuLabel) {
    const menu = page.getByRole('link', { name: menuLabel });
    await menu.waitFor({ state: 'visible' });
    await menu.hover();
    await page.waitForTimeout(150);
  }
  
  export async function clickHeaderMenuItem(page, menuLabel, itemLabel) {
    await openHeaderMenu(page, menuLabel);
    const item = page.getByRole('link', { name: itemLabel });
    await item.waitFor({ state: 'visible' });
    await item.click();
  }
  

  