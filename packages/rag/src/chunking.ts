/**
 * Text Chunking Utility
 * 
 * Splits long text/documents (brochures, FAQs, legal sheets) into cohesive chunks
 * using recursive character splitting. Preserves sentence structures and overlapping
 * borders to prevent information loss at the boundaries.
 */

export interface DocumentChunk {
    text: string;
    startIndex: number;
    endIndex: number;
}

interface ChunkOptions {
    chunkSize?: number;
    chunkOverlap?: number;
}

/**
 * Splits text into chunks.
 * Uses sentence/paragraph/space separators recursively.
 */
export function chunkText(text: string, options: ChunkOptions = {}): DocumentChunk[] {
    const chunkSize = options.chunkSize ?? 500; // default 500 characters
    const chunkOverlap = options.chunkOverlap ?? 100; // default 100 characters overlap

    if (text.length <= chunkSize) {
        return [{ text: text.trim(), startIndex: 0, endIndex: text.length }];
    }

    const chunks: DocumentChunk[] = [];
    let start = 0;

    while (start < text.length) {
        let end = Math.min(start + chunkSize, text.length);

        // Attempt to adjust boundary to a paragraph, sentence or space so we don't chop words
        if (end < text.length) {
            const lookbackLimit = Math.max(start, end - 100);
            let boundaryFound = false;

            // Separators in order of preference
            const separators = ['\n\n', '\n', '. ', '? ', '! ', ' '];

            for (const separator of separators) {
                const index = text.lastIndexOf(separator, end);
                if (index > lookbackLimit) {
                    end = index + separator.length;
                    boundaryFound = true;
                    break;
                }
            }

            // Fallback: If no clean boundary is found, split at space or keep strict character boundary
            if (!boundaryFound) {
                const spaceIndex = text.lastIndexOf(' ', end);
                if (spaceIndex > lookbackLimit) {
                    end = spaceIndex + 1;
                }
            }
        }

        const chunkText = text.substring(start, end).trim();
        if (chunkText.length > 0) {
            chunks.push({
                text: chunkText,
                startIndex: start,
                endIndex: end
            });
        }

        // Advance start position by chunkSize - overlap
        start = end - chunkOverlap;
        if (start >= text.length || end === text.length) {
            break;
        }

        // Safeguard to prevent infinite loop if overlap is misconfigured
        if (start < 0 || start >= end) {
            start = end;
        }
    }

    return chunks;
}
