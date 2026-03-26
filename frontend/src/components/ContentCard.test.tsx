import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContentCard } from './ContentCard';

const defaultProps = {
  body: 'Test content body',
  status: 'AI_SUGGESTED' as const,
  reviewNotes: null,
  isPending: false,
  error: null,
  onApprove: vi.fn(),
  onReject: vi.fn(),
};

describe('ContentCard', () => {
  it('renders body content', () => {
    render(<ContentCard {...defaultProps} />);
    expect(screen.getByText('Test content body')).toBeInTheDocument();
  });

  it('shows empty state when no body', () => {
    render(<ContentCard {...defaultProps} body="" />);
    expect(screen.getByText(/No content yet/)).toBeInTheDocument();
  });

  it('shows Approve and Reject buttons for AI_SUGGESTED status', () => {
    render(<ContentCard {...defaultProps} status="AI_SUGGESTED" />);
    expect(screen.getByText('Approve')).toBeInTheDocument();
    expect(screen.getByText('Reject')).toBeInTheDocument();
  });

  it('calls onApprove when Approve is clicked', () => {
    const onApprove = vi.fn();
    render(<ContentCard {...defaultProps} onApprove={onApprove} />);

    fireEvent.click(screen.getByText('Approve'));
    expect(onApprove).toHaveBeenCalledOnce();
  });

  it('calls onReject when Reject is clicked', () => {
    const onReject = vi.fn();
    render(<ContentCard {...defaultProps} onReject={onReject} />);

    fireEvent.click(screen.getByText('Reject'));
    expect(onReject).toHaveBeenCalledOnce();
  });

  it('shows "Approved" badge for APPROVED status', () => {
    render(<ContentCard {...defaultProps} status="APPROVED" />);
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.queryByText('Approve')).not.toBeInTheDocument();
  });

  it('shows Reopen button for APPROVED status', () => {
    const onReopen = vi.fn();
    render(
      <ContentCard {...defaultProps} status="APPROVED" onReopen={onReopen} />,
    );

    const btn = screen.getByText('Reopen');
    fireEvent.click(btn);
    expect(onReopen).toHaveBeenCalledOnce();
  });

  it('shows Regenerate button for REJECTED status', () => {
    const onRegenerate = vi.fn();
    render(
      <ContentCard
        {...defaultProps}
        status="REJECTED"
        onRegenerate={onRegenerate}
      />,
    );

    const btn = screen.getByText('Regenerate');
    fireEvent.click(btn);
    expect(onRegenerate).toHaveBeenCalledOnce();
  });

  it('uses custom regenerateLabel', () => {
    render(
      <ContentCard
        {...defaultProps}
        status="REJECTED"
        onRegenerate={vi.fn()}
        regenerateLabel="Re-draft"
      />,
    );

    expect(screen.getByText('Re-draft')).toBeInTheDocument();
  });

  it('shows generating skeleton when isGenerating and no body', () => {
    const { container } = render(
      <ContentCard {...defaultProps} body="" isGenerating={true} />,
    );

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    expect(screen.getByText('Generating content…')).toBeInTheDocument();
  });

  it('shows regenerating overlay when isGenerating with body', () => {
    render(
      <ContentCard {...defaultProps} body="Existing body" isGenerating={true} />,
    );

    expect(screen.getByText('Regenerating…')).toBeInTheDocument();
    expect(screen.getByText('Existing body')).toBeInTheDocument();
  });

  it('displays review notes when present', () => {
    render(
      <ContentCard {...defaultProps} reviewNotes="Needs more detail." />,
    );

    expect(screen.getByText('Needs more detail.')).toBeInTheDocument();
    expect(screen.getByText('Notes:')).toBeInTheDocument();
  });

  it('shows Edit button when onSave is provided', () => {
    render(
      <ContentCard {...defaultProps} onSave={vi.fn()} />,
    );

    expect(screen.getByText('Edit')).toBeInTheDocument();
  });

  it('enters edit mode when Edit is clicked', () => {
    render(
      <ContentCard {...defaultProps} onSave={vi.fn()} />,
    );

    fireEvent.click(screen.getByText('Edit'));
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('calls onSave with edited content and returns to view mode', () => {
    const onSave = vi.fn();
    render(
      <ContentCard {...defaultProps} onSave={onSave} />,
    );

    fireEvent.click(screen.getByText('Edit'));

    // Find textarea and change content
    const textareas = screen.getAllByRole('textbox');
    fireEvent.change(textareas[0], { target: { value: 'Updated body' } });
    fireEvent.change(textareas[1], { target: { value: 'New notes' } });

    fireEvent.click(screen.getByText('Save Changes'));

    expect(onSave).toHaveBeenCalledWith('Updated body', 'New notes');
    // Should be back to view mode
    expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();
  });

  it('cancels edit mode without saving', () => {
    const onSave = vi.fn();
    render(
      <ContentCard {...defaultProps} onSave={onSave} />,
    );

    fireEvent.click(screen.getByText('Edit'));
    fireEvent.click(screen.getByText('Cancel'));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();
  });

  it('disables action buttons when isPending', () => {
    render(<ContentCard {...defaultProps} isPending={true} />);

    expect(screen.getByText('Approve')).toBeDisabled();
    expect(screen.getByText('Reject')).toBeDisabled();
  });

  it('displays error message when error is provided', () => {
    render(
      <ContentCard {...defaultProps} error={new Error('Update failed')} />,
    );

    expect(screen.getByText('Update failed')).toBeInTheDocument();
  });
});
