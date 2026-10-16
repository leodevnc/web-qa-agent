export const escapeHTML = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        ch
      ],
  );

export const themeCSS = `
:root{color-scheme:light;--ink:#202020;--muted:#656565;--line:#e7e7e5;--surface:#f7f7f5}
*{box-sizing:border-box}html{scroll-padding-top:24px}body{margin:0;color:var(--ink);background:white;font:15px/1.6 ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow-wrap:anywhere}
a{color:inherit;text-underline-offset:4px}a:hover{text-decoration:underline}a:focus-visible,button:focus-visible,input:focus-visible,summary:focus-visible{outline:2px solid var(--ink);outline-offset:4px;border-radius:4px}
h1,h2,h3,p{margin:0}h1{font-size:clamp(30px,4vw,44px);line-height:1.15;font-weight:550;letter-spacing:-1.5px}h2{font-size:21px;letter-spacing:-.5px;font-weight:550}h3{font-size:16px;font-weight:600}
.muted{color:var(--muted)}.eyebrow{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}.lead{font-size:17px;color:var(--muted);max-width:660px;margin-top:18px}
.layout{display:grid;grid-template-columns:220px minmax(0,1fr);min-height:100vh}.sidebar{background:var(--surface);border-right:1px solid var(--line);padding:30px 20px;display:flex;flex-direction:column;gap:40px}.brand{display:flex;gap:10px;align-items:center;font-weight:600;text-decoration:none}.mark{background:var(--ink);color:white;border-radius:9px;width:32px;height:32px;display:grid;place-items:center;font-size:12px}.sidebar nav{display:grid;gap:6px}.sidebar nav a{padding:9px 12px;border-radius:8px;text-decoration:none;color:#555;font-size:14px}.sidebar nav a:hover{background:#eaeae7;color:var(--ink)}.side-note{margin-top:auto;font-size:12px;color:var(--muted);padding:12px}
main{width:100%;max-width:1140px;margin:0 auto;padding:34px 56px 48px;min-width:0}.topbar{display:flex;justify-content:space-between;gap:16px;padding-bottom:32px;font-size:13px;color:var(--muted)}.hero{padding:30px 0 38px}.hero .eyebrow{margin-bottom:16px}.hero-line{display:flex;align-items:center;gap:20px;justify-content:space-between}.notice{border:1px solid var(--line);background:var(--surface);padding:16px 20px;border-radius:12px;font-size:13px;margin-top:24px}
.badge{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line);border-radius:999px;padding:4px 10px;font-size:12px;font-weight:550;white-space:nowrap}.badge:before{content:"";height:5px;width:5px;border-radius:50%;background:currentColor}.passed{color:#246047;background:#f2f8f4;border-color:#dbe9df}.failed{color:#a23d35;background:#fcf4f3;border-color:#efdcd9}.blocked,.incomplete{color:#805519;background:#fcf8ef;border-color:#eadfc8}.neutral{color:#555;background:var(--surface)}
.stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border:1px solid var(--line);border-radius:14px;margin:0 0 38px;overflow:hidden}.stat{padding:22px 24px}.stat+.stat{border-left:1px solid var(--line)}.stat dt{font-size:12px;color:var(--muted);margin-bottom:8px}.stat dd{margin:0;font-size:25px;letter-spacing:-.7px;line-height:1.3}
.section{padding:30px 0;border-top:1px solid var(--line)}.section-head{display:flex;justify-content:space-between;gap:14px;margin-bottom:22px}.section-head p{font-size:13px;color:var(--muted)}.stack{display:grid;gap:12px}.panel{border:1px solid var(--line);border-radius:12px;padding:22px;min-width:0}.row{display:flex;align-items:center;justify-content:space-between;gap:16px}.row>*{min-width:0}.comparison{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:18px 0 0}.comparison dt{font-size:12px;color:var(--muted);margin-bottom:5px}.comparison dd{margin:0;font-size:14px}.mono,pre,code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:12px}pre{margin:12px 0 0;white-space:pre-wrap;overflow-wrap:anywhere;background:var(--surface);padding:14px;border-radius:8px}details{margin-top:16px}summary{cursor:pointer;font-size:12px;color:var(--muted);width:fit-content;min-height:28px;padding:4px 0}.empty{padding:24px;border:1px dashed var(--line);border-radius:12px;color:var(--muted);font-size:14px}
.step-list{list-style:none;padding:0;margin:0;display:grid;gap:12px}.step{display:grid;grid-template-columns:32px minmax(0,1fr);gap:16px}.step-number{border:1px solid var(--line);border-radius:50%;height:28px;width:28px;text-align:center;line-height:26px;font-size:12px;color:var(--muted)}.step-body{border-bottom:1px solid var(--line);padding-bottom:20px}.step:last-child .step-body{border-bottom:0}.step-body p{font-size:13px;color:var(--muted);margin-top:6px}.step-body a{font-size:13px}.artifact-links{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:22px}.button{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:9px 15px;border:1px solid var(--line);border-radius:9px;background:white;font-size:13px;text-decoration:none}.button:hover{background:var(--surface);text-decoration:none}.button.primary{background:var(--ink);border-color:var(--ink);color:white}.button.primary:hover{background:#3c3c3c}figure{margin:0}figure img{width:100%;height:auto;border:1px solid var(--line);border-radius:12px;display:block}figcaption{font-size:12px;color:var(--muted);margin-top:10px}.footer{padding-top:28px;border-top:1px solid var(--line);font-size:12px;color:var(--muted)}
.run-row{display:grid;grid-template-columns:32px minmax(0,1fr) auto;gap:18px;align-items:center;padding:23px 0;border-top:1px solid var(--line)}.run-row:first-child{border-top:0}.run-number{font-size:12px;color:var(--muted)}.run-name{font-size:15px;font-weight:550;text-decoration:none}.run-meta{font-size:12px;color:var(--muted);margin-top:6px}.run-result{display:flex;gap:16px;align-items:center}.run-arrow{text-decoration:none;display:grid;place-items:center;width:36px;height:36px;border-radius:50%;background:var(--surface)}
@media(max-width:1000px){.layout{grid-template-columns:180px minmax(0,1fr)}main{padding:28px 30px}.sidebar{padding:28px 14px}.hero-line{align-items:flex-start;flex-direction:column;gap:16px}}
@media(max-width:700px){.layout{display:block}.sidebar{border-right:0;border-bottom:1px solid var(--line);padding:18px 20px;gap:16px}.sidebar nav{display:flex;flex-wrap:wrap;gap:4px}.sidebar nav a{padding:6px 10px}.side-note{display:none}main{padding:22px 20px 32px}.topbar{padding-bottom:10px}.hero{padding:24px 0}.stats{margin-bottom:24px}.stat{padding:16px 12px}.stat dd{font-size:20px}.stat dt{font-size:11px}.panel{padding:18px}.comparison{gap:12px}.section{padding:24px 0}.section-head p{max-width:120px;text-align:right}.run-row{grid-template-columns:22px minmax(0,1fr);gap:12px}.run-result{grid-column:2;justify-content:space-between}.row{align-items:flex-start}.step .row{flex-wrap:wrap}.lead{font-size:15px}h1{letter-spacing:-1px}}
@media print{.sidebar,.topbar,.skip{display:none}.layout{display:block}main{max-width:none;padding:0}.panel,.step{break-inside:avoid}}
.skip{position:absolute;left:16px;top:-100px;background:var(--ink);color:white;padding:10px;z-index:1}.skip:focus{top:12px}
`;

