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

  const handleSelect = (newLocale: string) => {
    router.replace({ pathname }, { locale: newLocale });
  };

  return (
    <Select onValueChange={handleSelect} defaultValue={locale}>
      <SelectTrigger className={cn('w-[250px]', className)}>
        <Language /> <SelectValue placeholder='Select a language' />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {routing.locales.map(loc => (
            <SelectItem key={loc} value={loc}>
              {localeNames[loc]} ({ex(loc)})
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export default LocaleSelector;
