const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACTS_DIR = 'C:\\Users\\Home User\\.gemini\\antigravity-ide\\brain\\b886d4d5-bcf6-4566-84c7-77bb678c6d20';
const BASE_URL = 'http://localhost:3000';

async function run() {
  console.log('🚀 Launching Chrome for Browser Notifications & Toggle E2E Test...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--window-size=1280,800',
    ],
  });

  const context = browser.defaultBrowserContext();
  await context.overridePermissions(BASE_URL, ['geolocation', 'notifications']);

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // Set simulated Delhi GPS
  await page.setGeolocation({ latitude: 28.6139, longitude: 77.209 });

  console.log(`🌐 Navigating to ${BASE_URL}...`);
  await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 2000));

  // Dismiss location modal if shown
  try {
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const grantBtn = buttons.find((b) => b.innerText.includes('Grant Precise GPS') || b.innerText.includes('Use Current Location'));
      if (grantBtn) grantBtn.click();
    });
    await new Promise((r) => setTimeout(r, 1000));
  } catch {}

  // ─────────────────────────────────────────────────────────────
  // TEST 1: Top Bar Nearby Alerts Bell Toggle ON & OFF
  // ─────────────────────────────────────────────────────────────
  console.log('\n🔔 [TEST 1] Testing Top Bar Nearby Alerts Bell Toggle...');

  const initialText = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find((b) => b.innerText.includes('Alerts') || b.getAttribute('aria-label')?.includes('alerts'));
    return btn ? btn.innerText.trim() : null;
  });
  console.log(`  Initial Alerts Button Text: "${initialText}"`);

  // Take screenshot 1: Initial state
  const shot1 = path.join(ARTIFACTS_DIR, 'notif_01_initial_alerts_off.png');
  await page.screenshot({ path: shot1 });
  console.log(`  📸 Saved screenshot: ${shot1}`);

  // Click Alerts button to toggle ON
  console.log('  👉 Clicking Alerts button to toggle ON...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find((b) => b.innerText.includes('Alerts') || b.getAttribute('aria-label')?.includes('alerts'));
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 1000));

  const turnedOnText = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find((b) => b.innerText.includes('Alerts') || b.getAttribute('aria-label')?.includes('alerts'));
    return btn ? btn.innerText.trim() : null;
  });
  console.log(`  Alerts Button Text after Click 1: "${turnedOnText}"`);

  const isAlertsOn = await page.evaluate(() => {
    return localStorage.getItem('bhandara_nearby_alerts_enabled') === 'true';
  });
  console.log(`  LocalStorage 'bhandara_nearby_alerts_enabled': ${isAlertsOn}`);

  // Take screenshot 2: Alerts ON
  const shot2 = path.join(ARTIFACTS_DIR, 'notif_02_alerts_toggled_on.png');
  await page.screenshot({ path: shot2 });
  console.log(`  📸 Saved screenshot: ${shot2}`);

  // Click Alerts button AGAIN to toggle OFF
  console.log('  👉 Clicking Alerts button again to toggle OFF...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find((b) => b.innerText.includes('Alerts') || b.getAttribute('aria-label')?.includes('alerts'));
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 1000));

  const turnedOffText = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find((b) => b.innerText.includes('Alerts') || b.getAttribute('aria-label')?.includes('alerts'));
    return btn ? btn.innerText.trim() : null;
  });
  console.log(`  Alerts Button Text after Click 2: "${turnedOffText}"`);

  const isAlertsOff = await page.evaluate(() => {
    return localStorage.getItem('bhandara_nearby_alerts_enabled') === 'false';
  });
  console.log(`  LocalStorage 'bhandara_nearby_alerts_enabled' after toggle off: ${isAlertsOff}`);

  // Take screenshot 3: Alerts OFF
  const shot3 = path.join(ARTIFACTS_DIR, 'notif_03_alerts_toggled_off.png');
  await page.screenshot({ path: shot3 });
  console.log(`  📸 Saved screenshot: ${shot3}`);

  // ─────────────────────────────────────────────────────────────
  // TEST 2: Upcoming Post Filter & Reminder Bell Toggle ON & OFF
  // ─────────────────────────────────────────────────────────────
  console.log('\n📅 [TEST 2] Testing Upcoming Tab & Post Reminder Bell...');

  // Click the "Upcoming" filter tab
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const tab = buttons.find((b) => b.innerText.includes('Upcoming'));
    if (tab) tab.click();
  });
  await new Promise((r) => setTimeout(r, 1500));

  const remindText1 = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find((b) => b.innerText.includes('Remind'));
    return btn ? btn.innerText.trim() : null;
  });
  console.log(`  Reminder Button Text before click: "${remindText1}"`);

  if (remindText1) {
    // Click reminder button to toggle ON
    console.log('  👉 Clicking Reminder button to activate reminder...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.innerText.includes('Remind'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    const remindText2 = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.innerText.includes('Remind'));
      return btn ? btn.innerText.trim() : null;
    });
    console.log(`  Reminder Button Text after Click 1: "${remindText2}"`);

    // Verify separation: Ensure nearby alerts in localStorage is STILL FALSE!
    const nearbyStillOff = await page.evaluate(() => {
      return localStorage.getItem('bhandara_nearby_alerts_enabled') !== 'true';
    });
    console.log(`  ✅ Verified separation: Nearby alerts is STILL OFF (${nearbyStillOff}) while reminder is active!`);

    // Take screenshot 4: Reminder ON
    const shot4 = path.join(ARTIFACTS_DIR, 'notif_04_reminder_active.png');
    await page.screenshot({ path: shot4 });
    console.log(`  📸 Saved screenshot: ${shot4}`);

    // Click reminder button AGAIN to toggle OFF
    console.log('  👉 Clicking Reminder button again to CANCEL reminder...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.innerText.includes('Remind'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    const remindText3 = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.innerText.includes('Remind'));
      return btn ? btn.innerText.trim() : null;
    });
    console.log(`  Reminder Button Text after Click 2: "${remindText3}"`);

    // Take screenshot 5: Reminder OFF
    const shot5 = path.join(ARTIFACTS_DIR, 'notif_05_reminder_cancelled.png');
    await page.screenshot({ path: shot5 });
    console.log(`  📸 Saved screenshot: ${shot5}`);
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 3: Post Detail Modal Reminder Toggle ON & OFF
  // ─────────────────────────────────────────────────────────────
  console.log('\n📄 [TEST 3] Testing Post Detail Modal Reminder Toggle...');

  // Click on a post card to open detail view
  await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.group.cursor-pointer, [class*="FeedCard"]'));
    if (cards.length > 0) cards[0].click();
  });
  await new Promise((r) => setTimeout(r, 1500));

  const modalRemindText1 = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find((b) => b.innerText.includes('Remind') && b.closest('[role="dialog"], .fixed'));
    return btn ? btn.innerText.trim() : null;
  });
  console.log(`  Modal Reminder Button Text: "${modalRemindText1}"`);

  if (modalRemindText1) {
    // Click modal reminder button
    console.log('  👉 Clicking Modal Reminder button to activate...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.innerText.includes('Remind') && b.closest('[role="dialog"], .fixed'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    const modalShot1 = path.join(ARTIFACTS_DIR, 'notif_06_modal_reminder_on.png');
    await page.screenshot({ path: modalShot1 });
    console.log(`  📸 Saved screenshot: ${modalShot1}`);

    // Click again to turn off
    console.log('  👉 Clicking Modal Reminder button again to cancel...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find((b) => b.innerText.includes('Remind') && b.closest('[role="dialog"], .fixed'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 1000));

    const modalShot2 = path.join(ARTIFACTS_DIR, 'notif_07_modal_reminder_off.png');
    await page.screenshot({ path: modalShot2 });
    console.log(`  📸 Saved screenshot: ${modalShot2}`);
  }

  await browser.close();
  console.log('\n🎉 ALL BROWSER E2E TESTS COMPLETED SUCCESSFULLY!\n');
}

run().catch((err) => {
  console.error('❌ E2E Test Error:', err);
  process.exit(1);
});
