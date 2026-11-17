/**
 * Gives every language of the catalogue a flag in the bucket
 * (`flags/<code>.webp`, the key the clients look up after `public/flags`).
 *
 * The flag of each language is chosen by `build-languages.ts` (`meta.flag`):
 * a community or regional flag when the language has one, else its country's.
 * Country and regional flags come from the flag-icons set (MIT), the others
 * from Wikimedia Commons, used only when Commons lists them as free. Each one
 * is rendered the way `core/lib/flags.ts` normalizes uploads: a 455×304 WebP.
 *
 * Languages with a flag in `public/flags`, or already in the bucket (a flag
 * sent with a language request), are left alone unless `--force`.
 *
 *   node --env-file=.env scripts/wals/upload-flags.ts --dry-run
 *   node --env-file=.env scripts/wals/upload-flags.ts [--force] [--only=arz,ca]
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { createClient } from 'redis';
import sharp from 'sharp';

const FLAG_WIDTH = 455;
const FLAG_HEIGHT = 304;
const FLAG_ICONS = 'https://cdn.jsdelivr.net/npm/flag-icons@7.2.3/flags/4x3';
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const USER_AGENT = 'wals-language-import/1.0 (offline data build)';
const BATCH = 20;

const ROOT = join(import.meta.dirname, '..', '..');
const CACHE = join(import.meta.dirname, '.cache', 'flags');
const PREVIEW = join(import.meta.dirname, '.cache', 'flags-preview');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');
const ONLY = args
  .find(arg => arg.startsWith('--only='))
  ?.split('=')[1]
  .split(',');

/** Commons licences a flag may have to be published here. */
// "Copyrighted free use": the holder allows any use (the Australian
// Aboriginal flag, free since the Commonwealth bought its copyright in 2022).
const FREE_LICENCE = /public domain|^pd|cc0|cc by|copyrighted free use/i;

type Entry = { id: string; codes: string[]; meta: { flag?: string } };

const dataset = JSON.parse(
  readFileSync(join(import.meta.dirname, 'languages.json'), 'utf8'),
) as { languages: Entry[]; existing: Entry[] };

/** The flag of every code a language goes by (`cat` is Catalan too). */
const flagByCode = new Map<string, string>();
for (const entry of [...dataset.existing, ...dataset.languages]) {
  for (const code of entry.codes) {
    if (entry.meta.flag && !flagByCode.has(code)) {
      flagByCode.set(code, entry.meta.flag);
    }
  }
}

const shipped = new Set(
  readdirSync(join(ROOT, 'public/flags')).map(file =>
    file.replace(/\.webp$/, ''),
  ),
);

/* -------------------------------------------------------------------------- */
/*                                   Sources                                  */
/* -------------------------------------------------------------------------- */

async function download(url: string) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });

  if (!res.ok) throw new Error(`${url} answered ${res.status}`);

  return new Uint8Array(await res.arrayBuffer());
}

/** File URL and licence of Commons files, 50 per request. */
async function commonsInfo(files: string[]) {
  const info = new Map<string, { url: string; licence: string }>();

  for (let i = 0; i < files.length; i += 50) {
    const url = new URL(COMMONS_API);
    url.search = new URLSearchParams({
      action: 'query',
      format: 'json',
      prop: 'imageinfo',
      iiprop: 'url|extmetadata',
      titles: files
        .slice(i, i + 50)
        .map(file => `File:${file}`)
        .join('|'),
    }).toString();

    const body = JSON.parse(new TextDecoder().decode(await download(url.href)));
    const normalized = new Map<string, string>(
      (body.query.normalized ?? []).map((n: { from: string; to: string }) => [
        n.to,
        n.from,
      ]),
    );

    for (const page of Object.values(body.query.pages) as Array<{
      title: string;
      imageinfo?: Array<{
        url: string;
        extmetadata?: { LicenseShortName?: { value: string } };
      }>;
    }>) {
      const [image] = page.imageinfo ?? [];
      const title = normalized.get(page.title) ?? page.title;

      if (image) {
        info.set(title.replace(/^File:/, ''), {
          url: image.url,
          licence: image.extmetadata?.LicenseShortName?.value ?? 'unknown',
        });
      }
    }
  }

  return info;
}

/**
 * Flags plain enough to draw, for communities whose flag Commons only has
 * inside a badge or coat of arms.
 */
const DRAWN: Record<string, string> = {
  // The Sorbian tricolour: blue, red, white.
  sorbian:
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400">' +
    '<rect width="600" height="400" fill="#ffffff"/>' +
    '<rect width="600" height="267" fill="#d52b1e"/>' +
    '<rect width="600" height="133" fill="#0d4ca1"/></svg>',
};

