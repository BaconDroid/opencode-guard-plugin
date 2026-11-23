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
    ...(version === undefined ? {} : { version }),
    generatedAt,
  }
}

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
