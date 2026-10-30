/**
 * Every audit action and entity type written by a route must be in the shared
 * allow-list.
 *
 * `recordAudit` refuses unknown values and only logs, by design: an audit write
 * must never fail the operation it describes. The cost of that design is that a
 * typo or a new action name silently produces no audit trail at all — which is
 * how payments, payouts and refunds once went unaudited. This test turns that
 * silent gap into a failing build.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isAuditAction, isEntityType } from "../../../packages/shared/src/index.js";

const SRC = join(__dirname, "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts") ? [path] : [];
  });
}

function literals(pattern: RegExp): Map<string, string> {
  const found = new Map<string, string>();
  for (const file of sourceFiles(SRC)) {
    for (const match of readFileSync(file, "utf8").matchAll(pattern)) found.set(match[1]!, file);
  }
  return found;
}

describe("audit vocabulary", () => {
  it("only uses registered audit actions", () => {
    const unknown = [...literals(/action: "([A-Z_]+)"/g)].filter(([action]) => !isAuditAction(action));
    expect(unknown).toEqual([]);
  });

  it("only returns registered actions from the routes' *AuditAction helpers", () => {
    // Review and moderation routes compute the action from the decision, so the
    // literal is a `return` inside a helper rather than an `action:` property.
    const helpers = new Map<string, string>();
    for (const file of sourceFiles(join(SRC, "routes"))) {
      const source = readFileSync(file, "utf8");
      for (const body of source.matchAll(/function \w+AuditAction\([^)]*\)[^{]*\{([\s\S]*?)\n\}/g)) {
        for (const match of body[1]!.matchAll(/return "([A-Z_]+)";/g)) helpers.set(match[1]!, file);
      }
    }
    expect(helpers.size).toBeGreaterThan(0);
    expect([...helpers].filter(([action]) => !isAuditAction(action))).toEqual([]);
  });

  it("only uses registered entity types", () => {
    const unknown = [...literals(/entityType: "([A-Z_]+)"/g)].filter(([type]) => !isEntityType(type));
    expect(unknown).toEqual([]);
  });
});
