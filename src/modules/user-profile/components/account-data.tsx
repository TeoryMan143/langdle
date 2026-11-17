import { ShieldCheck } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { Badge } from '@/core/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/core/components/ui/card';
import type { UserDTO } from '@/modules/auth/types';
import ProfileLanguages from './profile-languages';

type Props = {
  user: UserDTO;
  /** The account's buttons (sign out, delete), shown in the card's footer. */
  actions?: React.ReactNode;
};

async function AccountData({ user, actions }: Props) {
  const t = await getTranslations('AuthPage');
  const locale = await getLocale();
  const country =
    new Intl.DisplayNames([locale], { type: 'region' }).of(user.country) ??
    user.country;

  return (
    <Card>
      <CardHeader className='border-b-2 border-border pb-(--card-spacing)'>
        <CardTitle className='flex items-center gap-3 text-3xl'>
          <img
            className='h-7 aspect-3/2 rounded-base border-2 border-border object-cover'
            alt={country}
            title={country}
            src={`https://purecatamphetamine.github.io/country-flag-icons/3x2/${user.country}.svg`}
          />
          <span className='min-w-0 truncate'>{user.nickname}</span>
          {user.admin && (
            // The mobile app marks administrators the same way, icon only.
            <Badge className='bg-main px-1.5 py-1' aria-hidden>
              <ShieldCheck />
            </Badge>
          )}
        </CardTitle>
        <CardDescription className='text-soft-det'>
          {user.email} · {t('country')}: {country}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ProfileLanguages nativeId={user.nativeLanguage} fluent={user.fluent} />
      </CardContent>
      {actions && (
        <CardFooter className='border-t-2 border-border pt-(--card-spacing) flex-wrap justify-end gap-3'>
          {actions}
        </CardFooter>
      )}
    </Card>
  );
}

export default AccountData;