/** The SVG behind a flag spec, cached on disk. */
async function svgOf(spec: string, commons: Map<string, { url: string }>) {
  if (spec.startsWith('drawn:')) {
    const svg = DRAWN[spec.slice('drawn:'.length)];
    if (!svg) throw new Error(`${spec} is not drawn`);
    return new TextEncoder().encode(svg);
  }

  const file = join(CACHE, `${spec.replace(/[^\w.-]+/g, '_')}.svg`);

  if (existsSync(file)) return new Uint8Array(readFileSync(file));

  const [kind, name] = [
    spec.slice(0, spec.indexOf(':')),
    spec.slice(spec.indexOf(':') + 1),
  ];
  const url =
    kind === 'commons'
      ? commons.get(name)?.url
      : `${FLAG_ICONS}/${name.toLowerCase()}.svg`;

  if (!url) throw new Error(`${spec} is not on Commons`);

  const svg = await download(url);
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(file, svg);

  return svg;
}

/** Rendered sharp enough for 455 px, then cropped like `normalizeFlag`. */
async function render(svg: Uint8Array) {
  const { width = FLAG_WIDTH } = await sharp(svg).metadata();
  const density = Math.min(600, Math.max(72, (72 * 2 * FLAG_WIDTH) / width));

  return sharp(svg, { density })
    .resize(FLAG_WIDTH, FLAG_HEIGHT, { fit: 'cover' })
    .webp({ quality: 85 })
    .toBuffer();
}

/* -------------------------------------------------------------------------- */
/*                                     Run                                    */
/* -------------------------------------------------------------------------- */

const { REDIS_USER, REDIS_PASSWORD, REDIS_HOST, REDIS_PORT } = process.env;
const redis = createClient({
  username: REDIS_USER,
  password: REDIS_PASSWORD,
  socket: { host: REDIS_HOST, port: Number(REDIS_PORT) },
});

await redis.connect();

const ids: string[] = [];
for await (const key of redis.scanIterator({ MATCH: 'lang:*', COUNT: 1000 })) {
  ids.push(key.slice('lang:'.length));
}
await redis.quit();

const wanted = ids
  .filter(id => !ONLY || ONLY.includes(id))
  .filter(id => !shipped.has(id))
  .sort();
const noFlag = wanted.filter(id => !flagByCode.has(id));
const specs = [
  ...new Set(wanted.map(id => flagByCode.get(id)).filter(Boolean)),
];

const commonsFiles = specs
  .filter((spec): spec is string => Boolean(spec?.startsWith('commons:')))
  .map(spec => spec.slice('commons:'.length));
const commons = await commonsInfo(commonsFiles);

const rendered = new Map<string, Buffer>();
const refused: string[] = [];

for (const spec of specs as string[]) {
  if (spec.startsWith('commons:')) {
    const file = spec.slice('commons:'.length);
    const info = commons.get(file);

    if (!info) {
      refused.push(`${spec} (not found)`);
      continue;
    }
    if (!FREE_LICENCE.test(info.licence)) {
      refused.push(`${spec} (${info.licence})`);
      continue;
    }
  }

  try {
    const flag = await render(await svgOf(spec, commons));
    rendered.set(spec, flag);
    mkdirSync(PREVIEW, { recursive: true });
    writeFileSync(
      join(PREVIEW, `${spec.replace(/[^\w.-]+/g, '_')}.webp`),
      flag,
    );
  } catch (e) {
    refused.push(`${spec} (${(e as Error).message})`);
  }
}

const storage = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
  },
});

async function inBucket(key: string) {
  try {
    await storage.send(
      new HeadObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key }),
    );
    return true;
  } catch {
    return false;
  }
}

const uploaded: string[] = [];
const kept: string[] = [];
const failed: string[] = [];

const ready = wanted.filter(id => rendered.has(flagByCode.get(id) ?? ''));

for (let i = 0; i < ready.length; i += BATCH) {
  await Promise.all(
    ready.slice(i, i + BATCH).map(async id => {
      const key = `flags/${id}.webp`;

      if (!FORCE && (await inBucket(key))) {
        kept.push(id);
        return;
      }

      if (DRY_RUN) {
        uploaded.push(id);
        return;
      }

      try {
        await storage.send(
          new PutObjectCommand({
            Bucket: process.env.R2_BUCKET,
            Key: key,
            Body: rendered.get(flagByCode.get(id) as string),
            ContentType: 'image/webp',
            CacheControl: 'public, max-age=86400',
          }),
        );
        uploaded.push(id);
      } catch (e) {
        failed.push(`${id} (${(e as Error).message})`);
      }
    }),
  );
}

const commonsUsed = [...commons]
  .filter(([file]) => specs.includes(`commons:${file}`))
  .map(([file, { licence }]) => `${file}: ${licence}`);

console.log(
  [
    `${DRY_RUN ? '[dry run] would have uploaded' : 'uploaded'} ${uploaded.length} flags (${rendered.size} distinct) for ${wanted.length} languages without one in public/flags`,
    `kept ${kept.length} already in the bucket${kept.length ? ` (--force replaces them): ${kept.join(', ')}` : ''}`,
    `no flag chosen for ${noFlag.length}: ${noFlag.join(', ')}`,
    `flags refused: ${refused.join('; ') || 'none'}`,
    `failed: ${failed.join('; ') || 'none'}`,
    `Commons licences:\n  ${commonsUsed.join('\n  ')}`,
    `previews: ${PREVIEW}`,
  ].join('\n'),
);
