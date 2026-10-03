/** Spike only: the three flows from ../maestro, driven by WebdriverIO through Appium. */
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { remote } from 'webdriverio';

const APP = 'com.alchemyshop';
let driver;

before(async () => {
  driver = await remote({
    hostname: '127.0.0.1',
    port: 4723,
    logLevel: 'error',
    capabilities: {
      platformName: 'Android',
      'appium:automationName': 'UiAutomator2',
      'appium:appPackage': APP,
      'appium:appActivity': '.MainActivity',
      'appium:noReset': true,
      'appium:newCommandTimeout': 120,
    },
  });
});
after(() => driver?.deleteSession());

beforeEach(async () => {
  await driver.terminateApp(APP);
  await driver.execute('mobile: clearApp', { appId: APP });
  await driver.activateApp(APP);
});

const byId = (id) => driver.$(`android=new UiSelector().resourceId("${id}")`);
const tap = async (id) => {
  const element = await byId(id);
  await element.waitForDisplayed({ timeout: 15000 });
  await element.click();
};
const type = async (id, text) => {
  const element = await byId(id);
  await element.waitForDisplayed({ timeout: 15000 });
  await element.click();
  await element.setValue(text);
};
const textOf = async (id) => {
  const element = await byId(id);
  await element.waitForDisplayed({ timeout: 15000 });
  return element.getText();
};

test('cart totals', async () => {
  await tap('add-1');
  await tap('add-1');
  await tap('nav-cart');
  assert.equal(await textOf('quantity-1'), '2');
  assert.equal(await textOf('subtotal'), 'Subtotal: 49.00');
  assert.equal(await textOf('shipping'), 'Shipping: 4.99');
});

test('promo code', async () => {
  await tap('add-1');
  await tap('nav-cart');
  await type('promo-code', 'SAVE10');
  if (await driver.isKeyboardShown()) await driver.hideKeyboard();
  await tap('apply-code');
  assert.equal(await textOf('discount'), 'Discount: 2.45');
});

test('checkout', async () => {
  await tap('add-4');
  await tap('add-4');
  await tap('nav-cart');
  await tap('go-to-checkout');
  await type('field-name', 'Ada');
  await type('field-email', 'ada@example.com');
  await type('field-postcode', '12345');
  if (await driver.isKeyboardShown()) await driver.hideKeyboard();
  await tap('place-order');
  assert.match(await textOf('order-placed'), /^Order placed: A-\d+/);
});
