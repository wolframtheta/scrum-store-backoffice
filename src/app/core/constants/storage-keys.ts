/**
 * Constants for localStorage keys
 * Centralized to avoid typos and make refactoring easier
 */
export const STORAGE_KEYS = {
  // Authentication
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  
  // User preferences
  SELECTED_GROUP_ID: 'selected_group_id',
  LANGUAGE: 'language',
  
  // Theme/UI preferences (future)
  THEME: 'theme',
  SIDEBAR_COLLAPSED: 'sidebar_collapsed',
} as const;

// Type helper for storage keys
export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];


