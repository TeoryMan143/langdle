import { useTranslations } from 'next-intl';
import { Badge } from '@/core/components/ui/badge';
import { cn } from '@/core/lib/utils';
import type { ChangeRequestState } from '../types';

function ChangeRequestStateBadge({ state }: { state: ChangeRequestState }) {
  const t = useTranslations('ChangeRequests.state');

  return (
    <Badge
      className={cn(
        state === 'pending' && 'bg-amber-100 text-amber-950',
        state === 'accepted' && 'bg-emerald-100 text-emerald-950',
        state === 'rejected' && 'bg-red-100 text-red-950',
      )}
    >
      {t(state)}
    </Badge>
  );
}

export default ChangeRequestStateBadge;
