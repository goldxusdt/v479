import { describe, it, expect } from 'vitest';
import { cn, createQueryString } from '../utils/utils';

describe('utils.ts', () => {
  describe('cn', () => {
    it('should merge class names correctly', () => {
      expect(cn('p-4', 'bg-blue-500')).toBe('p-4 bg-blue-500');
      expect(cn('p-4', undefined, 'bg-blue-500')).toBe('p-4 bg-blue-500');
      expect(cn('p-4', { 'bg-blue-500': true, 'text-white': false })).toBe('p-4 bg-blue-500');
    });
  });

  describe('createQueryString', () => {
    it('should create a query string correctly', () => {
      const searchParams = new URLSearchParams('page=1&sort=asc');
      const params = { page: 2, filter: 'active', sort: null } as any;
      const result = createQueryString(params, searchParams);
      expect(result).toContain('page=2');
      expect(result).toContain('filter=active');
      expect(result).not.toContain('sort=asc');
    });
  });
});
