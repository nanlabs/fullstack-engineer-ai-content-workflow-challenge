type Props = {
  name: string;
  description: string;
  contentType: string;
  locale: string;
  originalText: string;
  tone: string;
  loading: boolean;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onContentTypeChange: (value: string) => void;
  onLocaleChange: (value: string) => void;
  onOriginalTextChange: (value: string) => void;
  onSubmit: () => void;
  onToneChange: (value: string) => void;
};

export function CreateCampaignForm({
  name,
  description,
  contentType,
  locale,
  originalText,
  loading,
  tone,
  onNameChange,
  onDescriptionChange,
  onContentTypeChange,
  onLocaleChange,
  onOriginalTextChange,
  onSubmit,
  onToneChange
}: Props) {
  return (
    <section className="card">
      <h2>Create Campaign</h2>

      <div className="form-grid">
        <input
          type="text"
          placeholder="Campaign name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
        />

        <input
          type="text"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
        />

        <input
          type="text"
          placeholder="Content type (e.g. email, social_post)"
          value={contentType}
          onChange={(e) => onContentTypeChange(e.target.value)}
        />

        <select
          value={locale}
          onChange={(e) => onLocaleChange(e.target.value)}
        >
          <option value="default">en-US</option>
          <option value="spanish">es-ES</option>
        </select>

        <select
          value={tone}
          onChange={(e) => onToneChange(e.target.value)}
        >
          <option value="default">Default</option>
          <option value="formal">Formal</option>
          <option value="friendly">Friendly</option>
          <option value="persuasive">Persuasive</option>
          <option value="humorous">Humorous</option>
        </select>

        <textarea
          placeholder="Original text (seed for AI)"
          value={originalText}
          onChange={(e) => onOriginalTextChange(e.target.value)}
        />
      </div>
      <div className="form-actions">
        <button onClick={onSubmit} disabled={loading}>
          Create Campaign
        </button>
      </div>
    </section>
  );
}