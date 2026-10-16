import { writeFile } from "node:fs/promises";
import path from "node:path";
import { escapeHTML as e, badge, pageShell } from "./ui.mjs";
export { escapeHTML } from "./ui.mjs";

const describeTarget = (target) =>
  target?.testId
    ? `Test ID: ${target.testId}`
    : `${target?.role}: ${target?.name}`;
const valueText = (value) =>
  typeof value === "string" ? value : JSON.stringify(value, null, 2);

export async function saveReport(directory, report) {
  const plannerNotice =
    report.planner === "openai-responses"
      ? "Model-proposed actions; independent host checks determine the verdict."
      : report.planner === "scripted"
        ? "Scripted actions; no model called."
        : "Unconfigured planner; no model called.";
  await writeFile(
    path.join(directory, "report.json"),
    JSON.stringify(report, null, 2),
  );
  const checks = report.checks
    .map((c) => {
      const title =
        c.contract.type === "layout"
          ? "Viewport fit"
          : c.contract.type === "text"
            ? "Text matches expectation"
            : "Element is visible";
      const expected =
        c.contract.type === "layout"
          ? "Document fits the viewport"
          : c.contract.type === "visible"
            ? "Visible"
            : c.contract.expected;
      return `<article class="panel"><div class="row"><div><h3>${title}</h3><p class="muted" style="font-size:12px">${c.contract.type === "layout" ? "Horizontal overflow check" : e(describeTarget(c.contract.target))}</p></div>${badge(c.passed ? "passed" : "failed")}</div>
<dl class="comparison"><div><dt>Expected</dt><dd>${e(expected)}</dd></div><div><dt>Observed</dt><dd class="mono">${e(valueText(c.actual))}</dd></div></dl>
<details><summary>Check contract</summary><pre>${e(JSON.stringify(c.contract, null, 2))}</pre></details></article>`;
    })
    .join("");
  const findings = report.findings
    .map(
      (f) =>
        `<article class="panel"><h3>${e(f.kind)}</h3><pre>${e(f.message)}</pre></article>`,
    )
    .join("");
  const steps = report.steps
    .map(
      (
        step,
      ) => `<li class="step"><span class="step-number">${step.index}</span><div class="step-body"><div class="row"><h3>${e(step.action.type === "fill" ? "Fill" : "Click")} · ${e(describeTarget(step.action.target))}</h3><span class="badge neutral">${e(step.outcome)}</span></div>${step.action.type === "fill" ? `<p>Value: <code>${e(step.action.value)}</code></p>` : ""}
<details><summary>Action details</summary><pre>${e(JSON.stringify(step.action, null, 2))}</pre></details>${step.screenshot ? `<a href="${e(step.screenshot)}">View step screenshot ↗</a>` : "<p>Screenshot unavailable.</p>"}</div></li>`,
    )
    .join("");
  await writeFile(
    path.join(directory, "report.html"),
    pageShell({
      title: report.name,
      section: "Run report",
      nav: [
        ["overview", "Overview"],
        ["checks", "Checks"],
        ["findings", "Findings"],
        ["steps", "Reproduction"],
        ["evidence", "Evidence"],
      ],
      body: `<header class="hero" id="overview"><p class="eyebrow">Run report</p><div class="hero-line"><h1>${e(report.name)}</h1>${badge(report.status)}</div><p class="lead">${e(report.goal)}</p><div class="notice"><strong>Planner: ${e(report.planner)}.</strong> ${e(plannerNotice)}</div></header>
<dl class="stats"><div class="stat"><dt>Checks passed</dt><dd>${report.checks.filter((c) => c.passed).length} / ${report.checks.length}</dd></div><div class="stat"><dt>Actions</dt><dd>${report.steps.length}</dd></div><div class="stat"><dt>Viewport</dt><dd style="font-size:20px">${e(report.viewport.width)} × ${e(report.viewport.height)}</dd></div></dl>
<section class="section" id="checks"><div class="section-head"><h2>Checks</h2><p>Independent host assertions</p></div><div class="stack">${checks || '<p class="empty">No checks completed. This run cannot pass.</p>'}</div></section>
<section class="section" id="findings"><div class="section-head"><h2>Findings</h2><p>${report.findings.length} recorded</p></div><div class="stack">${findings || '<p class="empty">No findings within this scenario and observation window.</p>'}</div></section>
<section class="section" id="steps"><div class="section-head"><h2>Reproduction steps</h2></div><p class="muted mono" style="margin-bottom:24px">Start: ${e(report.startURL)}</p><ol class="step-list">${steps || '<li class="empty">No browser actions executed.</li>'}</ol></section>
<section class="section" id="evidence"><div class="section-head"><h2>Evidence bundle</h2><p>Inspect the source</p></div><div class="artifact-links"><a class="button" href="report.json">Report JSON ↗</a><a class="button" href="scenario.json">Scenario ↗</a><a class="button" href="events.json">Browser events ↗</a><a class="button" href="observations.json">Observations ↗</a>${report.trace ? '<a class="button" href="trace.zip">Playwright trace ↗</a>' : ""}</div>
${report.finalScreenshot ? '<figure><img src="final.png" alt="Final browser state"><figcaption>Final frame captured from the browser run.</figcaption></figure>' : '<p class="empty">Final screenshot unavailable.</p>'}</section>
<footer class="footer">A local, bounded check, not a security audit or proof that the entire app is correct. Artifacts can contain page data; inspect before sharing.</footer>`,
    }),
  );
}
