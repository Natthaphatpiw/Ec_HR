export type WorkforceAssistantStreamEvent =
  | { type: "start"; responseId: string; source: "openai" | "deterministic" }
  | { type: "delta"; delta: string }
  | {
      type: "done";
      answer: string;
      responseId: string;
      continuationToken: string;
      reportUrl: string | null;
      source: "openai" | "deterministic";
    }
  | { type: "error"; message: string };

export function encodeStreamEvent(event: WorkforceAssistantStreamEvent): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`);
}

/**
 * Structured Outputs streams one JSON document. This extracts the first
 * `answer` string safely while the document is still incomplete so the chat
 * can render useful token deltas before the final report payload arrives.
 */
export function extractStreamingAnswer(json: string): string {
  const match = /"answer"\s*:\s*"/.exec(json);
  if (!match) return "";

  let output = "";
  let index = match.index + match[0].length;
  while (index < json.length) {
    const character = json[index];
    if (character === '"') break;
    if (character !== "\\") {
      output += character;
      index += 1;
      continue;
    }

    if (index + 1 >= json.length) break;
    const escaped = json[index + 1];
    const substitutions: Record<string, string> = {
      '"': '"',
      "\\": "\\",
      "/": "/",
      b: "\b",
      f: "\f",
      n: "\n",
      r: "\r",
      t: "\t",
    };
    if (escaped === "u") {
      const hex = json.slice(index + 2, index + 6);
      if (!/^[0-9a-f]{4}$/i.test(hex)) break;
      output += String.fromCharCode(Number.parseInt(hex, 16));
      index += 6;
      continue;
    }
    if (escaped in substitutions) {
      output += substitutions[escaped];
      index += 2;
      continue;
    }
    break;
  }
  return output;
}

export function chunkText(value: string, size = 24): string[] {
  const chunks: string[] = [];
  for (let index = 0; index < value.length; index += size) {
    chunks.push(value.slice(index, index + size));
  }
  return chunks;
}
