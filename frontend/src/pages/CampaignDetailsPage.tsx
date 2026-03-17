import { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import {
  getCampaignById,
  updateLocalizationContent,
  updateLocalizationStatus,
} from '../services/campaign.service';
import type { CampaignDetails, ContentLocalization, ReviewStatus } from '../types/campaign';
import './CampaignDetailsPage.css';

type EditableField = 'titleSuggestion' | 'bodySuggestion';

type CampaignDetailsPageProps = {
  campaignId: string;
};

type EditingState = {
  localizationId: string;
  field: EditableField;
  value: string;
};

type RealtimeLocalizationEvent = {
  campaignId?: string;
  localizationId?: string;
  contentPieceId?: string;
  locale?: string;
  stage?: 'pieces' | 'localizations' | 'generation';
  message?: string;
  titleSuggestion?: string;
  bodySuggestion?: string;
  status?: ReviewStatus;
};

type TimelineEvent = {
  id: number;
  message: string;
  at: string;
};

export function CampaignDetailsPage({ campaignId }: CampaignDetailsPageProps) {
  const [campaign, setCampaign] = useState<CampaignDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusSavingId, setStatusSavingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [realtimeMessage, setRealtimeMessage] = useState<string | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const editingTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const timelineCounter = useRef(0);

  function addTimelineEvent(message: string) {
    timelineCounter.current += 1;
    const nextEvent: TimelineEvent = {
      id: timelineCounter.current,
      message,
      at: new Date().toLocaleTimeString(),
    };
    setTimelineEvents((current) => [nextEvent, ...current].slice(0, 12));
  }

  useEffect(() => {
    async function loadCampaign() {
      setLoading(true);
      setError(null);

      try {
        const details = await getCampaignById(campaignId);
        setCampaign(details);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : 'Unexpected error');
      } finally {
        setLoading(false);
      }
    }

    void loadCampaign();
  }, [campaignId]);

  useEffect(() => {
    if (!editingTextareaRef.current) {
      return;
    }
    autoResizeTextarea(editingTextareaRef.current);
  }, [editing]);

  useEffect(() => {
    const socketUrl = import.meta.env.VITE_WS_URL ?? 'http://localhost:3000';
    const socket = io(socketUrl, { transports: ['websocket', 'polling'] });

    const applyRealtimePatch = (payload: RealtimeLocalizationEvent) => {
      if (!payload.localizationId) {
        return;
      }

      setCampaign((current) => {
        if (!current || (payload.campaignId && payload.campaignId !== current.id)) {
          return current;
        }

        return {
          ...current,
          pieces: current.pieces.map((piece) => ({
            ...piece,
            localizations: piece.localizations.map((loc) =>
              loc.id === payload.localizationId
                ? {
                    ...loc,
                    languageCode: payload.locale ?? loc.languageCode,
                    titleSuggestion:
                      payload.titleSuggestion !== undefined
                        ? payload.titleSuggestion
                        : loc.titleSuggestion,
                    bodySuggestion:
                      payload.bodySuggestion !== undefined
                        ? payload.bodySuggestion
                        : loc.bodySuggestion,
                    status: payload.status ?? loc.status,
                  }
                : loc,
            ),
          })),
        };
      });
    };

    socket.emit('campaign:join', { campaignId });

    socket.on('campaign:join', () => {
      setRealtimeMessage('Realtime connected');
      addTimelineEvent('Realtime connected to campaign room');
    });

    socket.on('content:processing', (payload: RealtimeLocalizationEvent) => {
      applyRealtimePatch(payload);
      const message = payload.message ?? `Processing ${payload.locale ?? ''}`.trim();
      setRealtimeMessage(message);
      addTimelineEvent(message);
    });

    socket.on('content:suggested', (payload: RealtimeLocalizationEvent) => {
      applyRealtimePatch(payload);
      const message = `AI suggested content for ${payload.locale ?? 'localization'}`;
      setRealtimeMessage(message);
      addTimelineEvent(message);
    });

    socket.on('content:update', (payload: RealtimeLocalizationEvent) => {
      applyRealtimePatch(payload);
      const message = `Content updated for ${payload.locale ?? 'localization'}`;
      setRealtimeMessage(message);
      addTimelineEvent(message);
    });

    socket.on('status:change', (payload: RealtimeLocalizationEvent) => {
      applyRealtimePatch(payload);
      const message = `Status changed to ${payload.status ?? 'updated'}`;
      setRealtimeMessage(message);
      addTimelineEvent(message);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [campaignId]);

  const localizationCount = useMemo(() => {
    if (!campaign) {
      return 0;
    }
    return campaign.pieces.reduce((sum, piece) => sum + piece.localizations.length, 0);
  }, [campaign]);

  const progress = useMemo(() => {
    if (!campaign) {
      return {
        total: 0,
        generated: 0,
        pending: 0,
        percent: 0,
        byStatus: {
          DRAFT: 0,
          AI_SUGGESTED: 0,
          REVIEWED: 0,
          APPROVED: 0,
          REJECTED: 0,
        } as Record<ReviewStatus, number>,
      };
    }

    const allLocalizations = campaign.pieces.flatMap((piece) => piece.localizations);
    const byStatus: Record<ReviewStatus, number> = {
      DRAFT: 0,
      AI_SUGGESTED: 0,
      REVIEWED: 0,
      APPROVED: 0,
      REJECTED: 0,
    };

    allLocalizations.forEach((loc) => {
      byStatus[loc.status] += 1;
    });

    const total = allLocalizations.length;
    const generated =
      byStatus.AI_SUGGESTED + byStatus.REVIEWED + byStatus.APPROVED + byStatus.REJECTED;
    const pending = byStatus.DRAFT;
    const percent = total === 0 ? 0 : Math.round((generated / total) * 100);

    return { total, generated, pending, percent, byStatus };
  }, [campaign]);

  function startEditing(localization: ContentLocalization, field: EditableField) {
    if (localization.status === 'APPROVED' || localization.status === 'REJECTED') {
      return;
    }
    setSaveError(null);
    setEditing({
      localizationId: localization.id,
      field,
      value: localization[field] ?? '',
    });
  }

  async function saveEditing() {
    if (!editing || !campaign) {
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      const payload =
        editing.field === 'titleSuggestion'
          ? { titleSuggestion: editing.value }
          : { bodySuggestion: editing.value };

      const updatedLocalization = await updateLocalizationContent(editing.localizationId, payload);

      setCampaign({
        ...campaign,
        pieces: campaign.pieces.map((piece) => ({
          ...piece,
          localizations: piece.localizations.map((loc) =>
            loc.id === editing.localizationId ? { ...loc, ...updatedLocalization } : loc,
          ),
        })),
      });
      setEditing(null);
    } catch (updateError) {
      setSaveError(updateError instanceof Error ? updateError.message : 'Unexpected error');
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(localization: ContentLocalization, nextStatus: ReviewStatus) {
    if (!campaign) {
      return;
    }

    setSaveError(null);
    setStatusSavingId(localization.id);
    try {
      const updatedLocalization = await updateLocalizationStatus(localization.id, {
        status: nextStatus,
      });

      setCampaign({
        ...campaign,
        pieces: campaign.pieces.map((piece) => ({
          ...piece,
          localizations: piece.localizations.map((loc) =>
            loc.id === localization.id ? { ...loc, ...updatedLocalization } : loc,
          ),
        })),
      });
    } catch (statusError) {
      setSaveError(statusError instanceof Error ? statusError.message : 'Unexpected error');
    } finally {
      setStatusSavingId(null);
    }
  }

  if (loading) {
    return (
      <main className="campaign-details-page">
        <section className="campaign-details-page__card">
          <p>Loading campaign details...</p>
        </section>
      </main>
    );
  }

  if (error || !campaign) {
    return (
      <main className="campaign-details-page">
        <section className="campaign-details-page__card">
          <p className="campaign-details-page__error">{error ?? 'Campaign not found'}</p>
          <a className="campaign-details-page__back-link" href="/">
            Back to create campaign
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className="campaign-details-page">
      <section className="campaign-details-page__card">
        <div className="campaign-details-page__header">
          <div>
            <h1>{campaign.topic}</h1>
            <p className="campaign-details-page__subtitle">
              {campaign.description || 'No description provided'}
            </p>
          </div>
          <a className="campaign-details-page__back-link" href="/">
            Back
          </a>
        </div>

        <div className="campaign-details-page__meta">
          <span>Provider: {campaign.llmProvider}</span>
          <span>Model: {campaign.model}</span>
          <span>Languages: {campaign.languages.join(', ')}</span>
          <span>Pieces: {campaign.pieces.length}</span>
          <span>Localizations: {localizationCount}</span>
        </div>

        {realtimeMessage ? (
          <p className="campaign-details-page__live-indicator">{realtimeMessage}</p>
        ) : null}

        <section className="campaign-details-page__progress-card">
          <div className="campaign-details-page__progress-head">
            <h2>Generation progress</h2>
            <span>
              {progress.generated}/{progress.total} ready
            </span>
          </div>
          <div className="campaign-details-page__progress-track">
            <div
              className="campaign-details-page__progress-fill"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <div className="campaign-details-page__progress-meta">
            <span>{progress.percent}% completed</span>
            <span>{progress.pending} pending</span>
            <span>{progress.byStatus.REVIEWED} reviewed</span>
            <span>{progress.byStatus.APPROVED} approved</span>
            <span>{progress.byStatus.REJECTED} rejected</span>
          </div>
          {timelineEvents.length > 0 ? (
            <ul className="campaign-details-page__timeline">
              {timelineEvents.map((eventItem) => (
                <li key={eventItem.id}>
                  <span className="campaign-details-page__timeline-time">{eventItem.at}</span>
                  <span>{eventItem.message}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="campaign-details-page__timeline-empty">
              Waiting for generation updates...
            </p>
          )}
        </section>

        {saveError && <p className="campaign-details-page__error">{saveError}</p>}

        <div className="campaign-details-page__pieces">
          {campaign.pieces.map((piece) => (
            <article key={piece.id} className="campaign-details-page__piece-card">
              <h2>{piece.name}</h2>
              <p className="campaign-details-page__piece-type">{piece.type}</p>

              <div className="campaign-details-page__localizations">
                {piece.localizations.map((localization) => {
                  const isEditingTitle =
                    editing?.localizationId === localization.id &&
                    editing.field === 'titleSuggestion';
                  const isEditingBody =
                    editing?.localizationId === localization.id &&
                    editing.field === 'bodySuggestion';
                  const isFinalized =
                    localization.status === 'APPROVED' || localization.status === 'REJECTED';
                  const allowedStatusTransitions = getAllowedTransitions(localization.status);
                  const isChangingStatus = statusSavingId === localization.id;

                  return (
                    <section key={localization.id} className="campaign-details-page__loc-card">
                      <div className="campaign-details-page__loc-head">
                        <strong>{localization.languageCode.toUpperCase()}</strong>
                        <span
                          className={`campaign-details-page__status-tag ${getStatusClassName(
                            localization.status,
                          )}`}
                        >
                          {localization.status}
                        </span>
                      </div>

                      <label className="campaign-details-page__field-label">Title</label>
                      {isEditingTitle ? (
                        <textarea
                          ref={editingTextareaRef}
                          className="campaign-details-page__editor"
                          value={editing.value}
                          onChange={(event) => {
                            setEditing({ ...editing, value: event.target.value });
                            autoResizeTextarea(event.currentTarget);
                          }}
                          rows={1}
                        />
                      ) : (
                        <div
                          className={`campaign-details-page__editable ${isFinalized ? 'campaign-details-page__editable--disabled' : ''}`}
                          onClick={() => startEditing(localization, 'titleSuggestion')}
                        >
                          {localization.titleSuggestion || 'Click to add title'}
                        </div>
                      )}

                      <label className="campaign-details-page__field-label">Body</label>
                      {isEditingBody ? (
                        <textarea
                          ref={editingTextareaRef}
                          className="campaign-details-page__editor"
                          value={editing.value}
                          onChange={(event) => {
                            setEditing({ ...editing, value: event.target.value });
                            autoResizeTextarea(event.currentTarget);
                          }}
                          rows={1}
                        />
                      ) : (
                        <div
                          className={`campaign-details-page__editable campaign-details-page__body ${isFinalized ? 'campaign-details-page__editable--disabled' : ''}`}
                          onClick={() => startEditing(localization, 'bodySuggestion')}
                        >
                          {localization.bodySuggestion || 'Click to add body content'}
                        </div>
                      )}

                      {(isEditingTitle || isEditingBody) && (
                        <div className="campaign-details-page__actions">
                          <button onClick={saveEditing} disabled={saving}>
                            {saving ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            type="button"
                            className="campaign-details-page__cancel"
                            onClick={() => setEditing(null)}
                            disabled={saving}
                          >
                            Cancel
                          </button>
                        </div>
                      )}

                      <div className="campaign-details-page__status-actions">
                        <span className="campaign-details-page__field-label">Next status</span>
                        <div className="campaign-details-page__status-buttons">
                          {allowedStatusTransitions.length === 0 ? (
                            <span className="campaign-details-page__status-final">
                              <span
                                className={`campaign-details-page__status-pill ${
                                  localization.status === 'APPROVED'
                                    ? 'campaign-details-page__status-pill--approved'
                                    : 'campaign-details-page__status-pill--rejected'
                                }`}
                              >
                                {localization.status}
                              </span>
                            </span>
                          ) : (
                            allowedStatusTransitions.map((nextStatus) => (
                              <button
                                key={nextStatus}
                                type="button"
                                className="campaign-details-page__status-button"
                                onClick={() => changeStatus(localization, nextStatus)}
                                disabled={isChangingStatus}
                              >
                                {isChangingStatus ? 'Updating...' : nextStatus}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    </section>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function getAllowedTransitions(current: ReviewStatus): ReviewStatus[] {
  const map: Record<ReviewStatus, ReviewStatus[]> = {
    DRAFT: ['AI_SUGGESTED'],
    AI_SUGGESTED: ['REVIEWED', 'REJECTED'],
    REVIEWED: ['APPROVED', 'REJECTED'],
    APPROVED: [],
    REJECTED: [],
  };
  return map[current] ?? [];
}

function getStatusClassName(status: ReviewStatus): string {
  switch (status) {
    case 'DRAFT':
      return 'campaign-details-page__status-tag--draft';
    case 'AI_SUGGESTED':
      return 'campaign-details-page__status-tag--ai-suggested';
    case 'REVIEWED':
      return 'campaign-details-page__status-tag--reviewed';
    case 'APPROVED':
      return 'campaign-details-page__status-tag--approved';
    case 'REJECTED':
      return 'campaign-details-page__status-tag--rejected';
    default:
      return '';
  }
}

function autoResizeTextarea(element: HTMLTextAreaElement): void {
  element.style.height = 'auto';
  element.style.height = `${element.scrollHeight}px`;
}
