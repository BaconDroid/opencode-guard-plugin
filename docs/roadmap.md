# Roadmap

Planned work, in blocks. Each block is independently shippable; entries inside a
block are ordered. Status is `now`, `next` or `later`. Finished work leaves this
file.

The Rust guard binaries own their own roadmaps (`comment-checker/docs/roadmap.md`,
`test-checker/docs/roadmap.md`). This file covers the plugin only.

## Block A - Guard surface

| # | Item | Status |
|:-:|:-----|:------|

## Block B - Analyzers

| # | Item | Status |
|:-:|:-----|:------|
| B2 | `test_guard.test_command` is detected and reported but never executed; executing it turns the guard into a runner, which conflicts with the advisory-only constraint. Keep reporting unless the product stance changes. | later |

| B3 | The opt-in LLM judges were removed in favour of the current session model; no model call remains in the guard. | done |

## Block C - Packaging

| # | Item | Status |
|:-:|:-----|:------|
| C1 | The binary cache directory keeps the pre-rename `opencode-comments-plugin` name so existing caches are not orphaned; rename when a migration step exists. | later |
