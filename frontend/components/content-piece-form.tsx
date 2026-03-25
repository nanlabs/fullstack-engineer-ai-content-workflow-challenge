"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/lib/api";

export function ContentPieceForm({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [sourceText, setSourceText] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiRequest(`/campaigns/${campaignId}/content-pieces`, {
        method: "POST",
        body: JSON.stringify({
          source_text: sourceText,
        }),
      });
      setSourceText("");
      setIsOpen(false);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No se pudo crear la pieza");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button type="button" className="content-list-primary-button" onClick={() => setIsOpen(true)}>
        + Add Content Piece
      </button>
      {isOpen ? (
        <div className="modal-backdrop" role="presentation">
          <div className="content-create-modal" role="dialog" aria-modal="true" aria-labelledby="content-create-title">
            <div className="modal-header">
              <div>
                <h3 id="content-create-title">New Content Piece</h3>
                <p className="muted">Initialize a new creative asset for this campaign.</p>
              </div>
              <button type="button" className="stitch-icon-button" onClick={() => setIsOpen(false)}>
                ×
              </button>
            </div>
            <form className="content-create-form" onSubmit={handleSubmit}>
              <label>
                <span>Initial Notes</span>
                <textarea
                  rows={5}
                  value={sourceText}
                  onChange={(event) => setSourceText(event.target.value)}
                  placeholder="e.g. Hero copy for the summer launch, emphasize durability and warmth."
                  required
                />
              </label>
              {error ? <p className="error-text">{error}</p> : null}
              <div className="button-row">
                <button type="button" className="button-secondary" onClick={() => setIsOpen(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting}>
                  {submitting ? "Creating..." : "Create Piece"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
