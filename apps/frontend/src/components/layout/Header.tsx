import {
  useGenerationConfig,
  LocaleOptions,
  ModelProviderOptions,
  type ModelProvider,
  type Locale,
} from '@/context/GenerationConfigContext';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '../ui/select';

function Header() {
  const config = useGenerationConfig();

  return (
    <header className="w-full border-b border-gray-700 p-4 flex flex-row items-center justify-between">
      <h1 className="text-white text-2xl! font-bold mr-40">ACME GLOBAL MEDIA</h1>

      <div className="flex flex-row items-center justify-end gap-4 text-white">
        <div>
          <Label htmlFor="locale" className="mb-2">
            Language generation:
          </Label>
          <Select value={config.locale} onValueChange={(value) => config.setLocale(value as Locale)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select a language" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Language</SelectLabel>
                {Object.entries(LocaleOptions).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="locale" className="mb-2">
            Model Provider:
          </Label>
          <Select
            value={config.modelProvider}
            onValueChange={(value) => config.setModelProvider(value as ModelProvider)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select a model provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Model Provider</SelectLabel>
                {Object.entries(ModelProviderOptions).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
    </header>
  );
}

export default Header;
