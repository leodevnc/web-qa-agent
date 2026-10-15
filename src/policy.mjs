export class PolicyError extends Error {}

const roles = new Set([
  "button",
  "link",
  "textbox",
  "spinbutton",
  "checkbox",
  "heading",
  "status",
]);
function object(value, fields) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !fields.includes(key)) ||
    fields.some((key) => !(key in value))
  )
    throw new PolicyError("Unexpected or missing fields");
}
function text(value, max = 200) {
  if (typeof value !== "string" || !value.length || value.length > max)
    throw new PolicyError("Invalid text field");
}
export function targetOrigin(value) {
  if (
    typeof value !== "string" ||
    !/^http:\/\/127\.0\.0\.1(?::[0-9]+)?\/?$/.test(value)
  ) {
    throw new PolicyError("Only a literal loopback HTTP origin is allowed");
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new PolicyError("Invalid target URL");
  }
  if (
    url.protocol !== "http:" ||
    url.hostname !== "127.0.0.1" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new PolicyError(
      "Target must be an http://127.0.0.1:PORT origin without credentials or path",
    );
  }
  return url.origin;
}
export function scopedURL(origin, path) {
  text(path, 300);
  const url = new URL(path, origin);
  if (
    url.origin !== origin ||
    url.username ||
    url.password ||
    url.protocol !== "http:"
  ) {
    throw new PolicyError("Navigation leaves the authorized origin");
  }
  return url.href;
}
export function validateLocator(locator) {
  if (locator?.testId !== undefined) {
    object(locator, ["testId"]);
    text(locator.testId);
  } else {
    object(locator, ["role", "name"]);
    text(locator.name);
    if (!roles.has(locator.role))
      throw new PolicyError("Unsupported locator role");
  }
  return locator;
}
export function validateAction(action) {
  if (action?.type === "click") object(action, ["type", "target"]);
  else if (action?.type === "fill") {
    object(action, ["type", "target", "value"]);
    text(action.value, 500);
  } else throw new PolicyError("Only click and fill actions are available");
  validateLocator(action.target);
  return action;
}
export function validateScenario(scenario, origin) {
  object(scenario, ["name", "goal", "path", "steps", "checks"]);
  text(scenario.name, 100);
  text(scenario.goal, 1000);
  scopedURL(origin, scenario.path);
  if (!Array.isArray(scenario.steps) || scenario.steps.length > 20)
    throw new PolicyError("At most 20 actions");
  scenario.steps.forEach(validateAction);
  if (
    !Array.isArray(scenario.checks) ||
    scenario.checks.length < 1 ||
    scenario.checks.length > 10
  ) {
    throw new PolicyError("Require 1-10 independent checks");
  }
  for (const check of scenario.checks) {
    if (check.type === "text") {
      object(check, ["type", "target", "expected"]);
      text(check.expected, 1000);
      validateLocator(check.target);
    } else if (check.type === "visible") {
      object(check, ["type", "target"]);
      validateLocator(check.target);
    } else if (check.type === "layout") object(check, ["type"]);
    else throw new PolicyError("Unsupported check");
  }
  return structuredClone(scenario);
}
export function locator(page, target) {
  return target.testId
    ? page.getByTestId(target.testId)
    : page.getByRole(target.role, { name: target.name, exact: true });
}
