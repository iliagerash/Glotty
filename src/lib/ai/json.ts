/**
 * Extracts a JSON value from model output. Open models often wrap JSON in
 * code fences, prepend prose, or emit <think> blocks before answering.
 * Returns undefined when no parseable JSON object or array is found; the
 * caller decides what that means. Nothing here guesses at content.
 */
export function extractJson(text: string): unknown {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  const direct = tryParse(cleaned);
  if (direct !== undefined) return direct;

  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    const fenced = tryParse(fence[1].trim());
    if (fenced !== undefined) return fenced;
  }

  // Fall back to the first balanced {...} or [...] span.
  for (const open of ["{", "["]) {
    const start = cleaned.indexOf(open);
    if (start === -1) continue;
    const end = findBalancedEnd(cleaned, start);
    if (end !== -1) {
      const span = tryParse(cleaned.slice(start, end + 1));
      if (span !== undefined) return span;
    }
  }
  return undefined;
}

function tryParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}

function findBalancedEnd(s: string, start: number): number {
  const open = s[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}
