# Skill Template

Use this as the base when generating a new skill in Step 5 of aisdlc-skill-creator. Fill every section. Remove all guidance comments before writing the final file.

---

```yaml
---
name: <skill-name>
# Kebab-case. Must match the directory name exactly.
# e.g. db-migration-helper, api-contract-checker, release-notes-writer
description: >
  <What this skill does and what it produces — one sentence.>
  Use when: <3–5 specific contexts where it applies>.
  Trigger phrases: "<phrase 1>", "<phrase 2>", "<phrase 3>", "<phrase 4>".
  <Optional: domain-specific signals — file types, tool names, workflow stages.>
  # See references/description-guide.md before writing this field.
---
```

# \<Skill Name\>

\<One paragraph: what this skill does and why it exists. Not what it is — what problem it solves and where it fits in the team's workflow.\>

---

## Step 1: Load context

Read these files before starting:

- `CLAUDE.md` — project conventions, load order, key facts
- `ai-core/knowledge/patterns/coding-patterns.md` — patterns to follow
- \[Add any relevant `ai-core/knowledge/components/<name>.md` for domain-specific skills\]

---

## Step 2: \<Action name\>

\<Instructions for this step. Be specific: what Claude reads, what it decides, what it produces. Include any user confirmation gates before irreversible actions.\>

---

## Step 3: \<Action name\>

\<Instructions for this step.\>

\[Add steps as needed. Most skills need 3–6 steps. Fewer is better — if a step is trivial, merge it into an adjacent one.\]

---

## Final step — always do this last

```bash
bash ai-core/hooks/log-run.sh "<skill-name>" "<one-line summary of what was done>" "success|error|partial"
```

---

## Reference files

\[List each file in references/ and when to load it. Remove this section entirely if references/ is empty.\]

- `references/<file>.md` — \[when and why to read it\]
