import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateCampaign } from '../hooks/useCampaigns';
import { LANGUAGE_LABELS } from '../lib/utils';

const AVAILABLE_LANGUAGES = Object.entries(LANGUAGE_LABELS).filter(([code]) => code !== 'en');

export function CreateCampaignPage() {
  const navigate = useNavigate();
  const mutation = useCreateCampaign();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguages, setTargetLanguages] = useState<string[]>([]);

  const toggleLanguage = (code: string) => {
    setTargetLanguages((prev) =>
      prev.includes(code) ? prev.filter((l) => l !== code) : [...prev, code],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(
      { name, description: description || undefined, sourceLanguage, targetLanguages },
      { onSuccess: (campaign) => navigate(`/campaigns/${campaign.id}`) },
    );
  };

  return (
    <div className="max-w-2xl animate-fade-in">
      <h1
        className="text-2xl mb-6 tracking-tight"
        style={{ color: 'var(--color-text-primary)', fontWeight: 510, letterSpacing: '-0.704px' }}
      >
        Create Campaign
      </h1>

      <form onSubmit={handleSubmit} className="surface-card p-6 space-y-6">
        {/* Campaign Name */}
        <div>
          <label
            className="block text-sm mb-1.5"
            style={{ color: 'var(--color-text-secondary)', fontWeight: 510 }}
          >
            Campaign Name <span style={{ color: 'var(--color-error)' }}>*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Summer 2026 Product Launch"
            className="input-dark w-full"
          />
        </div>

        {/* Description */}
        <div>
          <label
            className="block text-sm mb-1.5"
            style={{ color: 'var(--color-text-secondary)', fontWeight: 510 }}
          >
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Describe the campaign goals, target audience, and key messages..."
            className="textarea-dark w-full"
          />
        </div>

        {/* Source Language */}
        <div>
          <label
            className="block text-sm mb-1.5"
            style={{ color: 'var(--color-text-secondary)', fontWeight: 510 }}
          >
            Source Language
          </label>
          <select
            value={sourceLanguage}
            onChange={(e) => setSourceLanguage(e.target.value)}
            className="pill-select"
          >
            {Object.entries(LANGUAGE_LABELS).map(([code, label]) => (
              <option key={code} value={code}>{label}</option>
            ))}
          </select>
        </div>

        {/* Target Languages */}
        <div>
          <label
            className="block text-sm mb-2"
            style={{ color: 'var(--color-text-secondary)', fontWeight: 510 }}
          >
            Target Languages
          </label>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_LANGUAGES.map(([code, label]) => (
              <button
                key={code}
                type="button"
                onClick={() => toggleLanguage(code)}
                className="px-3 py-1 text-[13px] rounded-full transition-all"
                style={{
                  fontWeight: 510,
                  background: targetLanguages.includes(code)
                    ? 'rgba(94, 106, 210, 0.15)'
                    : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${
                    targetLanguages.includes(code)
                      ? 'rgba(94, 106, 210, 0.3)'
                      : 'rgba(255, 255, 255, 0.08)'
                  }`,
                  color: targetLanguages.includes(code)
                    ? 'var(--color-accent-bright)'
                    : 'var(--color-text-tertiary)',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Submit / Cancel */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={!name.trim() || mutation.isPending}
            className="btn-primary"
          >
            {mutation.isPending ? 'Creating...' : 'Create Campaign'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/campaigns')}
            className="btn-ghost"
          >
            Cancel
          </button>
        </div>

        {/* Error */}
        {mutation.isError && (
          <p className="text-sm" style={{ color: 'var(--color-error)' }}>
            Error: {(mutation.error as Error).message}
          </p>
        )}
      </form>
    </div>
  );
}
