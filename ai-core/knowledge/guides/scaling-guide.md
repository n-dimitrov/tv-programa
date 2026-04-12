# Scaling Guide

How the ai-sdlc framework scales from a solo developer to a large enterprise team.

---

## The Three Tiers

### Tier 1 — Solo Developer / New Project

**Characteristics**: 1 developer, new or very early project, patterns not established yet.

**Setup**:
- One `CLAUDE.md` at the root (use `templates/CLAUDE.md.new-project`)
- Minimal `docs/` skeleton (just the directories, mostly empty files)
- Run `/onboard` in new-project mode

**How skills behave**:
- `/aisdlc-context-architect`: Makes early structural decisions. Each decision creates an ADR. The context window is small — Claude reads the whole codebase.
- `/implement`: Patterns are emerging. Claude will look for the closest existing examples rather than refusing to proceed. Pattern doc is thin but grows with each `/implement` call.
- `/onboard`: Re-run it when the codebase has grown enough that the generated docs would be substantially different.

**What to expect**: Low friction. The docs grow organically as you work. Don't force documentation — let it emerge from actual decisions and patterns.

---

### Tier 2 — Small Team / Medium Codebase (3-12 months)

**Characteristics**: 2-8 developers, 3-12 months of development, patterns are established, multiple features in flight.

**Setup**:
- Root `CLAUDE.md` (updated from Tier 1 version — now with real patterns reference)
- `docs/` with 5-15 ADRs, pattern docs with real code examples, component docs for complex modules
- All three skills in active use

**How skills behave**:
- `/aisdlc-context-architect`: Context now includes real ADR history. Claude can see how previous decisions constrain current ones. Options evaluation references earlier decisions by name.
- `/implement`: Pattern docs are rich enough to genuinely enforce consistency. Claude should never invent a pattern — there's always a real example to follow.
- `/onboard`: Only re-run for new team members or after a major architectural shift.

**Discipline required**:
- Keep ADR index accurate — Claude reads it to know which ADRs to load
- Keep `docs/patterns/coding-patterns.md` current — stale examples lead to `/implement` enforcing outdated patterns
- Keep component docs updated when interfaces change

**Signs you're scaling to Tier 3**:
- Root `CLAUDE.md` is getting too long (>100 lines)
- One service/domain has substantially different patterns from others
- Teams are asking "what's the auth pattern for service X specifically?"

---

### Tier 3 — Enterprise / Large Codebase

**Characteristics**: Large monorepo or many services, multiple teams, domain-specific constraints, 10+ developers.

**Setup**:
```
monorepo/
├── CLAUDE.md                    # Root: global stack, team conventions, navigation guide
├── .claude/skills/              # Shared skills (can be forked per-domain)
├── docs/                        # Global ADRs and cross-team conventions
│   ├── architecture/
│   │   ├── overview.md          # High-level topology only
│   │   └── adr/                 # Global decisions (auth, logging format, error shapes, API versioning)
│   └── cross-team-conventions.md  # Shared boundaries: API auth, error shapes, logging
│
├── services/
│   ├── payments/
│   │   ├── CLAUDE.md            # Overrides root: PCI-DSS constraints, different DB pattern
│   │   └── docs/
│   │       ├── architecture/adr/   # Payments-specific ADRs
│   │       ├── components/         # Payments component docs
│   │       └── patterns/           # Payments-specific patterns
│   │
│   ├── analytics/
│   │   ├── CLAUDE.md            # Overrides root: data warehouse patterns, different read model
│   │   └── docs/
│   │       └── ...
│   │
│   └── user-data/
│       ├── CLAUDE.md            # Overrides root: GDPR constraints, data retention patterns
│       └── docs/
│           └── ...
```

**Root CLAUDE.md responsibilities** (and only these — don't duplicate subsystem content):
- What the overall system is (2-3 sentences)
- Global stack (shared language version, shared infra platform)
- Team map: which team owns which service/domain
- Navigation: "to work in X, read services/X/CLAUDE.md"
- Global constraints: security policy, compliance baseline, shared API conventions
- Cross-team conventions: how services communicate, what auth tokens look like, shared error format
- Key commands: global build/test/deploy commands

**Subsystem CLAUDE.md responsibilities** (only what differs from root):
- Domain-specific stack variations (a service using a different database, a different framework)
- Domain-specific constraints (PCI-DSS, HIPAA, specific compliance requirements)
- Domain-specific patterns that override or extend global patterns
- Local navigation: component docs for this service, local ADRs to read

**Skill customization at enterprise scale**:
- The payments team might maintain `payments-aisdlc-context-architect` — a copy of `/aisdlc-context-architect` with a step that checks PCI-DSS compliance checklist before recommending options
- A platform team might maintain `platform-implement` — a copy of `/implement` with extra checks for internal library usage and cross-service API versioning
- Keep customizations scoped — a skill that tries to know about every domain ends up knowing none well

**ADR governance**:
- Root `docs/aisdlc-context-architecture/adr/` for global decisions (shared auth pattern, logging format, API versioning policy)
- Service `docs/aisdlc-context-architecture/adr/` for local decisions (which caching strategy for this service, which ORM, etc.)
- The ADR index (`README.md`) in each location covers only its scope — Claude doesn't load global ADRs when working in a service unless they're relevant

---

## Cross-team conventions doc

At Tier 3, create `docs/cross-team-conventions.md`. This documents the seams between services — the things every service must agree on regardless of domain-specific choices:

```markdown
# Cross-team conventions

## Auth
All internal service calls include a `X-User-ID` header and `X-Roles` header set by the gateway.
Services must not accept these headers from external sources.
See ADR-0003 for the auth architecture.

## Error responses
All HTTP APIs return errors in this shape:
{
  "error": {
    "code": "SNAKE_CASE_ERROR_CODE",
    "message": "Human-readable description",
    "details": {} // optional
  }
}

## Logging
All services log in JSON to stdout. Required fields: timestamp, level, service, trace_id, message.
See docs/aisdlc-context-architecture/adr/ADR-0007-logging-format.md.

## API versioning
Services version via URL path (/v1/, /v2/). A service must support the previous major version
for at least 6 months after a new one is released.
```

This file gets referenced in the root `CLAUDE.md` documentation map and is loaded by skills when they encounter cross-service decisions.

---

## Common mistakes at scale

**Over-documenting at root**: Root `CLAUDE.md` should be a navigation guide, not a comprehensive reference. If it's growing beyond ~80 lines, extract content into subsystem files.

**Forgetting to update the ADR index**: Claude reads the index to decide which ADRs to load. A stale index means relevant decisions aren't considered.

**Duplicating content across subsystem files**: If the same fact appears in both root and subsystem `CLAUDE.md`, they'll diverge. Put it in root. Subsystems should only add, not repeat.

**Creating subsystem `CLAUDE.md` too eagerly**: Add a subsystem file only when there's genuinely different content. A subsystem that says the same things as root in different words adds noise, not value.

**Stale component docs**: Component docs that don't reflect the current interface mislead `/implement`. Better to have no component doc than a wrong one. Schedule a docs review when a component's interface changes significantly.
