# Vibe coding with engineering ownership

[English](ai-assisted-development.md) | [Deutsch](../de/ki-gestuetzte-entwicklung.md)

Status: Project development statement

Date: 2026-09-02

**C4thedral was vibe-coded.** Substantial parts of the project were developed
dialogically with AI coding agents: goals, constraints, and observations were
expressed in natural language; agents inspected the repository, proposed or
implemented changes, ran checks, and refined the result through feedback.

That statement is not an apology and not a claim that expertise became
unnecessary. It describes a development method in which experienced human
engineering direction and AI implementation capacity reinforce each other.

## What we mean by vibe coding

The term is used in two different ways. In its strictest form it can mean
accepting generated code while paying little attention to its implementation.
In its broader professional form it means conversational, AI-assisted
development in which a person still reviews, tests, understands, and owns the
result. [Google Cloud explicitly distinguishes these two
forms](https://cloud.google.com/discover/what-is-vibe-coding), and
[GitHub describes the workflow](https://github.com/resources/articles/what-is-vibe-coding)
as an iterative loop of prompting, shaping, testing, and review.

C4thedral uses the second meaning. We deliberately reject the idea that code
can be accepted merely because it looks plausible, runs once, or was produced
quickly. Conversation accelerates implementation; it does not replace software
engineering.

## Why we use it

For an experienced developer or architect, this way of working provides
concrete advantages:

- **More attention for architecture and intent.** Natural language carries the
  desired behavior, boundaries, and trade-offs while the agent handles much of
  the mechanical implementation. GitHub and
  [SAP](https://www.sap.com/resources/what-is-vibe-coding) both identify the
  shift from repetition and syntax toward logic, architecture, and user needs.
- **Faster executable feedback.** Ideas can become running candidates early,
  so an expert can judge actual behavior instead of discussing an abstract
  possibility for too long.
- **Cheaper exploration.** Several approaches, adapter boundaries, or interface
  variants can be tried and rejected before one is accepted. C4thedral's former
  technical spikes are an example: their useful results moved into production
  packages; the disposable implementations were removed.
- **Less repetitive work.** Scaffolding, straightforward transformations,
  test cases, documentation links, and broad but mechanical refactorings can be
  performed quickly and then reviewed as a coherent change.
- **Fewer disruptive context switches.** The agent can inspect code,
  specifications, test failures, and related documentation in one continuous
  loop, leaving the human focused on the problem and the decision.
- **Safer large-scale refactoring when evidence already exists.** A strong test
  suite gives fast feedback while packages, names, and boundaries are changed.
  The tests do not prove quality on their own, but they make broad changes much
  more observable.

The result is leverage: one experienced person can direct and examine a larger
implementation surface without pretending that generated output is already a
finished product.

## Expertise is the prerequisite

Vibe coding multiplies the judgment applied to it. It can multiply poor
judgment just as efficiently as good judgment.

The person directing production work must be able to:

- define architecture, invariants, acceptance criteria, and safe boundaries;
- recognize solutions that merely look convincing;
- read, debug, refactor, and reject generated code;
- understand the domain and the chosen technology stack;
- judge security, dependency, licensing, and maintenance consequences; and
- know when automated evidence is insufficient and a native or visual check is
  required.

Red Hat's discussion of
[vibe coding and specification-driven development](https://developers.redhat.com/articles/2026/02/17/uncomfortable-truth-about-vibe-coding)
makes the central limitation explicit: generating code and building
sustainable software are different tasks, and detailed specifications still
require technical understanding. SAP likewise warns that plausible output can
fail in real environments without business context, controls, and review.

A beginner can use vibe coding to learn or prototype. A production project
still needs someone who is technically qualified to own every accepted result.

## How C4thedral keeps ownership human

C4thedral's process is designed around that ownership:

1. `docs/engineering/specification.md` defines product behavior and
   architectural boundaries outside the conversation.
2. `docs/engineering/testing.md` defines the evidence required for a claim.
3. Source, not a chat transcript or hidden agent state, remains authoritative.
4. Compiler core, adapters, desktop privileges, and rendering are separated by
   explicit contracts.
5. Changes are inspected as diffs and validated by build, type checking, tests,
   public-source hygiene, dependency controls, and specialized architecture,
   worker, editor, and desktop gates.
6. Rendering changes require visual inspection; native packaging and security-
   relevant behavior require target-platform evidence.
7. Dependencies are accepted by capability, license, runtime impact, offline
   behavior, replacement boundary, and protecting tests—not by novelty.
8. Implementation, automated validation, visual or native validation, commit,
   and publication are reported as separate states.

An agent may implement a large part of a change, but it cannot lower these
requirements. Passing tests is necessary evidence, not a substitute for
understanding the architecture or reviewing the result.

## What AI is particularly good at accelerating here

Within those guardrails, AI assistance has been especially useful for:

- turning detailed architecture contracts into small portable interfaces;
- implementing repetitive adapters and test matrices;
- keeping CLI, worker, and desktop behavior aligned;
- tracing a change through code, tests, packaging checks, and documentation;
- producing alternatives quickly enough that weak approaches can be discarded;
  and
- maintaining English and German public documentation with automated parity
  and link checks.

These advantages arise because the project already has explicit boundaries and
because the person directing the work can evaluate the output. The same prompts
without that knowledge would not provide the same assurance.

## What this statement does not claim

- AI output is not correct merely because it compiles.
- Automated tests cannot cover every usability, security, packaging, or
  architectural failure.
- Human accountability, review, and maintenance ownership are not delegated to
  a model.
- Fast implementation is not evidence of production readiness.
- Vibe coding is not appropriate for an unchecked change to security-critical,
  financial, safety, privacy, or compliance-sensitive behavior.

The claim is narrower and stronger: conversational AI can be a powerful
engineering multiplier when an experienced person controls the architecture,
understands the result, and insists on explicit evidence.

## Further reading

- [Google Cloud: What is vibe coding?](https://cloud.google.com/discover/what-is-vibe-coding)
- [GitHub: What is vibe coding?](https://github.com/resources/articles/what-is-vibe-coding)
- [SAP: What is vibe coding?](https://www.sap.com/resources/what-is-vibe-coding)
- [Red Hat Developer: The uncomfortable truth about vibe coding](https://developers.redhat.com/articles/2026/02/17/uncomfortable-truth-about-vibe-coding)

