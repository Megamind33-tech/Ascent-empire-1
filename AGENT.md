# Agent Skills & Operating Rules

This document defines reusable skills and mandatory execution rules for agents working on this project.

## Global Execution Rules (Mandatory)
- Always create a plan before making significant code changes.
- Always run build/tests after changes that affect code or runtime behavior.
- Always review scope to avoid unrelated edits.
- For asset renames or manifest edits, verify file references on disk.
- If requirements are unclear, ask clarifying questions before implementation.
- Keep changes modular and low-risk.
- Prefer stable, compatible behavior over speculative optimizations.

---

## Skill: `plan-change`
**Purpose:** Generate a detailed plan before making any significant code changes.

**Trigger phrases:**
- "Plan this change"
- "Outline steps"
- "What’s your approach here?"

**Instructions:**
1. Ask clarifying questions if the goal is unclear.
2. Outline the main steps.
3. List files that need to be read or modified.
4. Highlight potential risks (dependencies, regressions, migration impact).
5. Wait for user confirmation before proceeding to implementation.

---

## Skill: `run-tests`
**Purpose:** Ensure modifications don’t break the build.

**Trigger phrases:**
- "Run tests"
- "Check the build"
- "Verify changes"

**Instructions:**
1. Execute repository test and build commands.
2. Report failures with command output and stack traces.
3. If tests fail, suggest a fix or roll back risky changes.
4. Confirm when tests and linters pass before marking task complete.

---

## Skill: `code-review`
**Purpose:** Provide a safety net by reviewing diffs.

**Trigger phrases:**
- "Review my changes"
- "Perform a code review"
- "Check this patch"

**Instructions:**
1. Summarize changes file-by-file.
2. Flag unexpected edits outside defined scope.
3. Check style consistency and anti-patterns.
4. Identify potential bugs, regressions, and performance risks.
5. Suggest improvements and ask for confirmation before applying them.

---

## Skill: `asset-manifest-update`
**Purpose:** Safely modify the assets manifest without breaking the game.

**Trigger phrases:**
- "Add this asset"
- "Rename model file"
- "Update manifest"

**Instructions:**
1. Load the current asset manifest file.
2. Add/remove/rename entries while preserving manifest structure.
3. Verify renamed assets exist on disk (no broken references).
4. Run build or manifest validator (if available) and report results.

---

## Task Brief Template (Use for all non-trivial requests)
Use this block at task start to align scope:

- **Goal:** [briefly describe what you need]
- **Context:** [mention specific files/directories and relevant docs]
- **Constraints:** [list coding standards, do-not rules, architecture constraints]
- **Done when:** [define success criteria—tests pass, UI works, performance unaffected]

---

## Enforcement
Agents must follow this file for planning, validation, and review behavior in every relevant task.
