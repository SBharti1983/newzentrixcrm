import fs from 'fs';
import path from 'path';

/**
 * Loads a prompt template from the apps/digital-employee/src/prompts directory.
 * Path is resolved relative to this file to prevent runtime directory mismatches.
 *
 * Memoized: prompt template files are immutable at runtime, so we cache the
 * file contents in-process after the first read. This eliminates repeated
 * disk I/O on every turn (item 4.2 — reasoning prompt is rebuilt every turn,
 * causing ~10 disk reads + string builds per 10-turn call).
 */
const promptFileCache = new Map<string, string>();

export function loadPrompt(category: string, filename: string): string {
    const filePath = path.resolve(__dirname, '../prompts', category, filename);
    const cached = promptFileCache.get(filePath);
    if (cached !== undefined) {
        return cached;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    promptFileCache.set(filePath, content);
    return content;
}

/**
 * Clear the in-process prompt file cache. Exposed for tests / hot-reload
 * scenarios; not needed in normal production operation.
 */
export function clearPromptCache(): void {
    promptFileCache.clear();
}
