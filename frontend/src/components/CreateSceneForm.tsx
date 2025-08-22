'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { CREATE_SCENE } from '@/graphql/scenes';

type Props = {
  movieId: string;
  onCancel?: () => void;
};

export default function CreateSceneForm({ movieId, onCancel }: Props) {
  // --- Local form state ---
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  // --- Apollo mutation hook ---
  const [createScene, { loading, error }] = useMutation(CREATE_SCENE);

  async function handleSubmit() {
    // --- Minimal client-side validation for quick feedback ---
    if (!name.trim()) {
      alert('Please provide a scene name');
      return;
    }

    await createScene({
      variables: { input: { movieId, name: name.trim(), description: description.trim() || null } },
    });

    // --- Reset ---
    setName('');
    setDescription('');
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      {/* scene name input */}
      <div className="flex flex-col">
        <label className="text-xs text-gray-600">Scene name</label>
        <input
          type="text"
          className="border rounded px-2 py-1 w-64"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Opening shot"
        />
      </div>

      {/* scene description input */}
      <div className="flex flex-col">
        <label className="text-xs text-gray-600">Description (optional)</label>
        <input
            type="text"
            className="border rounded px-2 py-1 w-64"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Establishing shot in New York"
        />
      </div>

      {/* action buttons */}
      <button
        className="text-xs px-3 py-2 rounded bg-black text-white disabled:opacity-60"
        disabled={loading}
        onClick={handleSubmit}
        title="Create scene"
      >
        {loading ? 'Creating...' : 'Save'}
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
