import { expect, test, describe } from 'bun:test';
import { ASSISTANCE_STATUSES } from '../services/assistanceService';

describe('Support System', () => {
  test('should have all 8 required assistance statuses', () => {
    const requiredStatuses = [
      'Pending',
      'Under Review',
      'Approved',
      'In Progress',
      'Waiting for Restaurant',
      'Resolved',
      'Rejected',
      'Cancelled'
    ];
    expect(ASSISTANCE_STATUSES.length).toBe(8);
    for (const status of requiredStatuses) {
      expect(ASSISTANCE_STATUSES).toContain(status);
    }
  });
});
