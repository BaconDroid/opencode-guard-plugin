import type { TestBlock } from "./types";
export declare function rubyDepthDelta(line: string): number;
export declare function findEndBlocks(lines: string[], searchableLines: string[], declaration: RegExp): TestBlock[];
