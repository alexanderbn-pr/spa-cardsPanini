# Skill Registry

**Delegator use only.** Any agent that launches sub-agents reads this registry to resolve compact rules, then injects them directly into sub-agent prompts. Sub-agents do NOT read this registry or individual SKILL.md files.

See `_shared/skill-resolver.md` for the full resolution protocol.

**Generated**: 2026-10-07 (sdd-init, refreshed) · **Project**: spa-cardspanini (scaffolded — React 19 + TS + Vite + Tailwind v4 + shadcn/ui; Zustand/Supabase planned per task.md)

## User Skills

| Trigger                                                                              | Skill                       | Path                                                                    |
| ------------------------------------------------------------------------------------ | --------------------------- | ----------------------------------------------------------------------- |
| Writing React 19 components/hooks (.tsx), React Compiler rules, refs as props        | react-19                    | ~/.config/opencode/skills/react/react-19/SKILL.md                       |
| Client-side state with Zustand (stores, selectors, persist, slices)                  | zustand-5                   | ~/.config/opencode/skills/react/zustand/SKILL.md                        |
| React performance: components, data fetching, bundle optimization, refactoring       | vercel-react-best-practices | ~/.config/opencode/skills/react/react-avanced/SKILL.md                  |
| Compound components, boolean prop proliferation, reusable APIs, React 19 API changes | vercel-composition-patterns | ~/.config/opencode/skills/react/composition-patterns/SKILL.md           |
| Creating/refactoring typed React forms (Zod + React Hook Form / useActionState)      | react-form                  | ~/.config/opencode/skills/react/react-form/SKILL.md                     |
| Fetching/managing server state with TanStack Query                                   | react-query                 | ~/.config/opencode/skills/react/react-query/SKILL.md                    |
| Typed data tables: sorting, filtering, pagination, selection, CSV export             | react-table                 | ~/.config/opencode/skills/react/react-table/SKILL.md                    |
| Improving SEO: meta tags, structured data, sitemap                                   | react-seo-structure         | ~/.config/opencode/skills/react/react-seo-structure/SKILL.md            |
| Writing tests, mocking, coverage, fixtures (Vitest 3.x)                              | vitest                      | ~/.config/opencode/skills/testing/vitest/SKILL.md                       |
| Styling React/Vue/Svelte components, responsive layouts, design systems              | tailwind-css-patterns       | ~/.config/opencode/skills/css/tailwind-css-patterns/SKILL.md            |
| SCSS architecture, nesting, mixins (only if project uses Sass)                       | scss                        | ~/.config/opencode/skills/css/scss/SKILL.md                             |
| Building distinctive, production-grade UI (avoid generic AI aesthetics)              | frontend-design             | ~/.config/opencode/skills/design/frontend-design/SKILL.md               |
| Write actions / unique reads in Figma file context via use_figma tool                | figma-use                   | ~/.config/opencode/skills/design/figma-use/SKILL.md                     |
| Generics, conditional/mapped/template-literal types, type-safe utilities             | typescript-advanced-types   | ~/.config/opencode/skills/typescript/typescript-advanced-types/SKILL.md |
| Zod schema validation: safeParse, z.infer, error handling                            | zod                         | ~/.config/opencode/skills/typescript/zod/SKILL.md                       |
| Next.js file conventions, RSC boundaries, data fetching                              | next-best-practices         | ~/.config/opencode/skills/next/next-best-practices/SKILL.md             |
| Next.js 16 Cache Components: PPR, use cache, cacheLife                               | next-cache-components       | ~/.config/opencode/skills/next/next-cache-components/SKILL.md           |
| Upgrading Next.js versions with codemods                                             | next-upgrade                | ~/.config/opencode/skills/next/next-upgrade/SKILL.md                    |
| Vue 3 components (SFC, script setup)                                                 | vue                         | ~/.config/opencode/skills/vue/vue/SKILL.md                              |
| Vue Composition API + TypeScript standard approach                                   | vue-best-practices          | ~/.config/opencode/skills/vue/vue-best-practices/SKILL.md               |
| Vue 3 runtime error/hydration debugging                                              | vue-debug-guides            | ~/.config/opencode/skills/vue/vue-debug-guides/SKILL.md                 |
| Vue forms (v-model, validation)                                                      | vue-form                    | ~/.config/opencode/skills/vue/vue-form/SKILL.md                         |
| Pinia stores and state management                                                    | vue-pinia-best-practices    | ~/.config/opencode/skills/vue/vue-pinia-best-practices/SKILL.md         |
| Vue vs React comparison                                                              | vue-react                   | ~/.config/opencode/skills/vue/vue-react/SKILL.md                        |
| Vue Router 4 guards and route patterns                                               | vue-router-best-practices   | ~/.config/opencode/skills/vue/vue-router-best-practices/SKILL.md        |
| Vue tables (sorting, filtering, rendering)                                           | vue-table                   | ~/.config/opencode/skills/vue/vue-table/SKILL.md                        |
| VueUse composables (useStorage, useMouse, refDebounced…)                             | vueuse                      | ~/.config/opencode/skills/vue/vueuse/SKILL.md                           |
| Go tests, Bubbletea TUI testing (teatest)                                            | go-testing                  | ~/.config/opencode/skills/testing/go-testing/SKILL.md                   |
| Flutter/Dart mocking with Mockito                                                    | mockito                     | ~/.config/opencode/skills/testing/mockito/SKILL.md                      |
| Java naming/immutability/streams/exceptions standards                                | java-coding-standards       | ~/.config/opencode/skills/java/java-coding-standards/SKILL.md           |
| JavaDoc documentation rules for Java types                                           | java-docs                   | ~/.config/opencode/skills/java/java-docs/SKILL.md                       |
| JUnit 5 unit testing incl. data-driven tests                                         | java-junit                  | ~/.config/opencode/skills/java/java-junit/SKILL.md                      |
| Spring Boot application development best practices                                   | java-springboot             | ~/.config/opencode/skills/java/java-springboot/SKILL.md                 |
| JPA/Hibernate entity & query patterns                                                | jpa-patterns                | ~/.config/opencode/skills/java/jpa-patterns/SKILL.md                    |
| Logstash integration workflows                                                       | logstash                    | ~/.config/opencode/skills/java/logstash/SKILL.md                        |
| MapStruct DTO mapping (@Mapper, @Mapping, @MappingTarget)                            | mapstruct                   | ~/.config/opencode/skills/java/mapstruct/SKILL.md                       |
| Creating a pull request (issue-first enforcement)                                    | branch-pr                   | ~/.config/opencode/skills/tools/branch-pr/SKILL.md                      |
| Creating GitHub issues for bugs/features (issue-first)                               | issue-creation              | ~/.config/opencode/skills/tools/issue-creation/SKILL.md                 |
| Dual blind adversarial review ("judgment day")                                       | judgment-day                | ~/.config/opencode/skills/tools/judgment-day/SKILL.md                   |
| Creating new AI agent skills (Agent Skills spec)                                     | skill-creator               | ~/.config/opencode/skills/skill-creator/SKILL.md                        |
| Discovering/installing agent skills ("find a skill for X")                           | find-skills                 | ~/.agents/skills/find-skills/SKILL.md                                   |

