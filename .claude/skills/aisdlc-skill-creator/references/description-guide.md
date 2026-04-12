# Description Guide

The `description` field in SKILL.md frontmatter is the **sole mechanism** that determines whether Claude invokes a skill. A weak description causes undertriggering — the skill exists but never fires. This is the most common failure mode when teams author their own skills.

---

## What a good description includes

| Element | Why it matters |
|---|---|
| **What it produces** | Not just the topic — the actual output (files written, analysis delivered, docs updated) |
| **Specific contexts** | Named situations, not abstract categories ("creating a migration" not "database work") |
| **Trigger phrases** | 3–5 literal phrases a developer would actually type |
| **Domain signals** | File types, tool names, workflow stages that narrow the trigger space |

---

## Anti-patterns

| Weak — undertriggers | Strong — fires reliably |
|---|---|
| "Use when working with databases" | "Use when creating, applying, or rolling back database migrations" |
| "Helps with API design" | "Use when designing a new endpoint, defining a request/response schema, or reviewing a contract for breaking changes" |
| "For release management" | "Use when preparing a release, writing release notes, bumping a version, or tagging a commit" |
| "Code review helper" | "Review a pull request or diff for adherence to this project's patterns, ADRs, and conventions" |

---

## Recommended structure

```
<One sentence: what the skill does and what it produces.>
Use when: <context 1>, <context 2>, <context 3>.
Trigger phrases: "<phrase 1>", "<phrase 2>", "<phrase 3>", "<phrase 4>".
<Optional: domain-specific signals — tool names, file types, workflow stages.>
```

## Example (complete)

```
Generate a database migration for this project following the established migration patterns in ai-core/knowledge/patterns/coding-patterns.md. Use when creating schema changes, adding or removing columns, renaming tables, or writing rollback logic. Trigger phrases: "create a migration", "add a column to", "schema change for", "I need to migrate", "write a migration that". Works with the ORM and migration tool conventions already in use in this project.
```

---

## Be slightly pushy

Claude tends to undertrigger skills — to skip invoking them when they would be useful. To counter this:

- List **more** contexts than you think are needed. If the skill is useful in 5 scenarios, list all 5.
- Include both the canonical phrasing ("create a migration") and informal variations ("I need to change the schema").
- Name the domain explicitly even if it feels obvious ("database migrations" not just "migrations").

---

## Trigger coverage check

After writing the description, verify:

1. Would a developer who doesn't know this skill exists trigger it? → If no, add more trigger phrases.
2. Does a developer typing "[task] in [domain]" hit this skill? → If no, add the domain as a signal.
3. Is there overlap with another skill's description that could cause confusion? → If yes, narrow with a differentiating phrase.
