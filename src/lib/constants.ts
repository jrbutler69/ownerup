// High-level sidebar navigation categories
export const CATEGORIES = ['Documents', 'Photos', 'Renderings', 'Notes', 'Team'] as const

// Subcategories within Documents
export const DOCUMENT_SUBCATEGORIES = [
  'Contracts',
  'Drawings',
  'Budgets',
  'Invoices',
  'Permits',
  'Insurance',
  'Meeting Notes',
  'Specs',
  'Other',
] as const

// The subset of document subcategories that show the party type picker on upload
export const PARTY_TYPE_CATEGORIES = ['Contracts', 'Drawings', 'Budgets', 'Invoices', 'Insurance'] as const

// The party/team types used in the document upload party picker
export const PARTY_TYPES = ['Architect', 'Engineers', 'Designers', 'Contractors', 'Other'] as const