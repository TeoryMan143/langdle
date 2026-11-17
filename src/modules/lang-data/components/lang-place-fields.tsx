'use client';

import { MapPin, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId } from 'react';
import { Button, buttonVariants } from '@/core/components/ui/button';
import { Input } from '@/core/components/ui/input';
import { Label } from '@/core/components/ui/label';
import type { LangLocation, LanguageData } from '@/core/types';

/** The fields as typed: coordinates stay text until the form is saved. */
export type PlaceDraft = {
  family: string;
  genus: string;
  locations: Array<{ lat: string; lng: string }>;
};

export function toPlaceDraft(data: LanguageData): PlaceDraft {
  return {
    family: data.family ?? '',
    genus: data.genus ?? '',
    locations: (data.locations ?? []).map(({ lat, lng }) => ({
      lat: String(lat),
      lng: String(lng),
    })),
  };
}

/**
 * The managed fields of a `PUT` body: an emptied field is `null` (removed),
 * or `undefined` when a location is not a point on the globe.
 */
export function fromPlaceDraft(draft: PlaceDraft) {
  const locations: LangLocation[] = [];

  for (const row of draft.locations) {
    if (!row.lat.trim() && !row.lng.trim()) continue;

    const lat = Number(row.lat);
    const lng = Number(row.lng);
    const valid =
      row.lat.trim() !== '' &&
      row.lng.trim() !== '' &&
      Math.abs(lat) <= 90 &&
      Math.abs(lng) <= 180;

    if (!valid) return undefined;
    locations.push({ lat, lng });
  }

  return {
    family: draft.family.trim() || null,
    genus: draft.genus.trim() || null,
    locations: locations.length ? locations : null,
  };
}

const mapUrl = (lat: string, lng: string) =>
  `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=5/${lat}/${lng}`;

type Props = {
  value: PlaceDraft;
  onChange: (draft: PlaceDraft) => void;
};

/** Family, branch and the points the game measures distances from. */
function LangPlaceFields({ value, onChange }: Props) {
  const t = useTranslations('LangData');
  const id = useId();

  const setLocation = (index: number, field: 'lat' | 'lng', text: string) =>
    onChange({
      ...value,
      locations: value.locations.map((row, i) =>
        i === index ? { ...row, [field]: text } : row,
      ),
    });

  return (
    <section className='mx-auto w-full max-w-3xl rounded-base border-2 border-border bg-background shadow-shadow overflow-hidden'>
      <h3 className='text-center text-2xl font-heading py-3 bg-secondary-background border-b-2 border-border'>
        {t('place')}
      </h3>
      <div className='space-y-4 p-4'>
        <p className='text-sm text-foreground/80'>{t('placeIntro')}</p>

        <div className='grid gap-4 sm:grid-cols-2'>
          <div className='space-y-1.5'>
            <Label htmlFor={`${id}-family`}>{t('family')}</Label>
            <Input
              id={`${id}-family`}
              value={value.family}
              placeholder='Indo-European'
              onChange={e => onChange({ ...value, family: e.target.value })}
            />
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor={`${id}-genus`}>{t('genus')}</Label>
            <Input
              id={`${id}-genus`}
              value={value.genus}
              placeholder='Romance'
              onChange={e => onChange({ ...value, genus: e.target.value })}
            />
          </div>
        </div>

        <div className='space-y-2'>
          <p className='font-heading'>{t('locations')}</p>
          {value.locations.length === 0 && (
            <p className='text-sm text-foreground/70'>{t('noLocations')}</p>
          )}
          <ul className='space-y-2'>
            {value.locations.map((row, index) => (
              <li key={index} className='flex flex-wrap items-end gap-2'>
                <div className='w-32 space-y-1'>
                  <Label htmlFor={`${id}-lat-${index}`}>{t('latitude')}</Label>
                  <Input
                    id={`${id}-lat-${index}`}
                    type='number'
                    step='any'
                    min={-90}
                    max={90}
                    value={row.lat}
                    onChange={e => setLocation(index, 'lat', e.target.value)}
                  />
                </div>
                <div className='w-32 space-y-1'>
                  <Label htmlFor={`${id}-lng-${index}`}>{t('longitude')}</Label>
                  <Input
                    id={`${id}-lng-${index}`}
                    type='number'
                    step='any'
                    min={-180}
                    max={180}
                    value={row.lng}
                    onChange={e => setLocation(index, 'lng', e.target.value)}
                  />
                </div>
                {row.lat && row.lng && (
                  <a
                    className={buttonVariants({
                      variant: 'neutral',
                      size: 'icon',
                    })}
                    href={mapUrl(row.lat, row.lng)}
                    target='_blank'
                    rel='noopener noreferrer'
                    title={t('viewOnMap')}
                    aria-label={t('viewOnMap')}
                  >
                    <MapPin />
                  </a>
                )}
                <Button
                  variant='neutral'
                  size='icon'
                  title={t('removeLocation')}
                  aria-label={t('removeLocation')}
                  onClick={() =>
                    onChange({
                      ...value,
                      locations: value.locations.filter((_, i) => i !== index),
                    })
                  }
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
          <Button
            variant='neutral'
            size='sm'
            onClick={() =>
              onChange({
                ...value,
                locations: [...value.locations, { lat: '', lng: '' }],
              })
            }
          >
            <Plus /> {t('addLocation')}
          </Button>
        </div>
      </div>
    </section>
  );
}

export default LangPlaceFields;
