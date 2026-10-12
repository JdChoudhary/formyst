import { chromium } from "playwright-core";

const EMAIL = "jdboadlia1@gmail.com";
const PASSWORD = "password";

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1720, height: 1100 } });
let errors = [];
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message.slice(0, 300)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text().slice(0, 250));
});

await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);

const emailInp = page.locator('input[type="email"], input[name="email"]');
const pwdInp = page.locator('input[type="password"], input[name="password"]');

try {
  await emailInp.first().fill(EMAIL);
  await pwdInp.first().fill(PASSWORD);
  await page.locator("form").first().click();
  await page.waitForTimeout(6000);
} catch (e) {
  console.log("login error:", e.message.slice(0, 120));
}

const url = page.url();
console.log("\n### after login url:", url);

// find a form link and go to its customize page
const formLinks = await page.evaluate(() =>
  Array.from(document.querySelectorAll("a[href]"))
    .map((a) => a.getAttribute("href"))
    .filter((h) => h && h.startsWith("/form-builder/"))
);
console.log("### form links:", JSON.stringify([...new Set(formLinks)].slice(0, 5)));
const customizeHref = formLinks.find((h) => h.includes("/customize/"));
const builderHref = formLinks.find((h) => !h.includes("/customize/") && !h.includes("/analytics") && !h.includes("/submissions"));
console.log("### using href:", customizeHref || builderHref);

if (customizeHref || builderHref) {
  const target = (customizeHref || builderHref).replace(/^https?:\/\/[^/]+/, "");
  await page.goto("http://localhost:3000" + target, { waitUntil: "networkidle" });
  await page.waitForTimeout(5000);
}

const sliders = page.locator('[data-slot="slider"]');
const n = await sliders.count();
console.log("\n### sliders count:", n);
for (let i = 0; i < Math.min(n, 10); i++) {
  const s = sliders.nth(i);
  const aria = await s.getAttribute("aria-labelledby").catch(() => null) || await s.getAttribute("aria-label").catch(() => null) || `slider-${i}`;
  const thumb = s.locator('[data-slot="slider-thumb"]');
  const thumbCount = await thumb.count();
  const visible = await s.isVisible().catch(() => false);
  console.log(`\nslider ${i} [${aria}]: visible=${visible} thumbs=${thumbCount}`);
  try {
    const box = await s.boundingBox().catch(() => null);
    console.log(`  slider box=${JSON.stringify(box)}`);
  } catch {}
  if (thumbCount > 0 && visible) {
    try {
      const tb = await thumb.first().boundingBox().catch(() => null);
      console.log(`  thumb box=${JSON.stringify(tb)}`);
      await thumb.first().hover();
      await page.mouse.down({ buttons: ["left"] });
      await page.waitForTimeout(500);
      const before = await thumb.first().evaluate((el) => el.getBoundingClientRect().left);
      await page.mouse.move(before + 30, 0, { steps: 8 });
      await page.waitForTimeout(500);
      const after = await thumb.first().evaluate((el) => el.getBoundingClientRect().left);
      await page.mouse.up();
      console.log(`  thumb x before=${before.toFixed(1)} after=${after.toFixed(1)} delta=${(after - before).toFixed(1)}`);
    } catch (e) {
      console.log("  interaction err:", e.message.slice(0, 140));
    }
  }
}

console.log("\n### errors:", errors.length);
for (const e of [...new Set(errors)].slice(0, 12)) console.log(" -", e);
await browser.close();
