/** The default is an honest scripted adapter, not model inference. */
export class ScriptedPlanner {
  name = "scripted";
  constructor(steps) {
    this.steps = structuredClone(steps);
    this.index = 0;
  }
  async next(_observation) {
    return this.index < this.steps.length
      ? structuredClone(this.steps[this.index++])
      : null;
  }
}

/**
 * Placeholder only. No SDK, key lookup, HTTP call or silent scripted fallback.
 * A future adapter may propose actions from observations; the host still validates
 * actions and runs the scenario's independent checks. Observations are untrusted.
 */
export class LlmPlanner {
  name = "llm-placeholder";
  async next() {
    throw new Error(
      "LLM_NOT_CONFIGURED: this adapter is intentionally a placeholder",
    );
  }
}
