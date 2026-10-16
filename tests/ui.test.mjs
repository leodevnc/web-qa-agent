import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { renderSuite } from "../src/ui.mjs";
import { saveReport } from "../src/report.mjs";

let browser, directory;
const results = [
  {
    name: "Cart regression",
    status: "failed",
    expected: "failed",
    report: "report.html",
  },
  {
    name: "Healthy",
    status: "passed",
    expected: "passed",
    report: "report.html",
  },
  {
    name: "Restricted",
    status: "blocked",
    expected: "blocked",
    report: "report.html",
  },
  {
    name: "Timeout",
    status: "incomplete",
    expected: "incomplete",
    report: "report.html",
  },
];
const report = {
  name: "Cart regression",
  goal: "Check two items",
  planner: "scripted",
  status: "failed",
  viewport: { width: 1280, height: 800 },
  startURL: "http://127.0.0.1:8000/healthy",
  steps: [
    {
      index: 1,
      action: { type: "fill", target: { testId: "quantity" }, value: "2" },
      outcome: "completed",
    },
  ],
  checks: [
    {
      contract: {
        type: "text",
        target: { testId: "cart" },
        expected: "Cart: 2 items",
      },
      actual: "Cart: 1 items",
      passed: false,
    },
  ],
  findings: [{ kind: "assertion", message: "Expected two; observed one" }],
  trace: false,
  finalScreenshot: false,
};
before(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), "web-qa-ui-"));
  browser = await chromium.launch();
  await writeFile(
    path.join(directory, "index.html"),
    renderSuite(results, true),
  );
  await saveReport(directory, report);
});
after(async () => {
  await browser?.close();
});
const open = async (file, width = 1440) => {
  const page = await browser.newPage({ viewport: { width, height: 1000 } });
  await page.goto(pathToFileURL(path.join(directory, file)).href);
  return page;
};

test("suite counts are actual QA outcomes, not expected fixture matches", async () => {
  const page = await open("index.html");
  try {
    assert.deepEqual(await page.locator(".stats dd").allTextContents(), [
      "4",
      "1",
      "1",
    ]);
    assert.deepEqual(
      await page.locator(".run-result .badge").allTextContents(),
      ["failed", "passed", "blocked", "incomplete"],
    );
    assert.match(await page.locator(".notice").innerText(), /no model called/);
  } finally {
    await page.close();
  }
});
test("suite and report fit mobile, tablet and desktop without external resources", async () => {
  for (const width of [320, 390, 768, 1440])
    for (const file of ["index.html", "report.html"]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      const external = [];
      page.on("request", (r) => {
        if (/^https?:/.test(r.url())) external.push(r.url());
      });
      try {
        await page.goto(pathToFileURL(path.join(directory, file)).href);
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
          file + " at " + width,
        );
        assert.equal(await page.locator("h1").count(), 1);
        assert.deepEqual(external, []);
      } finally {
        await page.close();
      }
    }
});
test("keyboard skip link, section links and report navigation work", async () => {
  const page = await open("index.html", 390);
  try {
    await page.keyboard.press("Tab");
    assert.equal(await page.locator(":focus").innerText(), "Skip to content");
    assert.equal(
      await page
        .locator(":focus")
        .evaluate((el) => getComputedStyle(el).outlineStyle),
      "solid",
    );
    await page.keyboard.press("Enter");
    assert.equal(await page.locator(":focus").getAttribute("id"), "main");
    await page.getByRole("link", { name: "Explore results" }).click();
    assert.match(page.url(), /#runs$/);
    for (const href of await page
      .locator("nav a")
      .evaluateAll((links) => links.map((a) => a.getAttribute("href")))) {
      assert.equal(await page.locator(href).count(), 1);
    }
    await page
      .getByRole("link", { name: "Cart regression", exact: true })
      .click();
    assert.equal(await page.locator("h1").innerText(), "Cart regression");
  } finally {
    await page.close();
  }
});
test("readable check values retain expandable contracts and action detail", async () => {
  const page = await open("report.html", 390);
  try {
    assert.deepEqual(await page.locator(".comparison dd").allTextContents(), [
      "Cart: 2 items",
      "Cart: 1 items",
    ]);
    await page.getByText("Check contract", { exact: true }).click();
    assert.equal(
      await page.locator("#checks details").getAttribute("open"),
      "",
    );
    assert.match(
      await page.locator("#checks pre").innerText(),
      /"expected": "Cart: 2 items"/,
    );
    await page.getByText("Action details", { exact: true }).click();
    assert.match(await page.locator("#steps pre").innerText(), /"value": "2"/);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
  } finally {
    await page.close();
  }
});
test("empty and incomplete reports expose missing evidence instead of a success state", async () => {
  const emptyDir = await mkdtemp(path.join(os.tmpdir(), "web-qa-empty-"));
  await saveReport(emptyDir, {
    ...report,
    status: "incomplete",
    steps: [],
    checks: [],
    findings: [],
  });
  const page = await browser.newPage();
  try {
    await page.goto(pathToFileURL(path.join(emptyDir, "report.html")).href);
    assert.equal(await page.locator(".hero .badge").innerText(), "incomplete");
    assert.match(await page.locator("#checks").innerText(), /cannot pass/);
    assert.match(
      await page.locator("#steps").innerText(),
      /No browser actions/,
    );
    assert.match(
      await page.locator("#evidence").innerText(),
      /screenshot unavailable/,
    );
    assert.equal(
      await page.getByRole("link", { name: "Playwright trace" }).count(),
      0,
    );
  } finally {
    await page.close();
  }
});
