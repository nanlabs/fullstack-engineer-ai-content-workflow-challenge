import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AiToolbar } from './AiToolbar';

const defaultProps = {
  hasBody: false,
  hasMetadata: false,
  availableLangs: ['es', 'fr'],
  translateLang: '',
  onTranslateLangChange: vi.fn(),
  isAiLoading: false,
  onGenerate: vi.fn(),
  onExtract: vi.fn(),
  onChain: vi.fn(),
  onTranslate: vi.fn(),
  generating: false,
  extracting: false,
  chaining: false,
  translating: false,
  error: null,
};

describe('AiToolbar', () => {
  it('renders all action buttons', () => {
    render(<AiToolbar {...defaultProps} />);

    expect(screen.getByText('Generate Draft')).toBeInTheDocument();
    expect(screen.getByText('Extract Metadata')).toBeInTheDocument();
    expect(screen.getByText(/Full Pipeline/)).toBeInTheDocument();
  });

  it('calls onGenerate when Generate Draft is clicked', () => {
    const onGenerate = vi.fn();
    render(<AiToolbar {...defaultProps} onGenerate={onGenerate} />);

    fireEvent.click(screen.getByText('Generate Draft'));
    expect(onGenerate).toHaveBeenCalledOnce();
  });

  it('disables Generate Draft when body already exists', () => {
    render(<AiToolbar {...defaultProps} hasBody={true} />);

    const btn = screen.getByText('Draft Generated ✓');
    expect(btn).toBeDisabled();
  });

  it('disables Extract Metadata when no body exists', () => {
    render(<AiToolbar {...defaultProps} hasBody={false} />);

    const btn = screen.getByText('Extract Metadata');
    expect(btn).toBeDisabled();
  });

  it('disables Extract Metadata when metadata already exists', () => {
    render(<AiToolbar {...defaultProps} hasBody={true} hasMetadata={true} />);

    const btn = screen.getByText('Metadata Extracted ✓');
    expect(btn).toBeDisabled();
  });

  it('disables all buttons when AI is loading', () => {
    render(<AiToolbar {...defaultProps} isAiLoading={true} />);

    const generateBtn = screen.getByText('Generate Draft');
    const extractBtn = screen.getByText('Extract Metadata');
    expect(generateBtn).toBeDisabled();
    expect(extractBtn).toBeDisabled();
  });

  it('shows "Generating..." when generating is true', () => {
    render(<AiToolbar {...defaultProps} generating={true} />);
    expect(screen.getByText('Generating...')).toBeInTheDocument();
  });

  it('shows "Extracting..." when extracting is true', () => {
    render(<AiToolbar {...defaultProps} hasBody={true} extracting={true} />);
    expect(screen.getByText('Extracting...')).toBeInTheDocument();
  });

  it('shows "Running pipeline..." when chaining is true', () => {
    render(<AiToolbar {...defaultProps} chaining={true} />);
    expect(screen.getByText('Running pipeline...')).toBeInTheDocument();
  });

  it('renders translate section with language select', () => {
    render(<AiToolbar {...defaultProps} />);

    expect(screen.getByText('Translate to...')).toBeInTheDocument();
    expect(screen.getByText('es')).toBeInTheDocument();
    expect(screen.getByText('fr')).toBeInTheDocument();
  });

  it('disables Translate button when no language selected', () => {
    render(<AiToolbar {...defaultProps} hasBody={true} translateLang="" />);

    const btn = screen.getByText('Translate');
    expect(btn).toBeDisabled();
  });

  it('enables Translate button when language selected and body exists', () => {
    render(
      <AiToolbar
        {...defaultProps}
        hasBody={true}
        translateLang="es"
      />,
    );

    const btn = screen.getByText('Translate');
    expect(btn).not.toBeDisabled();
  });

  it('calls onTranslate when Translate button clicked', () => {
    const onTranslate = vi.fn();
    render(
      <AiToolbar
        {...defaultProps}
        hasBody={true}
        translateLang="es"
        onTranslate={onTranslate}
      />,
    );

    fireEvent.click(screen.getByText('Translate'));
    expect(onTranslate).toHaveBeenCalledOnce();
  });

  it('shows "Translating..." when translating', () => {
    render(
      <AiToolbar
        {...defaultProps}
        hasBody={true}
        translateLang="es"
        translating={true}
      />,
    );

    expect(screen.getByText('Translating...')).toBeInTheDocument();
  });

  it('hides translate section when no available languages', () => {
    render(<AiToolbar {...defaultProps} availableLangs={[]} />);

    expect(screen.queryByText('Translate to...')).not.toBeInTheDocument();
    expect(screen.queryByText('Translate')).not.toBeInTheDocument();
  });

  it('displays error message when error is provided', () => {
    render(
      <AiToolbar {...defaultProps} error={new Error('AI service failed')} />,
    );

    expect(screen.getByText('AI service failed')).toBeInTheDocument();
  });

  it('does not display error section when error is null', () => {
    const { container } = render(<AiToolbar {...defaultProps} error={null} />);

    expect(container.querySelector('.bg-red-50')).not.toBeInTheDocument();
  });

  it('disables pipeline button when body and metadata both exist', () => {
    render(
      <AiToolbar {...defaultProps} hasBody={true} hasMetadata={true} />,
    );

    const btn = screen.getByText('Pipeline Completed ✓');
    expect(btn).toBeDisabled();
  });
});
