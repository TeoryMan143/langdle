import { NO_INDEX } from '@/core/lib/seo';

// The data area is the editors' and admins' workspace; only the public atlas
// (`data/public`) opts back into the index.
export const metadata = NO_INDEX;

export default function DataLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