export function badge(status) {
  const kind = ["passed", "failed", "blocked", "incomplete"].includes(status)
    ? status
    : "neutral";
  return `<span class="badge ${kind}">${escapeHTML(status)}</span>`;
}
export function pageShell({ title, section, nav, body }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src 'self'">
<title>${escapeHTML(title)} · Web QA Agent</title><style>${themeCSS}</style></head><body>
<a class="skip" href="#main">Skip to content</a><div class="layout">
<aside class="sidebar"><a class="brand" href="#main"><span class="mark" aria-hidden="true">qa</span>Web QA Agent</a>
<nav aria-label="Page sections">${nav.map(([id, label]) => `<a href="#${id}">${label}</a>`).join("")}</nav>
<p class="side-note">Local execution.<br>Inspectable evidence.<br><br>No model call in scripted mode.</p></aside>
<main id="main" tabindex="-1"><div class="topbar"><span>Workspace / ${escapeHTML(section)}</span><span>Local evidence</span></div>${body}</main></div></body></html>`;
}
export function renderSuite(results, matched) {
  const passed = results.filter((r) => r.status === "passed").length;
  return pageShell({
    title: "Run overview",
    section: "Demo",
    nav: [
      ["overview", "Overview"],
      ["runs", "Scenario runs"],
      ["artifacts", "Artifacts"],
    ],
    body: `<header class="hero" id="overview"><p class="eyebrow">Browser quality, made inspectable</p><div class="hero-line"><h1>A clearer view of<br>what works.</h1><a class="button primary" href="#runs">Explore results <span aria-hidden="true">&nbsp;↗</span></a></div>
<p class="lead">From browser actions to concrete evidence. Review each scenario, understand the failure, and follow the steps.</p>
<div class="notice"><strong>LLM: placeholder.</strong> Scripted actions; no model called. These runs use a disposable synthetic app.</div></header>
<dl class="stats"><div class="stat"><dt>Scenarios</dt><dd>${results.length}</dd></div><div class="stat"><dt>Passed QA</dt><dd>${passed}</dd></div><div class="stat"><dt>Failed QA</dt><dd>${results.filter((r) => r.status === "failed").length}</dd></div></dl>
<section class="section" id="runs"><div class="section-head"><h2>Scenario runs</h2><p>${matched ? "Expected outcomes matched" : "Unexpected outcomes found"}</p></div>
${results.length ? results.map((r, i) => `<article class="run-row"><span class="run-number">${String(i + 1).padStart(2, "0")}</span><div><a class="run-name" href="${escapeHTML(r.report)}">${escapeHTML(r.name)}</a><p class="run-meta">Fixture expectation: ${escapeHTML(r.expected)}</p></div><div class="run-result">${badge(r.status)}<a class="run-arrow" href="${escapeHTML(r.report)}" aria-label="Open ${escapeHTML(r.name)} report">↗</a></div></article>`).join("") : '<p class="empty">No scenario runs recorded.</p>'}</section>
<section class="section" id="artifacts"><div class="section-head"><h2>Behind every result</h2></div><p class="muted">Each report includes checks, reproducing actions, browser events, screenshots, and a trace when capture succeeds.</p><div class="artifact-links" style="margin-top:20px"><a class="button" href="summary.json">View suite JSON ↗</a></div></section>
<footer class="footer">A correctly detected fixture bug is still a failed QA run. Demo exit 0 means expected outcomes matched, not that all scenarios passed.</footer>`,
  });
}
