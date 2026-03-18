import { useState } from "react";

import { useCampaigns } from "./hooks/useCampaigns";
import type { ContentPiece } from "./types/content";
import { CreateCampaignForm } from "./components/CreateCampaignForm";
import { CampaignList } from "./components/CampaignList";

export function App() {
  const {
    campaigns,
    loading,
    error,
    fetchCampaigns,
    createCampaign,
    generateDraft,
    translateContent,
    saveEdit: saveEditRequest,
    approveContent: approveContentRequest,
    rejectContent: rejectContentRequest,
    runPipeline: runPipelineRequest,
  } = useCampaigns();

  const [newCampaignName, setNewCampaignName] = useState("");
  const [newCampaignDescription, setNewCampaignDescription] = useState("");
  const [tone, setTone] = useState("default");
  const [contentType, setContentType] = useState("email");
  const [locale, setLocale] = useState("en-US");
  const [originalText, setOriginalText] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [targetLocaleForTranslate, setTargetLocaleForTranslate] = useState<
    Record<number, string>
  >({});

  const handleCreateCampaign = async () => {
    if (!newCampaignName.trim()) return;
    await createCampaign(newCampaignName, newCampaignDescription, [
      {
        type: contentType,
        locale,
        original_text: originalText,
      },
    ]);
    setNewCampaignName("");
    setNewCampaignDescription("");
    setContentType("email");
    setLocale("en-US");
    setOriginalText("");
  };

  const handleStartEditing = (content: ContentPiece) => {
    setEditingId(content.id);
    setEditText(content.ai_suggested_text ?? "");
  };

  const handleCancelEditing = () => {
    setEditingId(null);
    setEditText("");
  };

  const handleSaveEdit = async (contentId: number) => {
    await saveEditRequest(contentId, editText);
    setEditingId(null);
    setEditText("");
  };

  const handleApproveContent = async (content: ContentPiece) => {
    const textToApprove =
      editingId === content.id ? editText : content.ai_suggested_text;
    await approveContentRequest(content, textToApprove ?? null);
    setEditingId(null);
    setEditText("");
  };

  const handleRejectContent = async (content: ContentPiece) => {
    await rejectContentRequest(content);
    setEditingId(null);
    setEditText("");
  };

  const handleRunPipeline = async (contentId: number) => {
    await runPipelineRequest(contentId, locale ? [locale] : [], tone);
  };

  return (
    <div className="app-root">
      <header className="app-header">
        <h1>ACME AI Content Workflow</h1>
        <p>Campaign dashboard with AI-assisted content drafts.</p>
      </header>

      <main className="app-main">
        <div className="form-section">
          <CreateCampaignForm
            name={newCampaignName}
            description={newCampaignDescription}
            loading={loading}
            onNameChange={setNewCampaignName}
            onDescriptionChange={setNewCampaignDescription}
            onSubmit={handleCreateCampaign}
            onContentTypeChange={setContentType}
            contentType={contentType}
            locale={locale}
            originalText={originalText}
            onLocaleChange={setLocale}
            onOriginalTextChange={setOriginalText}
            onToneChange={setTone}
            tone={tone}
          />
        </div>

        <div className="list-section">
          <CampaignList
            campaigns={campaigns}
            loading={loading}
            error={error}
            editingId={editingId}
            editText={editText}
            targetLocaleForTranslate={targetLocaleForTranslate}
            onRefresh={fetchCampaigns}
            onEditTextChange={setEditText}
            onTargetLocaleChange={(contentId, value) => setTargetLocaleForTranslate((prev) => ({
              ...prev,
              [contentId]: value,
            }))}
            onStartEditing={handleStartEditing}
            onCancelEditing={handleCancelEditing}
            onSaveEdit={handleSaveEdit}
            onGenerateDraft={generateDraft}
            onTranslate={translateContent}
            onApprove={handleApproveContent}
            onReject={handleRejectContent}
            onRunPipeline={handleRunPipeline}
          />
        </div>
      </main>
    </div>
  );
}
