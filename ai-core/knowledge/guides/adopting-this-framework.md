# Adopting the ai-sdlc Framework

This guide walks you through getting the framework running in your project. It takes about 10 minutes for a new project and 20-40 minutes for an existing codebase (most of that is review time, not setup).

---

## What you're adopting

Three Claude Code skills that work together:

- **`/onboard`** — Generates `CLAUDE.md` and a `docs/` structure for your project. Run this once at the start.
- **`/aisdlc-context-architect`** — Helps you make architectural decisions and writes ADRs. Run this any time you're deciding between technical approaches.
- **`/<builder-xxx>`** — Implements features while enforcing established patterns. The `implement/` skill is a **template** — you copy and rename it once per builder role on your team (e.g. `backend-builder`, `frontend-builder`, `mobile-builder`).

The skills grow your `docs/` directory over time. Each `/aisdlc-context-architect` call adds an ADR. Each builder call can add to `docs/patterns/`. After a few months, Claude has enough context to be genuinely useful without you re-explaining everything.

---

## Step 1: Extract the starter zip

Download and extract `ai-sdlc-starter.zip` into your project root. This gives you the skills, `ai-core/` structure, and a `CLAUDE.md` template in one step.

```bash
curl -L https://github.com/org/ai-sdlc/releases/latest/download/ai-sdlc-starter.zip \
     -o ai-sdlc-starter.zip
unzip ai-sdlc-starter.zip -d .
rm ai-sdlc-starter.zip
```

The zip contains:
- `.claude/skills/` — all five lifecycle skills (onboard, architect, planner, implement, reviewer)
- `ai-core/` — knowledge templates, memory buffers, hooks, and the metrics framework
- `CLAUDE.md` — root template with `[CUSTOMIZE]` markers

**Then set up your builder roles.** The `implement/` skill is a template — copy it once per developer role on your team and rename each copy:

```bash
cp -r .claude/skills/implement .claude/skills/backend-builder
cp -r .claude/skills/implement .claude/skills/frontend-builder
# Add more roles as needed: devops-builder, ios-builder, data-builder, ...
```

Update the `name` and `description` at the top of each copy's `SKILL.md`. The `implement/SKILL.md` contains ready-made description examples for common roles.

You now own all of these files — they're yours to modify. Record the zip version in your `CLAUDE.md` so you know which release you adopted.

---

## Step 2: Run `/onboard`

Open Claude Code in your project directory and type `/onboard`.

**If you have an existing codebase**: Claude will read your code and generate:
- `CLAUDE.md` — project context file
- `docs/aisdlc-context-architecture/overview.md` — system topology
- `docs/aisdlc-context-architecture/adr/ADR-0001-existing-decisions.md` — decisions already baked in
- `docs/components/[name].md` — one doc per major component
- `docs/patterns/coding-patterns.md` — shared patterns extracted from real code
- `docs/aisdlc-context-architecture/adr/README.md` — ADR index

Review the output. Look for `[VERIFY]` markers — those are places where Claude wasn't sure and needs your confirmation. Fix them before committing.

**If you're starting a new project**: Claude will ask you a few questions and generate a minimal skeleton. The docs will fill in as you use `/aisdlc-context-architect` and the builder skills.

---

## Step 3: Create role-specific pattern files (optional but recommended)

For each builder role, you can create a role-specific pattern file that the builder skill loads in addition to the shared `docs/patterns/coding-patterns.md`:

```
docs/patterns/
├── coding-patterns.md       ← shared: applies to all builder roles
├── backend-patterns.md      ← loaded by backend-builder
├── frontend-patterns.md     ← loaded by frontend-builder
└── mobile-patterns.md       ← loaded by mobile-builder
```

These files grow naturally as each role uses their builder skill. `/onboard` populates the shared `coding-patterns.md` from real code; role-specific files are added the first time a builder skill introduces a role-specific pattern.

---

## Step 4: Commit the docs

```bash
git add CLAUDE.md ai-core/ .claude/skills/
git commit -m "Add ai-sdlc framework vX.Y.Z: CLAUDE.md, ai-core/, skills/"
```

Now your team has shared context. When anyone opens Claude Code in this repo, it reads `CLAUDE.md` first. Each developer uses the builder skill for their role.

---

## Step 5: Use the skills

**Before an architectural decision**: `/aisdlc-context-architect` — frames the decision, evaluates options, writes the ADR.

**When a backend developer builds a feature**: `/backend-builder` — loads shared + backend patterns, states a plan, implements consistently.

**When a frontend developer builds a feature**: `/frontend-builder` — loads shared + frontend patterns, states a plan, implements consistently.

**When revisiting the context**: re-run `/onboard` if the codebase has significantly changed and the docs are stale.

---

## What to expect over time

**Week 1-2**: `/onboard` gives you a foundation. `CLAUDE.md` is accurate. Patterns docs may be thin.

**Month 1-3**: You've run `/aisdlc-context-architect` a few times. 5-10 ADRs exist. Builder skills can genuinely enforce patterns now — both shared and role-specific.

**Month 3+**: The docs are a living record. New team members read `CLAUDE.md` + the ADR index to orient themselves. Each builder role has its own pattern library. Claude is a consistent collaborator across every part of the stack.

---

## Customizing the skills

The skills are yours — copy them, modify them. Common customizations:

- **Add domain constraints to `/aisdlc-context-architect`**: If your team has compliance requirements (PCI-DSS, HIPAA, SOC2), add a note in the skill to check those constraints when evaluating options.
- **Add stack-specific defaults to a builder skill**: If your `frontend-builder` always uses a specific component library pattern, bake that into the skill rather than relying on the pattern doc alone.
- **Fork a builder per domain in a monorepo**: The payments team might want `payments-backend-builder` with PCI-DSS awareness; the platform team might want `platform-builder` with internal SDK usage rules.

---

## Monorepo / multi-service setup

See `docs/guides/scaling-guide.md` for the full picture. The short version:

1. Root `CLAUDE.md` covers the whole repo: global stack, team conventions, navigation.
2. Each service/domain gets its own `CLAUDE.md` (only what differs from root).
3. Each service gets its own `docs/` with its own ADRs and patterns.
4. Builder skills are usually shared at the root. Domains with specific compliance or stack needs can fork their own builder variants.

---

## FAQ

**How many builder roles do I need?**
Start with one (`backend-builder` if you're server-side, `frontend-builder` if you're UI-focused). Add roles as your team grows. A solo developer can use a single `builder` skill — the role names are for team differentiation.

**Do I need all three skills?**
No. Start with `/onboard`. Add `/aisdlc-context-architect` when you start making significant decisions. Add builder skills when patterns are established enough to enforce. They're independent.

**What if my project already has some docs?**
Point `/onboard` at the existing docs first. Claude will incorporate them rather than replacing them. Review the output for conflicts.

**What if the generated docs are wrong?**
Fix them. The docs are just markdown files — edit them directly. The skills use whatever is in the files, so keeping them accurate is on you.

**How do I update to a new version of the framework?**
Download the new `ai-sdlc-starter.zip`, extract it to a temp directory, and diff it against your installed files. Apply improvements selectively — you don't want to overwrite your role-specific customizations or accumulated ADRs.
