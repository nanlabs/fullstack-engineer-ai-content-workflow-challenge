import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';
import type { ContentStatus } from '../lib/types';

describe('StatusBadge', () => {
  const cases: [ContentStatus, string][] = [
    ['DRAFT', 'Draft'],
    ['AI_SUGGESTED', 'AI Suggested'],
    ['REVIEWED', 'Reviewed'],
    ['APPROVED', 'Approved'],
    ['REJECTED', 'Rejected'],
  ];

  it.each(cases)('renders label for %s', (status, label) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('applies correct css class for APPROVED', () => {
    render(<StatusBadge status="APPROVED" />);
    const badge = screen.getByText('Approved');
    expect(badge.className).toContain('bg-emerald-50');
  });
});
