import type { TestBlock } from "./types"

// Ruby-style test extraction: a block opens on a declaration line and closes on
// the `end` that balances the block's own openers. Input lines are
// comment-stripped (`lines`) and string-masked (`searchableLines`) so keywords
// inside fixture strings never count.

const LEADING_OPENER = /^\s*(?:if|unless|while|until|case|begin|class|module|for)\b/
const DEF_OPENER = /^\s*def\b/
const ENDLESS_DEF = /^\s*def\s+[\w.?!]+(?:\([^)]*\))?\s*=(?![=~>])/
const ASSIGNED_OPENER = /[=(]\s*(?:if|unless|while|until|case|begin)\b/
const LOOP_OPENER = /^\s*(?:while|until|for)\b/
const DO_KEYWORD = /(?<![\w.:@$])do\b(?![?!]|\s*:(?!:))/g
const END_KEYWORD = /(?<![\w.:@$]|^=)end\b(?![?!]|\s*:(?!:))/g

function countMatches(line: string, pattern: RegExp): number {
  return line.match(pattern)?.length ?? 0
}

// Net change in block depth contributed by one line of Ruby code. `x if y`
// modifiers do not open a block because only line-leading or assigned keywords
// are counted; `while x do` and `for x in y do` close with a single `end`.
export function rubyDepthDelta(line: string): number {
  let opens = 0
  if (LEADING_OPENER.test(line)) opens += 1
  else if (DEF_OPENER.test(line) && !ENDLESS_DEF.test(line)) opens += 1
  else if (ASSIGNED_OPENER.test(line)) opens += 1
  const doCount = countMatches(line, DO_KEYWORD)
  opens += LOOP_OPENER.test(line) ? Math.max(0, doCount - 1) : doCount
  return opens - countMatches(line, END_KEYWORD)
}

export function findEndBlocks(lines: string[], searchableLines: string[], declaration: RegExp): TestBlock[] {
  const blocks: TestBlock[] = []
  for (let i = 0; i < searchableLines.length; i++) {
    if (!declaration.test(searchableLines[i]!)) continue
    let depth = 0
    let close = -1
    for (let j = i; j < searchableLines.length; j++) {
      depth += rubyDepthDelta(searchableLines[j]!)
      if (depth <= 0) {
        close = j
        break
      }
    }
    if (close < 0) continue
    blocks.push({ startLine: i + 1, endLine: close + 1, lines: lines.slice(i + 1, close) })
    i = close
  }
  return blocks
}
