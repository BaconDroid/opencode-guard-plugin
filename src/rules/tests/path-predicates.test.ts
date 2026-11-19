import { test, expect } from "bun:test"
import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { detectLanguage, type Language } from "../../core/diff"
import pathPredicateData from "./path-predicates.json"
import {
  HARNESS_PATH_TABLE,
  PATH_PREDICATE_CONTRACT,
  SENSITIVE_HARNESS_PATH_TABLE,
  TEST_PATH_TABLE,
} from "./patterns"

const repoRoot = resolve(import.meta.dir, "../../..")
const scriptPath = join(repoRoot, "scripts", "generate-path-predicates.mjs")

test("the generated contract records its test-checker provenance", () => {
  expect(pathPredicateData.source).toBe("BaconDroid/test-checker")
  expect(pathPredicateData.ref).toMatch(/^[0-9a-f]{40}$/)
  expect(pathPredicateData.generated_from).toBe("src/language.rs")
  expect(PATH_PREDICATE_CONTRACT.source).toBe(pathPredicateData.source)
  expect(PATH_PREDICATE_CONTRACT.ref).toBe(pathPredicateData.ref)
})

test("the exported tables are read from the generated contract", () => {
  expect(TEST_PATH_TABLE.directorySegments).toEqual(pathPredicateData.test_path_segments)
  expect(TEST_PATH_TABLE.filenamePrefixes).toEqual(pathPredicateData.test_filename_prefixes)
  expect(TEST_PATH_TABLE.filenameInfixes).toEqual(pathPredicateData.test_filename_infixes)
  expect(HARNESS_PATH_TABLE.pathSubstrings).toEqual(pathPredicateData.harness_path_substrings)
  expect(HARNESS_PATH_TABLE.filenames).toEqual(pathPredicateData.harness_basenames)
  expect(HARNESS_PATH_TABLE.filenamePrefixes).toEqual(pathPredicateData.harness_filename_prefixes)
  expect(SENSITIVE_HARNESS_PATH_TABLE.pathSubstrings).toEqual(
    pathPredicateData.sensitive_harness_path_substrings,
  )
  expect(SENSITIVE_HARNESS_PATH_TABLE.filenames).toEqual(pathPredicateData.sensitive_harness_basenames)
  expect(SENSITIVE_HARNESS_PATH_TABLE.filenamePrefixes).toEqual(
    pathPredicateData.sensitive_harness_filename_prefixes,
  )
})

test("detectLanguage reproduces the hand-checked matrix the contract replaced", () => {
  // The oracle is the pre-contract LANGUAGE_BY_EXTENSION table (the TSLP_LANGUAGES coverage), so
  // a contract or alias change that reclassifies an extension fails here.
  const expected: ReadonlyArray<readonly [string, Language]> = [
    [".bash", "bash"], [".sh", "bash"], [".bats", "bash"], [".c", "c"], [".h", "c"],
    [".cpp", "cpp"], [".cxx", "cpp"], [".cc", "cpp"], [".hpp", "cpp"], [".hxx", "cpp"],
    [".cs", "csharp"], [".css", "css"], [".cue", "cue"], [".dart", "dart"],
    [".dockerfile", "dockerfile"], [".ex", "elixir"], [".exs", "elixir"], [".elm", "elm"],
    [".go", "go"], [".groovy", "groovy"], [".gradle", "groovy"], [".hs", "haskell"],
    [".hcl", "hcl"], [".html", "html"], [".htm", "html"], [".java", "java"], [".js", "js"],
    [".jsx", "js"], [".mjs", "js"], [".cjs", "js"], [".kt", "kotlin"], [".kts", "kotlin"],
    [".lua", "lua"], [".ml", "ocaml"], [".php", "php"], [".proto", "proto"], [".py", "python"],
    [".pyi", "python"], [".pyw", "python"], [".r", "r"], [".rb", "ruby"], [".rs", "rust"],
    [".scala", "scala"], [".sql", "sql"], [".svelte", "svelte"], [".swift", "swift"],
    [".toml", "toml"], [".ts", "ts"], [".tsx", "ts"], [".mts", "ts"], [".cts", "ts"],
    [".yaml", "yaml"], [".yml", "yaml"], [".zig", "zig"],
  ]
  expect(expected.length).toBe(54)
  for (const [extension, language] of expected) {
    expect(detectLanguage(`fixture${extension}`)).toBe(language)
  }
})

test("every extension the contract publishes resolves to a known language", () => {
  // A pack rename or a new language lands in the contract first; until LANGUAGE_BY_PACK_NAME
  // names it, detectLanguage would silently return "unknown" - fail here instead.
  const extensions = Object.keys(pathPredicateData.extension_languages)
  expect(extensions.length).toBe(54)
  for (const extension of extensions) {
    expect(detectLanguage(`fixture${extension}`)).not.toBe("unknown")
  }
})

test("every extension-scoped test-name rule resolves to a known language", () => {
  const extensions = pathPredicateData.extension_test_name_rules.flatMap(rule => rule.extensions)
  expect(extensions.length).toBeGreaterThan(0)
  for (const extension of extensions) {
    expect(detectLanguage(`fixture.${extension}`)).not.toBe("unknown")
  }
})

test("the generator --check detects a contract copied with a changed predicate", () => {
  const dir = mkdtempSync(join(tmpdir(), "path-predicates-check-"))
  try {
    mkdirSync(join(dir, "eval"), { recursive: true })
    const altered = { ...pathPredicateData, test_path_segments: [...pathPredicateData.test_path_segments, "e2e"] }
    delete (altered as { source?: string }).source
    delete (altered as { ref?: string }).ref
    writeFileSync(join(dir, "eval", "path-predicates.json"), `${JSON.stringify(altered, null, 2)}\n`)

    const git = (args: string[]) => spawnSync("git", args, { cwd: dir, encoding: "utf8" })
    expect(git(["init", "-q"]).status).toBe(0)
    expect(git(["add", "."]).status).toBe(0)
    expect(
      git(["-c", "user.email=test@example.com", "-c", "user.name=Test", "commit", "-qm", "fixture"]).status,
    ).toBe(0)

    const result = spawnSync("node", [scriptPath, "--check"], {
      cwd: repoRoot,
      env: { ...process.env, TC_REPO: dir },
      encoding: "utf8",
    })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain("path-predicate contract is stale")
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test("the generator --check passes when the predicates match and only the recorded ref differs", () => {
  const dir = mkdtempSync(join(tmpdir(), "path-predicates-ref-"))
  try {
    mkdirSync(join(dir, "eval"), { recursive: true })
    const fixture = { ...pathPredicateData, ref: "0".repeat(40) }
    writeFileSync(join(dir, "eval", "path-predicates.json"), `${JSON.stringify(fixture, null, 2)}\n`)

    const git = (args: string[]) => spawnSync("git", args, { cwd: dir, encoding: "utf8" })
    expect(git(["init", "-q"]).status).toBe(0)
    expect(git(["add", "."]).status).toBe(0)
    expect(
      git(["-c", "user.email=test@example.com", "-c", "user.name=Test", "commit", "-qm", "fixture"]).status,
    ).toBe(0)

    const result = spawnSync("node", [scriptPath, "--check"], {
      cwd: repoRoot,
      env: { ...process.env, TC_REPO: dir },
      encoding: "utf8",
    })
    expect(result.status).toBe(0)
    expect(result.stdout).toContain(`note: recorded ref ${pathPredicateData.ref}, sibling at `)
    expect(result.stdout).toContain("; content matches")
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
