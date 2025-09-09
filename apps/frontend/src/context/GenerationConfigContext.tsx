import { createContext, use, useMemo, useState, type ReactNode } from 'react';

export const ModelProviderOptions = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
};
export type ModelProvider = keyof typeof ModelProviderOptions;

export const LocaleOptions = {
  'en-EN': 'English',
  'es-ES': 'Spanish',
  'fr-FR': 'French',
};
export type Locale = keyof typeof LocaleOptions;

export interface GenerationConfigContextProps {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  modelProvider: ModelProvider;
  setModelProvider: (provider: ModelProvider) => void;
}

const GenerationConfigContext = createContext<GenerationConfigContextProps | undefined>(undefined);

export const GenerationConfigProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocale] = useState<Locale>('en-EN');
  const [modelProvider, setModelProvider] = useState<ModelProvider>('openai');

  const value = useMemo(() => ({ locale, setLocale, modelProvider, setModelProvider }), [locale, modelProvider]);
  return <GenerationConfigContext value={value}>{children}</GenerationConfigContext>;
};

export const useGenerationConfig = () => {
  const context = use(GenerationConfigContext);
  if (!context) {
    throw new Error('useGenerationConfig must be used within a GenerationConfigProvider');
  }
  return context;
};
