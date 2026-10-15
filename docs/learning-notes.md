# Learning notes

## A green page is not necessarily a passing flow

The broken cart renders normally and accepts clicks. Only the exact count assertion exposes that the handler ignores the entered quantity. Console and HTTP checks add signals, but they cannot replace behavior assertions.

## A completed plan is not a correct result

The mock adapter can return done before interacting with the page. The independent cart assertion then fails. This small example makes the ownership of the success criterion visible.

## Redirect handling needs its own test

The request guard uses a fetch with redirect following disabled. The test supplies a second loopback server as a trap and verifies that the redirected request never reaches it. Checking a URL at the start of a request chain is not enough evidence about the whole chain.

## Evidence has its own bugs

An HTML report initially overflowed a narrow viewport when its title contained a long unbroken string. The report now wraps text and constrains table layout. A browser test verifies both safe text rendering and mobile width. A QA tool's reports need QA too.

## Boundaries reduce both risk and usefulness

Blocking writes and external resources makes the initial demo predictable but excludes common workflows. This constraint is documented instead of quietly loosening the policy when a page fails.

## What remains uncertain

The injected-page test uses scripted actions. It demonstrates that page text does not change that deterministic planner, not that a language model resists prompt injection. The adapter tests validate transport, decoding and host checks with mock responses only. Real model planning quality has not been measured.

Screenshots and traces provide evidence, but the observation window can miss delayed faults and weak assertions can miss real bugs. No test here establishes that an arbitrary web app is correct.
