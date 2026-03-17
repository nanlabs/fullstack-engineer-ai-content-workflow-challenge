import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { CreateCampaignForm } from '../components/campaign/CreateCampaignForm';
import { createCampaign } from '../services/campaign.service';
import type { CreateCampaignPayload } from '../types/campaign';
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
  const [realtimeMessage, setRealtimeMessage] = useState<string | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
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
    if (!processingCampaignId) {
      return;
    }

    const socketUrl = import.meta.env.VITE_WS_URL ?? 'http://localhost:3000';
    const socket = io(socketUrl, { transports: ['websocket', 'polling'] });

    socket.emit('campaign:join', { campaignId: processingCampaignId });

    socket.on('campaign:join', () => {
      setRealtimeMessage('Realtime connected to campaign updates');
      addTimelineEvent('Realtime connected');
    });

    socket.on('content:processing', (payload: RealtimeCampaignProgressEvent) => {
      if (payload.campaignId !== processingCampaignId) {
        return;
      }
      const message = payload.message ?? `Processing ${payload.locale ?? ''}`.trim();
      setRealtimeMessage(message);
      addTimelineEvent(message);
    });

    socket.on('content:suggested', (payload: RealtimeCampaignProgressEvent) => {
      if (payload.campaignId !== processingCampaignId) {
        return;
      }
      const message = payload.message ?? `Suggestion generated for ${payload.locale ?? 'locale'}`;
      setRealtimeMessage(message);
      addTimelineEvent(message);
    });

    socket.on('status:change', (payload: RealtimeCampaignProgressEvent) => {
      if (payload.campaignId !== processingCampaignId) {
        return;
      }
      const message = payload.message ?? `Status changed for ${payload.locale ?? 'localization'}`;
      setRealtimeMessage(message);
      addTimelineEvent(message);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [processingCampaignId]);

  async function handleCreateCampaign(payload: CreateCampaignPayload) {
    setRequestError(null);
    setProcessingCampaignId(null);
    setRealtimeMessage(null);
    setTimelineEvents([]);
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
          loading={loading || Boolean(processingCampaignId)}
        />

        {requestError && <p className="create-campaign-page__error">{requestError}</p>}

        {processingCampaignId && (
          <div className="create-campaign-page__processing">
            <p>Campaign created. AI generation is running...</p>
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
