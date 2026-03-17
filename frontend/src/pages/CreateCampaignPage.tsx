import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { CreateCampaignForm } from '../components/campaign/CreateCampaignForm';
import { createCampaign, getCampaignById } from '../services/campaign.service';
import type { CampaignDetails, CreateCampaignPayload } from '../types/campaign';
import './CreateCampaignPage.css';

type RealtimeCampaignProgressEvent = {
  campaignId?: string;
  stage?: 'pieces' | 'localizations' | 'generation';
  locale?: string;
  message?: string;
};

type TimelineEvent = {
  id: number;
  message: string;
  at: string;
};

export function CreateCampaignPage() {
  const [loading, setLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [processingCampaignId, setProcessingCampaignId] = useState<string | null>(null);
  const [processStatusMessage, setProcessStatusMessage] = useState<string | null>(null);
  const [realtimeMessage, setRealtimeMessage] = useState<string | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const timelineCounter = useRef(0);
  const lastDerivedStatusRef = useRef<string | null>(null);
  const activeRunIdRef = useRef(0);

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
    if (!processingCampaignId) {
      return;
    }

    const runId = activeRunIdRef.current;
    const socketUrl = import.meta.env.VITE_WS_URL;
    const socket = socketUrl
      ? io(socketUrl, {
          transports: ['polling', 'websocket'],
          reconnection: true,
          reconnectionAttempts: 20,
          reconnectionDelay: 500,
        })
      : io({
          path: '/socket.io',
          transports: ['polling', 'websocket'],
          reconnection: true,
          reconnectionAttempts: 20,
          reconnectionDelay: 500,
        });

    const joinCampaignRoom = () => {
      socket.emit('campaign:join', { campaignId: processingCampaignId });
    };

    socket.on('connect', () => {
      if (runId !== activeRunIdRef.current) {
        return;
      }
      addTimelineEvent('Socket connected');
      joinCampaignRoom();
    });

    socket.on('campaign:join', () => {
      if (runId !== activeRunIdRef.current) {
        return;
      }
      setRealtimeMessage('Realtime connected to campaign updates');
      addTimelineEvent('Realtime room joined');
    });

    socket.on('connect_error', () => {
      if (runId !== activeRunIdRef.current) {
        return;
      }
      setRealtimeMessage('Realtime reconnecting...');
    });

    socket.on('content:processing', (payload: RealtimeCampaignProgressEvent) => {
      if (runId !== activeRunIdRef.current || payload.campaignId !== processingCampaignId) {
        return;
      }
      const message = payload.message ?? `Processing ${payload.locale ?? ''}`.trim();
      setRealtimeMessage(message);
      addTimelineEvent(message);
    });

    socket.on('content:suggested', (payload: RealtimeCampaignProgressEvent) => {
      if (runId !== activeRunIdRef.current || payload.campaignId !== processingCampaignId) {
        return;
      }
      const message = payload.message ?? `Suggestion generated for ${payload.locale ?? 'locale'}`;
      setRealtimeMessage(message);
      addTimelineEvent(message);
    });

    socket.on('status:change', (payload: RealtimeCampaignProgressEvent) => {
      if (runId !== activeRunIdRef.current || payload.campaignId !== processingCampaignId) {
        return;
      }
      const message = payload.message ?? `Status changed for ${payload.locale ?? 'localization'}`;
      setRealtimeMessage(message);
      addTimelineEvent(message);
    });

    socket.on('generation:completed', (payload: RealtimeCampaignProgressEvent) => {
      if (runId !== activeRunIdRef.current || payload.campaignId !== processingCampaignId) {
        return;
      }
      const message = payload.message ?? 'AI generation completed.';
      setRealtimeMessage(message);
      addTimelineEvent(message);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [processingCampaignId]);

  useEffect(() => {
    if (!processingCampaignId) {
      return;
    }

    const runId = activeRunIdRef.current;
    let cancelled = false;

    const syncProcessStatus = async () => {
      try {
        const details = await getCampaignById(processingCampaignId);
        if (cancelled) {
          return;
        }
        if (runId !== activeRunIdRef.current) {
          return;
        }

        const derivedStatus = deriveCampaignProcessingStatus(details);
        setProcessStatusMessage(derivedStatus);

        if (lastDerivedStatusRef.current !== derivedStatus) {
          addTimelineEvent(derivedStatus);
          lastDerivedStatusRef.current = derivedStatus;
        }
      } catch {
        // Keep the latest known realtime message when polling fails temporarily.
      }
    };

    void syncProcessStatus();
    const intervalId = window.setInterval(() => {
      void syncProcessStatus();
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [processingCampaignId]);

  async function handleCreateCampaign(payload: CreateCampaignPayload) {
    activeRunIdRef.current += 1;
    setRequestError(null);
    setProcessingCampaignId(null);
    setProcessStatusMessage(null);
    setRealtimeMessage(null);
    setTimelineEvents([]);
    timelineCounter.current = 0;
    lastDerivedStatusRef.current = null;
    setLoading(true);

    try {
      const createdCampaign = await createCampaign(payload);
      setProcessingCampaignId(createdCampaign.id);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Unexpected error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="create-campaign-page">
      <section className="create-campaign-page__card">
        <a className="create-campaign-page__back-link" href="/">
          Back to dashboard
        </a>
        <h1>Create Content Workflow</h1>
        <p className="create-campaign-page__subtitle">
          Enter topic, model and localizations to create a campaign.
        </p>

        <CreateCampaignForm
          onSubmitCampaign={handleCreateCampaign}
          loading={loading}
        />

        {requestError && <p className="create-campaign-page__error">{requestError}</p>}

        {processingCampaignId && (
          <div className="create-campaign-page__processing">
            <p>{processStatusMessage ?? 'Campaign created. Initializing AI generation...'}</p>
            {realtimeMessage ? (
              <p className="create-campaign-page__live-indicator">{realtimeMessage}</p>
            ) : null}
            {timelineEvents.length > 0 ? (
              <ul className="create-campaign-page__timeline">
                {timelineEvents.map((eventItem) => (
                  <li key={eventItem.id}>
                    <span className="create-campaign-page__timeline-time">{eventItem.at}</span>
                    <span>{eventItem.message}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="create-campaign-page__timeline-empty">Waiting for processing events...</p>
            )}
            <a
              className="create-campaign-page__details-link"
              href={`/campaigns/${processingCampaignId}`}
            >
              Open full campaign details
            </a>
          </div>
        )}
      </section>
    </main>
  );
}

function deriveCampaignProcessingStatus(campaign: CampaignDetails): string {
  const pieces = campaign.pieces;
  if (pieces.length === 0) {
    return 'Creating content pieces...';
  }

  const allLocalizations = pieces.flatMap((piece) => piece.localizations);
  const expectedLocalizations = pieces.length * campaign.languages.length;

  if (allLocalizations.length < expectedLocalizations) {
    return `Creating localizations (${allLocalizations.length}/${expectedLocalizations})...`;
  }

  const generatedCount = allLocalizations.filter((loc) => loc.status !== 'DRAFT').length;
  if (generatedCount < allLocalizations.length) {
    return `Generating AI suggestions (${generatedCount}/${allLocalizations.length})...`;
  }

  return 'Generation completed. Suggestions are ready for review.';
}
