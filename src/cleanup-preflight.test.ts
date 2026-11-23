import { test, expect } from "bun:test"
import { renderCleanup } from "./cleanup"

const generatedAt = "2026-01-01T00:00:00.000Z"

function unavailableReport(version?: string) {
  return {
    directory: "/repo",
    files: [],
    skipped: [],
    binaryAvailable: false,
    unsupported: true,
    stripPolicy: "balanced" as const,
    ...(version === undefined ? {} : { version }),
    generatedAt,
  }
}

function capableReport(reportedPolicy?: string, stripPolicy: "balanced" | "aggressive" = "balanced") {
  return {
    directory: "/repo",
    files: [
      {
        filePath: "/repo/a.test.ts",
        display: "a.test.ts",
        removed: [{ name: "same", rule: "duplicate-test" }],
        kept: [],
        summary: true,
        ...(reportedPolicy === undefined ? {} : { policy: reportedPolicy }),
      },
    ],
    skipped: [],
    binaryAvailable: true,
    unsupported: false,
    generatedAt,
    stripPolicy,
    ...(reportedPolicy === undefined ? {} : { reportedPolicy }),
  }
}

test("a capable report without a policy suffix says the flag was ignored", () => {
  const rendered = renderCleanup(capableReport())
  expect(rendered).toContain("did not echo a `--strip-policy` level")
  expect(rendered).toContain("`balanced`")
})

test("a capable report at aggressive needs no note when the flag is ignored", () => {
  const rendered = renderCleanup(capableReport(undefined, "aggressive"))
  expect(rendered).not.toContain("--strip-policy")
})

test("a capable report that ran another policy says so", () => {
  const rendered = renderCleanup(capableReport("aggressive"))
  expect(rendered).toContain("ran `aggressive` although `balanced` was configured")
})

test("a capable report that echoed the configured policy adds no note", () => {
  const rendered = renderCleanup(capableReport("balanced"))
  expect(rendered).not.toContain("--strip-policy")
})

test("unsupported report names the version floor for a too-old binary", () => {
  const rendered = renderCleanup(unavailableReport("0.3.1"))
  expect(rendered).toContain("test-checker 0.3.1 predates")
  expect(rendered).toContain("0.4.0 or newer")
  expect(rendered).toContain("Nothing was rewritten")
})

test("unsupported report says the capable binary reported nothing, without a floor", () => {
  const rendered = renderCleanup(unavailableReport("0.4.0"))
  expect(rendered).toContain("test-checker 0.4.0 did not report a cleanup pass")
  expect(rendered).not.toContain("predates")
  expect(rendered).toContain("nothing was rewritten")
})

test("a report without a version keeps the generic unavailable message", () => {
  const rendered = renderCleanup(unavailableReport())
  expect(rendered).toContain("No test-checker binary available")
})