## Compact Rules

Pre-digested rules per skill. Delegators copy matching blocks into sub-agent prompts as `## Project Standards (auto-resolved)`.

### react-19

- NO manual memoization — React Compiler handles useMemo/useCallback optimization automatically
- Named imports only: `import { useState } from "react"` — never `import React from "react"`
- ref is a regular prop — no forwardRef anywhere
- `use()` for reading promises/context; `useActionState`/`useOptimistic` for form mutations
- `"use client"` directive only for state/hooks/event handlers/browser APIs (Next.js context)

### zustand-5

- Always select specific fields; use `useShallow` for multiple fields — NEVER subscribe to the whole store
- `persist` middleware for localStorage; `immer` middleware for nested updates
- Slices pattern for multi-domain stores; `getState()`/`subscribe()` when outside React
- Async actions set `loading`/`error` in the store; type every store with an interface

### vercel-react-best-practices

- Kill waterfalls: `Promise.all()` for independent fetches, cheap sync conditions before any `await`
- Avoid barrel imports; dynamic-import heavy components; defer third-party scripts
- Deduplicate global event listeners; use passive listeners; don't subscribe to state used only in callbacks
- Hoist default non-primitive props; extract expensive work into memoized components

### vercel-composition-patterns

- NEVER add boolean props to customize behavior — use composition or explicit variant components
- Compound components share context; the provider is the only place that knows state mechanics
- Prefer `children` over renderX props; React 19: no `forwardRef`, use `use()` instead of `useContext()`

### react-form

- Decision tree: <5 fixed fields → Zod schema + `useZodForm` (or `useActionState` if server actions exist)
- Golden rule: if a form pattern repeats >2 times, make it reusable from the FIRST form
- Flow: Zod schema → hook/action → component → usage; add persistence/optimistic update only if needed

### react-query

