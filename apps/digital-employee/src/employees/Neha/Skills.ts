/**
 * Neha Specific Skills
 * Accountant-specific business skills unique to Neha.
 */

/**
 * Minimum documents Neha must collect before she can prepare a GST return.
 * Used by the cognitive loop to validate a filing decision.
 */
export const GST_REQUIRED_DOCUMENTS: Record<string, string[]> = {
    'GSTR-1': ['Sales register (outward supplies)', 'Credit notes / debit notes'],
    'GSTR-3B': ['Sales register', 'Purchase register (input tax credit)', 'Bank statement'],
    'GSTR-9': ['Annual sales summary', 'Annual purchase summary', 'GSTR-1 & 3B filed copies'],
};

/**
 * Minimum documents Neha must collect before she can prepare an ITR return.
 */
export const ITR_REQUIRED_DOCUMENTS: string[] = [
    'PAN card',
    'Aadhaar card',
    'Form 16 / Salary slips (salaried)',
    'Bank statement for the financial year',
    'Investment proofs (80C, 80D, etc.)',
];

/**
 * Returns the list of documents Neha should request for a given filing.
 */
export function documentsNeededForFiling(type: 'gst' | 'itr', gstReturnType?: string): string[] {
    if (type === 'itr') return [...ITR_REQUIRED_DOCUMENTS];
    if (type === 'gst' && gstReturnType && GST_REQUIRED_DOCUMENTS[gstReturnType]) {
        return [...GST_REQUIRED_DOCUMENTS[gstReturnType]];
    }
    return ['Sales register', 'Purchase register', 'Bank statement'];
}

export const NehaSkills = {
    GST_REQUIRED_DOCUMENTS,
    ITR_REQUIRED_DOCUMENTS,
    documentsNeededForFiling,
};
