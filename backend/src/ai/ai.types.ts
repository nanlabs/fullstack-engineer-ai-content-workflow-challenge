export type GeneratedPiece = {
  type: string;
  name?: string;
};

export type ModelCandidate = {
  provider: string;
  model: string;
  client: unknown;
};

export type AiErrorDetail = {
  provider: string;
  model: string;
  message: string;
};

export type ProviderModel = {
  id: string;
  label: string;
};
