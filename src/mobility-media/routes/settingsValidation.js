/**
 * Client-side validation for the staff settings editor, against the same
 * `platformSettingsSchema` the API parses with.
 */

import { platformSettingsSchema } from "../../../packages/shared/src/settings";

/** Fields the server stamps itself; sending them back would only be overwritten. */
const SERVER_OWNED = ["updatedAt", "updatedBy"];

export function editableSettingsText(settings) {
  const copy = { ...(settings ?? {}) };
  for (const key of SERVER_OWNED) delete copy[key];
  return JSON.stringify(copy, null, 2);
}

/** Parse and validate; returns `{ value }` or `{ errors: string[] }`. */
export function validateSettingsText(text, original) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return { errors: [`Not valid JSON: ${error.message}`] };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { errors: ["The settings must be a JSON object."] };
  }
  const candidate = { ...parsed };
  for (const key of SERVER_OWNED) candidate[key] = original?.[key] ?? "";
  const result = platformSettingsSchema.safeParse(candidate);
  if (!result.success) {
    return {
      errors: result.error.issues.slice(0, 8).map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`),
    };
  }
  return { value: result.data };
}

