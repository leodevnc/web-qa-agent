import { chromium } from "playwright";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import {
  PolicyError,
  targetOrigin,
  scopedURL,
  validateScenario,
  validateAction,
  locator,
} from "./policy.mjs";
import { ScriptedPlanner } from "./planner.mjs";
import { saveReport } from "./report.mjs";

export async function runScenario({
  target,
  scenario,
  output = "artifacts",
  viewport = { width: 1280, height: 800 },
  planner,
  maxActions = 20,
  actionTimeout = 1500,
  plannerTimeout = 1500,
  deadlineMs = 20000,
}) {
  const origin = targetOrigin(target);
  scenario = validateScenario(scenario, origin);
  if (!Number.isInteger(maxActions) || maxActions < 1 || maxActions > 20)
    throw new PolicyError("Invalid action budget");
  for (const n of [actionTimeout, deadlineMs, plannerTimeout])
    if (!Number.isInteger(n) || n < 100 || n > 60000)
      throw new PolicyError("Invalid timeout");
  if (
    !viewport ||
    Object.keys(viewport).sort().join(",") !== "height,width" ||
    ![viewport.width, viewport.height].every(
      (n) => Number.isInteger(n) && n >= 320 && n <= 1920,
    )
  )
    throw new PolicyError("Invalid viewport");
  planner ??= new ScriptedPlanner(scenario.steps);
  await mkdir(output, { recursive: true });
  const directory = await mkdtemp(path.join(path.resolve(output), "run-"));
  const report = {
    schema: 1,
    name: scenario.name,
    goal: scenario.goal,
    planner: planner.name || "custom",
    startURL: scopedURL(origin, scenario.path),
    viewport,
    status: "incomplete",
    steps: [],
    checks: [],
    findings: [],
    trace: false,
    finalScreenshot: false,
  };
  await writeFile(
    path.join(directory, "scenario.json"),
    JSON.stringify(scenario, null, 2),
  );
  const observations = [],
    events = [];
  let browser,
    context,
    page,
    timer,
    decisionController,
    expired = false,
    dropped = 0;
  const started = performance.now();
  const record = (kind, message) => {
    if (events.length < 100)
      events.push({ kind, message: String(message).slice(0, 1000) });
    else dropped++;
  };
  const finding = (kind, message) => {
    if (report.findings.length < 100)
      report.findings.push({ kind, message: String(message).slice(0, 1000) });
  };
  let policyBlocked = false;
  const block = (message) => {
    policyBlocked = true;
    record("policy", message);
    finding("policy", message);
  };
  const observe = async () => {
    const snapshot = (
      await page.locator("body").ariaSnapshot({ timeout: actionTimeout })
    ).slice(0, 12000);
    const entry = { url: page.url(), snapshot, step: report.steps.length };
    observations.push(entry);
    return structuredClone(entry);
  };
  const capture = async (name) => {
    await page.screenshot({
      path: path.join(directory, name),
      timeout: actionTimeout,
    });
    return name;
  };
  try {
    browser = await chromium.launch({ headless: true, timeout: 10000 });
    context = await browser.newContext({
      viewport,
      serviceWorkers: "block",
      acceptDownloads: false,
      permissions: [],
    });
    context.setDefaultTimeout(actionTimeout);
    context.setDefaultNavigationTimeout(actionTimeout);
    timer = setTimeout(() => {
      expired = true;
      decisionController?.abort();
      void context.close().catch(() => {});
    }, deadlineMs);
    await context.routeWebSocket("**/*", (socket) => {
      block("WebSocket connections are not allowed");
      socket.close();
    });
    await context.route("**/*", async (route) => {
      try {
        const request = route.request(),
          url = new URL(request.url());
        if (
          url.origin !== origin ||
          !["GET", "HEAD"].includes(request.method())
        ) {
          block(
            "Denied request: " +
              request.method() +
              " " +
              url.origin +
              url.pathname,
          );
          return await route.abort("blockedbyclient");
        }
        // Fetch without following redirects; the proxy cannot reach a redirected origin.
        const response = await route.fetch({
          maxRedirects: 0,
          timeout: actionTimeout,
        });
        if (
          response.status() >= 300 &&
          response.status() < 400 &&
          response.headers().location
        ) {
          block("Redirects require a separate scenario: " + url.pathname);
          return await route.abort("blockedbyclient");
        }
        await route.fulfill({ response });
      } catch (error) {
        record("transport", error.message);
        try {
          await route.abort("failed");
        } catch {}
      }
    });
    await context.tracing.start({
      screenshots: true,
      snapshots: true,
      sources: false,
    });
    page = await context.newPage();
    context.on("page", (extra) => {
      block("Popups are not allowed");
      void extra.close().catch(() => {});
    });
    page.on("dialog", (dialog) => {
      block("Dialogs require explicit support");
      void dialog.dismiss().catch(() => {});
    });
    page.on("download", (download) => {
      block("Downloads are not allowed");
      void download.cancel().catch(() => {});
    });
    page.on("console", (message) => {
      if (message.type() === "error") record("console", message.text());
    });
    page.on("pageerror", (error) => record("pageerror", error.message));
    page.on("response", (response) => {
      if (response.status() >= 400)
        record(
          "http",
          response.status() + " " + new URL(response.url()).pathname,
        );
    });
    page.on("requestfailed", (request) =>
      record("requestfailed", request.failure()?.errorText || "Request failed"),
    );
    await page.goto(report.startURL, { waitUntil: "domcontentloaded" });
    let done = false;
    while (!done && !policyBlocked) {
      const observation = await observe();
      let timeout;
      decisionController = new AbortController();
      const action = await Promise.race([
        planner.next(observation, { signal: decisionController.signal }),
        new Promise((_, reject) => {
          timeout = setTimeout(() => {
            decisionController.abort();
            reject(new Error("Planner deadline exceeded"));
          }, plannerTimeout);
        }),
      ]).finally(() => clearTimeout(timeout));
      if (action === null) {
        done = true;
        break;
      }
      validateAction(action);
      if (report.steps.length >= maxActions)
        throw new Error("Action budget exhausted");
      const step = {
        index: report.steps.length + 1,
        action: structuredClone(action),
        outcome: "running",
      };
      report.steps.push(step);
      try {
        const target = locator(page, action.target);
        if (action.type === "click") await target.click();
        else await target.fill(action.value);
        step.outcome = "completed";
      } catch (error) {
        step.outcome = "failed";
        throw error;
      } finally {
        try {
          step.screenshot = await capture("step-" + step.index + ".png");
        } catch {}
      }
    }
    if (done && !policyBlocked) {
      for (const contract of scenario.checks) {
        let actual,
          passed = false;
        try {
          if (contract.type === "layout") {
            actual = await page.evaluate(() => ({
              width: window.innerWidth,
              scrollWidth: document.documentElement.scrollWidth,
            }));
            passed = actual.scrollWidth <= actual.width;
          } else {
            const target = locator(page, contract.target);
            // Checks poll to accommodate asynchronous rendering within a bounded interval.
            const until = performance.now() + actionTimeout;
            do {
              if (contract.type === "visible") {
                actual = await target.isVisible();
                passed = actual;
              } else {
                actual = await target.textContent({ timeout: actionTimeout });
                passed = actual?.trim() === contract.expected;
              }
              if (!passed)
                await new Promise((resolve) => setTimeout(resolve, 40));
            } while (!passed && performance.now() < until);
          }
        } catch (error) {
          actual = { error: error.message.slice(0, 1000) };
          passed = false;
        }
        report.checks.push({ contract, actual, passed });
        if (!passed)
          finding(
            "assertion",
            "Expected " +
              JSON.stringify(contract) +
              "; observed " +
              JSON.stringify(actual),
          );
      }
      await observe();
      report.status = report.checks.every((check) => check.passed)
        ? "passed"
        : "failed";
    }
  } catch (error) {
    finding(
      error instanceof PolicyError ? "policy" : "execution",
      error.message,
    );
    report.status =
      error instanceof PolicyError
        ? "blocked"
        : report.steps.some((step) => step.outcome === "failed")
          ? "failed"
          : "incomplete";
  } finally {
    clearTimeout(timer);
    decisionController?.abort();
    if (page && !page.isClosed()) {
      try {
        await capture("final.png");
        report.finalScreenshot = true;
      } catch (error) {
        finding("evidence", error.message);
        if (report.status === "passed") report.status = "incomplete";
      }
    }
    if (context) {
      try {
        await context.tracing.stop({ path: path.join(directory, "trace.zip") });
        report.trace = true;
      } catch (error) {
        finding("evidence", "Trace unavailable");
        if (report.status === "passed") report.status = "incomplete";
      }
      await context.close().catch(() => {});
    }
    await browser?.close().catch(() => {});
    for (const event of events.filter((e) =>
      ["console", "pageerror", "http", "requestfailed", "transport"].includes(
        e.kind,
      ),
    ))
      finding(event.kind, event.message);
    if (policyBlocked) report.status = "blocked";
    else if (expired) {
      report.status = "incomplete";
      finding("deadline", "Run deadline exceeded");
    } else if (dropped) {
      report.status = "incomplete";
      finding("event-budget", "Event capture exceeded 100 entries");
    } else if (events.length && report.status === "passed")
      report.status = "failed";
    if (!report.checks.length && report.status === "passed")
      report.status = "incomplete";
    report.elapsedMs = Math.round(performance.now() - started);
    report.droppedEvents = dropped;
    await writeFile(
      path.join(directory, "events.json"),
      JSON.stringify(events, null, 2),
    );
    await writeFile(
      path.join(directory, "observations.json"),
      JSON.stringify(observations, null, 2),
    );
    await saveReport(directory, report);
  }
  return { directory, report };
}
