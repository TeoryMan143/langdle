import { ClassValue } from 'clsx';
import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@/core/lib/utils';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { localeNames } from '@/i18n/utils';
import Language from '../icons/language';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

function LocaleSelector({ className }: { className?: ClassValue }) {
  const locale = useLocale();
  const ex = useTranslations('Exonyms');
  const router = useRouter();
  const pathname = usePathname();

  const items = routing.locales.map(loc => ({
    value: loc,
    label: `${localeNames[loc]}${locale !== loc ? ` (${ex(loc)})` : ''}`,
  }));

  const handleSelect = (newLocale: string | null) => {
    if (!newLocale) {
      return;
    }

    router.replace({ pathname }, { locale: newLocale });
  };

  return (
    <Select items={items} onValueChange={handleSelect} defaultValue={locale}>
      <SelectTrigger className={cn('w-62.5', className)}>
        <Language /> <SelectValue placeholder='Select a language' />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {items.map(({ value, label }) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export default LocaleSelector;
