'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { CREATE_TRACK } from '@/graphql/tracks';

type Props = {
  sceneId: string;
  onCancel: () => void;
  onCreated: () => void;
};

export default function CreateTrackForm({ sceneId, onCancel, onCreated }: Props) {
  // --- Local form state ---
  const [start, setStart] = useState<number>(0);
  const [end, setEnd] = useState<number>(0);

  // --- Create track mutation (no song association here) ---
  const [createTrack, { loading, error }] = useMutation(CREATE_TRACK);

  async function handleSubmit() {
    // --- Minimal client-side validation for faster feedback ---
    if (Number.isNaN(start) || Number.isNaN(end)) {
      alert('Please provide numeric values for start and end');
      return;
    }
    if (start < 0 || end <= start) {
      alert('Invalid time range: start must be >= 0 and end > start');
      return;
    }

    try {
      await createTrack({
        variables: {
          input: { sceneId, startTime: start, endTime: end },
        },
      });

      // --- Reset form ---
      setStart(0);
      setEnd(0);

      // --- Notify parent to close the form ---
      onCreated();
    } catch (e) {
      // NOTE: Swallow the rejection so it doesn't log as "Uncaught".
      // The hook's `error` state already renders the message in the UI.
      // Optionally we could set a local toast here.
      // As a future improvement we should have a better error handling.
      console.debug('Create track failed', e);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      {/* start time input */}
      <div className="flex flex-col">
        <label className="text-xs text-gray-600">Start (s)</label>
        <input
          type="number"
          className="border rounded px-2 py-1 w-28"
          value={start}
          onChange={(e) => setStart(Number(e.target.value))}
        />
      </div>

      {/* end time input */}
      <div className="flex flex-col">
        <label className="text-xs text-gray-600">End (s)</label>
        <input
          type="number"
          className="border rounded px-2 py-1 w-28"
          value={end}
          onChange={(e) => setEnd(Number(e.target.value))}
        />
      </div>

      {/* submit button */}
      <button
        className="text-xs px-3 py-2 rounded bg-black text-white disabled:opacity-60"
        disabled={loading}
        onClick={handleSubmit}
        title="Create track"
      >
        {loading ? 'Creating...' : 'Create track'}
      </button>

      <button
        className="text-xs px-3 py-2 rounded border"
        onClick={onCancel}
        type="button"
      >
        Cancel
      </button>

      {/* error display */}
      {error && <div className="text-xs text-red-600">{error.message}</div>}
    </div>
  );
}
