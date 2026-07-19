/**
 * SentenceStreamer — Shared sentence-boundary streaming utility.
 *
 * Consumes an async generator of text chunks (from an LLM stream) and yields
 * clean, complete sentences as soon as a sentence boundary is detected. This
 * enables chunk-by-chunk TTS playback, dramatically reducing perceived voice
 * latency (the caller hears the first sentence while later sentences are still
 * being generated).
 *
 * Boundary detection rules (in priority order):
 *   1. Terminal punctuation: . ? ! । (Devanagari danda) \n
 *   2. If the buffer grows beyond MAX_BUFFER chars, split on a comma/semicolon
 *   3. If still no boundary, split on the last whitespace (avoid mid-word cuts)
 *
 * Conversational labels emitted by some models (e.g. "Rohan:", "Agent (voice):")
 * and surrounding quotes are stripped from each emitted sentence.
 *
 * Extracted from the inline logic previously duplicated in RohanCognitiveLoop.
 * Used by BaseCognitiveLoop so all three AI employees (Rohan, Monika, Neha)
 * stream sentences uniformly.
 */

/** Default max buffer length before forcing a soft split. */
const DEFAULT_MAX_BUFFER = 80;
/** Minimum soft-split offset to avoid cutting very short segments. */
const MIN_SOFT_SPLIT_OFFSET = 40;

/** Regex of conversational labels to strip from the start of each sentence. */
const LABEL_REGEX = /^(Rohan|Monika|Neha|Rohan's Response|Monika's Response|Neha's Response|Rohan Mishra|Monika Mishra|Neha Mishra|Agent|AI)\s*(\(voice\))?:\s*/i;

/** Terminal punctuation (Latin + Devanagari danda) and newline. */
const TERMINAL_REGEX = /[.?!।\n]/;
/** Soft-split punctuation when buffer grows too long. */
const SOFT_SPLIT_REGEX = /[,;:]/;

/**
 * Clean a single sentence: strip leading labels and surrounding quotes.
 */
function cleanSentence(raw: string): string {
    let s = raw.replace(LABEL_REGEX, '').trim();
    if (s.startsWith('"')) s = s.substring(1);
    if (s.endsWith('"')) s = s.slice(0, -1);
    return s.trim();
}

/**
 * Find the boundary index (exclusive end) for the next sentence in `buffer`.
 * Returns -1 if no boundary is found yet.
 */
function findBoundary(buffer: string, maxBuffer: number): number {
    // 1. Terminal punctuation
    const match = buffer.match(TERMINAL_REGEX);
    if (match && match.index !== undefined) {
        return match.index + 1;
    }

    // 2. Buffer too long — try soft split on comma/semicolon
    if (buffer.length > maxBuffer) {
        const commaMatch = buffer.match(SOFT_SPLIT_REGEX);
        if (commaMatch && commaMatch.index !== undefined) {
            return commaMatch.index + 1;
        }
        // 3. Split on last whitespace to avoid mid-word cuts
        const lastSpace = buffer.lastIndexOf(' ');
        if (lastSpace > MIN_SOFT_SPLIT_OFFSET) {
            return lastSpace + 1;
        }
    }

    return -1;
}

/**
 * Stream clean sentences from an async generator of text chunks.
 *
 * @param stream    - The async generator yielding raw text chunks.
 * @param onSentence - Callback invoked once per clean, complete sentence.
 * @param options   - Optional tuning (maxBuffer).
 */
export async function streamSentences(
    stream: AsyncGenerator<string, void, unknown>,
    onSentence: (sentence: string) => void,
    options?: { maxBuffer?: number }
): Promise<string> {
    const maxBuffer = options?.maxBuffer ?? DEFAULT_MAX_BUFFER;
    let fullText = '';
    let buffer = '';

    for await (const chunk of stream) {
        fullText += chunk;
        buffer += chunk;

        let boundary = findBoundary(buffer, maxBuffer);
        while (boundary !== -1) {
            const sentence = buffer.substring(0, boundary).trim();
            buffer = buffer.substring(boundary);

            if (sentence) {
                const cleaned = cleanSentence(sentence);
                if (cleaned) {
                    onSentence(cleaned);
                }
            }
            boundary = findBoundary(buffer, maxBuffer);
        }
    }

    // Flush any remaining buffer
    const remaining = buffer.trim();
    if (remaining) {
        const cleaned = cleanSentence(remaining);
        if (cleaned) {
            onSentence(cleaned);
        }
    }

    return fullText;
}

/**
 * Clean a complete (non-streamed) response text: strip leading labels and
 * surrounding quotes. Used by the non-streaming fast path.
 */
export function cleanResponseText(raw: string): string {
    let text = (raw || '').replace(LABEL_REGEX, '').trim();
    if (text.startsWith('"') && text.endsWith('"')) {
        text = text.slice(1, -1).trim();
    }
    return text;
}
