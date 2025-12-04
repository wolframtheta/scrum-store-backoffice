import { Injectable } from '@angular/core';
import { STORAGE_KEYS, type StorageKey } from '../constants/storage-keys';

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {
  /**
   * Generic method to get an item from localStorage
   * @param key - Storage key from STORAGE_KEYS constant
   * @returns The stored value or null if not found
   */
  get<T = string>(key: StorageKey): T | null {
    const item = localStorage.getItem(key);
    if (!item) return null;

    try {
      // Try to parse as JSON (for objects/arrays)
      return JSON.parse(item) as T;
    } catch {
      // Return as string if not valid JSON
      return item as T;
    }
  }

  /**
   * Generic method to set an item in localStorage
   * @param key - Storage key from STORAGE_KEYS constant
   * @param value - Value to store (will be JSON stringified if not string)
   */
  set<T = string>(key: StorageKey, value: T): void {
    if (value === null || value === undefined) {
      this.remove(key);
      return;
    }

    const stringValue = typeof value === 'string'
      ? value
      : JSON.stringify(value);

    localStorage.setItem(key, stringValue);
  }

  /**
   * Generic method to remove an item from localStorage
   * @param key - Storage key from STORAGE_KEYS constant
   */
  remove(key: StorageKey): void {
    localStorage.removeItem(key);
  }

  /**
   * Check if a key exists in localStorage
   * @param key - Storage key from STORAGE_KEYS constant
   * @returns true if key exists, false otherwise
   */
  has(key: StorageKey): boolean {
    return localStorage.getItem(key) !== null;
  }

  /**
   * Clear all items from localStorage
   */
  clearAll(): void {
    localStorage.clear();
  }

  /**
   * Get all keys from localStorage
   * @returns Array of storage keys
   */
  getAllKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        keys.push(key);
      }
    }
    return keys;
  }

  /**
   * Get approximate storage size in bytes
   * @returns Storage size in bytes
   */
  getStorageSize(): number {
    let size = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          size += key.length + value.length;
        }
      }
    }
    return size;
  }

  // ============ Convenience methods for common operations ============

  /**
   * Get access token
   */
  getToken(): string | null {
    return this.get(STORAGE_KEYS.ACCESS_TOKEN);
  }

  /**
   * Set access token
   */
  setToken(token: string): void {
    this.set(STORAGE_KEYS.ACCESS_TOKEN, token);
  }

  /**
   * Get refresh token
   */
  getRefreshToken(): string | null {
    return this.get(STORAGE_KEYS.REFRESH_TOKEN);
  }

  /**
   * Set refresh token
   */
  setRefreshToken(token: string): void {
    this.set(STORAGE_KEYS.REFRESH_TOKEN, token);
  }

  /**
   * Clear both access and refresh tokens
   */
  removeTokens(): void {
    this.remove(STORAGE_KEYS.ACCESS_TOKEN);
    this.remove(STORAGE_KEYS.REFRESH_TOKEN);
  }

  /**
   * Get selected group ID
   */
  getSelectedGroupId(): string | null {
    return this.get(STORAGE_KEYS.SELECTED_GROUP_ID);
  }

  /**
   * Set selected group ID
   */
  setSelectedGroupId(groupId: string): void {
    this.set(STORAGE_KEYS.SELECTED_GROUP_ID, groupId);
  }

  /**
   * Clear selected group
   */
  removeSelectedGroup(): void {
    this.remove(STORAGE_KEYS.SELECTED_GROUP_ID);
  }

  /**
   * Get language
   */
  getLanguage(): string {
    return this.get(STORAGE_KEYS.LANGUAGE) || 'ca';
  }

  /**
   * Set language
   */
  setLanguage(lang: string): void {
    this.set(STORAGE_KEYS.LANGUAGE, lang);
  }

  /**
   * Get user (deprecated - use AuthService instead)
   * @deprecated Use AuthService.currentUser() instead
   */
  getUser<T>(): T | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  /**
   * Set user (deprecated - use AuthService instead)
   * @deprecated Use AuthService.setCurrentUser() instead
   */
  setUser(user: unknown): void {
    localStorage.setItem('user', JSON.stringify(user));
  }

  /**
   * Remove user (deprecated - use AuthService instead)
   * @deprecated Use AuthService.clearSession() instead
   */
  removeUser(): void {
    localStorage.removeItem('user');
  }

  /**
   * Clear all storage (alias for clearAll)
   */
  clear(): void {
    this.clearAll();
  }
}
