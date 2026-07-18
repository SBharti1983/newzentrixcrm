import fs from 'fs';
import path from 'path';

/**
 * Loads a prompt template from the apps/digital-employee/src/prompts directory.
 * Path is resolved relative to this file to prevent runtime directory mismatches.
 */
export function loadPrompt(category: string, filename: string): string {
    const filePath = path.resolve(__dirname, '../prompts', category, filename);
    return fs.readFileSync(filePath, 'utf-8');
}
