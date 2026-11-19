'use client';

import type { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import Loading from '@/core/components/icons/loading';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/core/components/ui/dialog';
import type { ChangeRequestPayload } from '../types';

export type ChangeRequestDialogHandle =
  DialogPrimitive.Handle<ChangeRequestPayload>;

// The form libraries (react-hook-form, zod, the select) only load once a chip
// is clicked: most visitors only read the atlas.
const ChangeRequestForm = dynamic(() => import('./change-request-form'), {
  loading: () => (
    <div className='flex justify-center py-6'>
      <Loading className='size-6' />
    </div>
  ),
});

/**
 * One dialog for every feature chip of the atlas. The chips are detached
 * `DialogTrigger`s sharing `handle` and passing a `ChangeRequestPayload`, so
 * the page holds a single dialog and form instead of one per chip.
 */
function ChangeRequestDialog({
  handle,
}: {
  handle: ChangeRequestDialogHandle;
}) {
  const formT = useTranslations('Features.changeRequest');

  return (
    <Dialog handle={handle}>
      {({ payload }) => {
        const request = payload as ChangeRequestPayload | undefined;

        return (
          request && (
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{formT('title')}</DialogTitle>
                <DialogDescription>{formT('description')}</DialogDescription>
              </DialogHeader>
              {/* Keyed so every chip starts from a fresh form. */}
              <ChangeRequestForm
                key={`${request.lang}:${request.feature}`}
                {...request}
                onDone={() => handle.close()}
              />
            </DialogContent>
          )
        );
      }}
    </Dialog>
  );
}

export default ChangeRequestDialog;
