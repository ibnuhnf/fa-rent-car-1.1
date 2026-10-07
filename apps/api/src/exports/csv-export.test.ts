import { describe, it, expect } from 'vitest';
import { csvString } from './csv-export.helper';

describe('csvString', () => {
  it('escapes comma, quote, newline properly', () => {
    const rows = [
      ['id', 'name', 'notes'],
      ['1', 'FA "Rent"', 'line1\nline2, with comma'],
    ];
    const csv = csvString(rows);
    expect(csv).toBe('id,name,notes\r\n1,"FA ""Rent""","line1\nline2, with comma"');
  });
});

