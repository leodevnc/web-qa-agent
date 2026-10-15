import { test } from "node:test";
import assert from "node:assert/strict";
import {
  OpenAIPlanner,
  decodeProposal,
  actionSchema,
} from "../src/openai-planner.mjs";

const done = {
  type: "done",
  role: null,
  name: null,
  testId: null,
  value: null,
};
const click = {
  type: "click",
  role: "button",
  name: "Add to cart",
  testId: null,
  value: null,
};
const envelope = (proposal) => ({
  status: "completed",
  output: [
    {
      type: "message",
      content: [{ type: "output_text", text: JSON.stringify(proposal) }],
    },
  ],
});
const response = (data) => new Response(JSON.stringify(data));
const create = (fetchImpl) =>
  new OpenAIPlanner({
    apiKey: "test-key-not-real",
    model: "test-model",
    goal: "Add two items",
    allowNetwork: true,
    fetchImpl,
  });

test("model requests require explicit opt-in", () => {
  assert.throws(() => new OpenAIPlanner({}), /MODEL_NETWORK_DISABLED/);
});
test("placeholder values are rejected without calling any provider", () => {
  assert.throws(
    () =>
      new OpenAIPlanner({
        allowNetwork: true,
        apiKey: "YOUR_API_KEY_HERE",
        model: "YOUR_MODEL_ID",
      }),
    /LLM_NOT_CONFIGURED/,
  );
});
test("structured response request uses the fixed endpoint and bounded action schema", async () => {
  let captured;
  const planner = create(async (url, options) => {
    captured = { url, options };
    return response(envelope(click));
  });
  const action = await planner.next({
    snapshot: "button Add to cart",
    url: "http://127.0.0.1:8000/",
  });
  assert.deepEqual(action, {
    type: "click",
    target: { role: "button", name: "Add to cart" },
  });
  assert.equal(captured.url, "https://api.openai.com/v1/responses");
  assert.equal(captured.options.redirect, "error");
  const body = JSON.parse(captured.options.body);
  assert.equal(body.store, false);
  assert.equal(body.text.format.strict, true);
  assert.deepEqual(body.text.format.schema, actionSchema);
  assert.match(body.instructions, /untrusted/);
  assert.ok(!JSON.stringify(planner).includes("test-key-not-real"));
});
test("done maps to termination, not a verdict", () =>
  assert.equal(decodeProposal(done), null));
test("fill supports a single test ID locator", () => {
  assert.deepEqual(
    decodeProposal({
      type: "fill",
      role: null,
      name: null,
      testId: "quantity",
      value: "2",
    }),
    { type: "fill", target: { testId: "quantity" }, value: "2" },
  );
});
test("arbitrary code and verdict fields cannot become executable actions", () => {
  for (const proposal of [
    { ...click, type: "evaluate" },
    { ...done, verdict: "pass" },
    { ...click, value: "extra" },
    { ...done, testId: "cart" },
    { ...click, testId: "cart" },
    { ...click, role: "unknown" },
  ])
    assert.throws(() => decodeProposal(proposal));
});
test("provider error bodies are not included in reports", async () => {
  const planner = create(
    async () => new Response("private provider diagnostic", { status: 401 }),
  );
  await assert.rejects(
    planner.next({}),
    (error) => error.message === "MODEL_HTTP_ERROR: status 401",
  );
});
test("transport errors are sanitized", async () => {
  await assert.rejects(
    create(async () => {
      throw Error("secret diagnostic");
    }).next({}),
    (error) =>
      error.message === "MODEL_TRANSPORT_ERROR: request failed or timed out",
  );
});
test("incomplete generation never becomes a proposal", async () => {
  await assert.rejects(
    create(async () => response({ status: "incomplete" })).next({}),
    /MODEL_INCOMPLETE/,
  );
});
test("refusal is surfaced without copying refusal content", async () => {
  await assert.rejects(
    create(async () =>
      response({
        status: "completed",
        output: [
          {
            type: "message",
            content: [{ type: "refusal", refusal: "private refusal" }],
          },
        ],
      }),
    ).next({}),
    (error) => error.message === "MODEL_REFUSAL: no proposal",
  );
});
test("invalid JSON and malformed envelopes fail closed", async () => {
  for (const data of [
    null,
    { status: "completed", output: {} },
    { status: "completed", output: [{ type: "message", content: 7 }] },
    { status: "completed", output: [] },
    envelope({ ...done, extra: true }),
  ]) {
    await assert.rejects(create(async () => response(data)).next({}));
  }
  await assert.rejects(
    create(async () => new Response("not JSON")).next({}),
    /MODEL_RESPONSE_ERROR/,
  );
});
test("large model responses are rejected", async () => {
  await assert.rejects(
    create(async () => new Response("x".repeat(1048577))).next({}),
    /oversized/,
  );
});
test("abort signal reaches the transport", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    create(async (url, options) => {
      assert.equal(options.signal.aborted, true);
      throw Error("aborted");
    }).next({}, { signal: controller.signal }),
    /MODEL_TRANSPORT_ERROR/,
  );
});
test("planner carries at most four recent proposals", async () => {
  let input;
  const planner = create(async (url, options) => {
    input = JSON.parse(JSON.parse(options.body).input);
    return response(envelope(click));
  });
  for (let i = 0; i < 6; i++) await planner.next({});
  assert.equal(planner.history.length, 4);
  assert.equal(input.recentProposals.length, 4);
});