- `useQuery`/`useMutation`; Query Key Factory (hierarchical keys) for cache consistency
- Handle loading/error states; `AbortSignal` cancellation; tune `staleTime`/`gcTime`
- Optimistic updates + cache invalidation; prefetch on hover/focus; skeleton fallback + error boundary

### react-table

- Generic typed table: sorting, filtering, pagination, row selection, CSV export
- Custom cell renderers; keep the hook generic and reusable across the app

### react-seo-structure

- Meta tags, structured data, sitemap optimization — only when user asks about SEO
- SPA context: limited impact; prioritize meta/OG tags if applied here

### vitest

- Vite-native, Jest-compatible; put `test` config inside `vite.config.ts` (shares transformers/plugins)
- `vi` for mocks/spies/fake timers; coverage via `--coverage` (V8 or Istanbul)
- Use `jsdom`/`happy-dom` environment for DOM/component tests; deep refs under `references/`

### tailwind-css-patterns

- Mobile-first: base styles, then `sm:/md:/lg:` prefixes for larger screens
- Use design tokens (spacing/color/type scales); compose utilities; extract repeated patterns to classes
- Tailwind v4: CSS-first config via `@theme`; verify every change at each breakpoint (a11y too)

### scss

- Only if the project adopts Sass — nesting, mixins, architecture rules
- This project uses Tailwind by default; do not introduce SCSS without a decision

### frontend-design

- Commit to a BOLD aesthetic direction before coding (purpose, tone, differentiation)
- NEVER generic AI aesthetics: no Inter/Roboto/Arial defaults, no purple-gradient-on-white clichés
- Distinctive fonts, cohesive color via CSS variables, atmospheric backgrounds, intentional motion

### figma-use

- MUST load this skill BEFORE any `use_figma` tool call — never call use_figma bare
- Required for node creation/edit, variables, components, auto-layout, programmatic inspection

### typescript-advanced-types

- Prefer generics with constraints over `any`; use `extends` for bounded polymorphism
- Conditional/mapped/template-literal types for reusable type utilities; utility types over duplication
- Enable strict mode; build type-safe API clients and state shapes

### zod

- `safeParse()` for user input; never trust `JSON.parse`; validate at system boundaries
- `z.infer` for types — never hand-duplicate schema types; export both schemas and types
- `z.unknown()` over `z.any()`; enums for fixed values; `flatten()` for form error display

### mockito

- Flutter/Dart mocking only (mocks, stubbing, verification) — NOT applicable unless Dart tests exist

### go-testing

- Go/teatest patterns only — NOT applicable to this project

### next-best-practices / next-cache-components / next-upgrade

- Next.js-specific (RSC, file conventions, PPR, codemods) — NOT applicable: this project is a Vite SPA. Use only if the stack migrates to Next.js.

### vue / vue-best-practices / vue-debug-guides / vue-form / vue-pinia-best-practices / vue-react / vue-router-best-practices / vue-table / vueuse

- Vue 3 ecosystem (Composition API, Pinia, Router, VueUse) — NOT applicable: this project is React. `vue-react` is only for comparison discussions.

### java-coding-standards / java-docs / java-junit / java-springboot / jpa-patterns / logstash / mapstruct

- Java/Spring ecosystem — NOT applicable to this frontend project.

### branch-pr

- PR creation workflow with issue-first enforcement — every PR must reference an existing issue
- Use when creating/preparing a pull request for review

### issue-creation

- GitHub issue creation for bugs/features following issue-first enforcement
- Use when reporting a bug or requesting a feature before any code change

### judgment-day

- Parallel adversarial review: two blind judges, synthesis, fixes, re-judge (max 2 iterations)
- Trigger: "judgment day", "dual review", "review adversarial"

### skill-creator

- Create new agent skills following the Agent Skills spec (frontmatter, triggers, structure)
- Trigger: user asks to create a skill/agent instructions

### find-skills

- Discover and install agent skills ("is there a skill that can…")
- Trigger: user looks for new capability via skills

## Project Conventions

| File     | Path                                                    | Notes                                                                                         |
| -------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| task.md  | /Users/lmbe/Documents/Proyectos/spa-cardsPanini/task.md | Requirements source (untracked in git). Stack, screens, filters, DoD. NOT a convention index. |
| _(none)_ | —                                                       | No AGENTS.md / CLAUDE.md / .cursorrules / GEMINI.md / copilot-instructions.md at project root |

Global agent rules live at `~/.config/opencode/AGENTS.md` (conventional commits, no AI attribution in commits, never build after changes, verify claims with evidence).

Read the convention files listed above for project-specific patterns and rules.
