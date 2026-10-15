import { writeFile } from "node:fs/promises";
import path from "node:path";

export const escapeHTML = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (ch) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[ch],
  );

export async function saveReport(directory, report) {
  const e = escapeHTML;
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
  const steps = report.steps
    .map(
      (step) =>
        `<tr><td>${step.index}</td><td><code>${e(JSON.stringify(step.action))}</code></td><td>${e(step.outcome)}</td><td>${step.screenshot ? `<a href="${e(step.screenshot)}">Screenshot</a>` : "Unavailable"}</td></tr>`,
    )
    .join("");
  const findings = report.findings
    .map(
      (f) => `<li><strong>${e(f.kind)}</strong><pre>${e(f.message)}</pre></li>`,
    )
    .join("");
  const checks = report.checks
    .map(
      (c) =>
        `<li><span class="${c.passed ? "passed" : "failed"}">${c.passed ? "PASS" : "FAIL"}</span> ${e(JSON.stringify(c.contract))}<pre>${e(JSON.stringify(c.actual))}</pre></li>`,
    )
    .join("");
  await writeFile(
    path.join(directory, "report.html"),
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src 'self'">
<title>Web QA · ${e(report.name)}</title><style>
*{box-sizing:border-box}body{overflow-wrap:anywhere}table{table-layout:fixed}ul{padding-left:20px}
th:nth-child(1){width:6%}th:nth-child(2){width:54%}th:nth-child(3){width:18%}th:nth-child(4){width:22%}
body{font:16px/1.6 system-ui,sans-serif;background:#f4f6f9;color:#18283b;margin:0}main{max-width:1080px;margin:auto;padding:36px 24px}h1{font-size:36px;line-height:1.2}.tag{padding:6px 14px;border-radius:6px;background:#e3e8ef;font-weight:bold}.passed{color:#166534}.failed{color:#b42318}.blocked,.incomplete,.error{color:#92400e}section{background:white;border:1px solid #dbe2ea;border-radius:12px;padding:24px;margin:20px 0}table{width:100%;border-collapse:collapse}td,th{text-align:left;border-bottom:1px solid #eee;padding:12px;vertical-align:top}pre,code{white-space:pre-wrap;overflow-wrap:anywhere}a{color:#175cd3}img{max-width:100%;border:1px solid #ddd}.meta{color:#506176}li{margin:14px 0}@media(max-width:600px){main{padding:16px}section{padding:16px}table{font-size:12px}td{padding:5px}}
</style><main><p class="meta">WEB QA AGENT / LOCAL EVIDENCE</p><h1>${e(report.name)}</h1>
<p><span class="tag ${e(report.status)}">${e(report.status.toUpperCase())}</span> · ${e(report.viewport.width)} × ${e(report.viewport.height)}</p>
<p>${e(report.goal)}</p><p class="meta">Planner: ${e(report.planner)}. ${e(plannerNotice)}</p>
<section><h2>Checks</h2><ul>${checks || "<li>No checks completed. This run cannot pass.</li>"}</ul></section>
<section><h2>Findings</h2><ul>${findings || "<li>No findings within this scenario and observation window.</li>"}</ul></section>
<section><h2>Reproduction steps</h2><p>Start: ${e(report.startURL)}</p><table><thead><tr><th>#</th><th>Action</th><th>Outcome</th><th>Evidence</th></tr></thead><tbody>${steps}</tbody></table></section>
<section><h2>Evidence bundle</h2><p><a href="report.json">Structured report</a> · <a href="events.json">Browser events</a> · <a href="observations.json">Accessibility observations</a>${report.trace ? ' · <a href="trace.zip">Playwright trace</a>' : ""}</p>${report.finalScreenshot ? '<img src="final.png" alt="Final browser state">' : "<p>Final screenshot unavailable.</p>"}</section>
<p class="meta">A local, bounded check, not a security audit or proof that the entire app is correct. Artifacts can contain page data; inspect before sharing.</p></main></html>`,
  );
}
