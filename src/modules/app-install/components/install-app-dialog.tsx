'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Button, buttonVariants } from '@/core/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/core/components/ui/dialog';
import {
  getAndroidAppUrl,
  isPromptSnoozed,
  snoozePrompt,
  useAndroidPhone,
} from '../hooks/use-app-install';

/** Opens once on an Android phone until the user dismisses it or downloads. */
function InstallAppDialog() {
  const t = useTranslations('InstallApp');
  const androidPhone = useAndroidPhone();
  const appUrl = getAndroidAppUrl();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (androidPhone && appUrl && !isPromptSnoozed()) {
      setOpen(true);
    }
  }, [androidPhone, appUrl]);

  if (!appUrl) {
    return null;
  }

  function dismiss() {
    snoozePrompt();
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={next => (next ? setOpen(true) : dismiss())}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('body')}</DialogDescription>
        </DialogHeader>
        <p className='text-sm text-soft-det'>{t('allowInstalls')}</p>
        <DialogFooter>
          <Button variant='neutral' onClick={dismiss}>
            {t('later')}
          </Button>
          <a className={buttonVariants()} href={appUrl} onClick={dismiss}>
            {t('download')}
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default InstallAppDialog;
