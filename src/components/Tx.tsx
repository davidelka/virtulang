import type { ReactNode } from 'react';
import { ar } from '../i18n/ar';
import { he } from '../i18n/he';

type Dict = typeof ar;
/** Picks a text from a dictionary; called once per language. */
export type Sel = (d: Dict) => ReactNode;

/** Arabic text with its Hebrew translation underneath. */
export function Bi({ ar: arText, he: heText }: { ar: ReactNode; he: ReactNode }) {
  return (
    <span className="bi">
      <span className="bi-ar">{arText}</span>
      <span className="bi-he" lang="he">
        {heText}
      </span>
    </span>
  );
}

/** Interface text from the dictionaries: <Tx t={(d) => d.login.title} />. */
export function Tx({ t }: { t: Sel }) {
  return <Bi ar={t(ar)} he={t(he)} />;
}

/** Both languages in one line, for attributes (placeholder, aria-label, confirm). */
export const both = (t: (d: Dict) => string, sep = ' · ') => `${t(ar)}${sep}${t(he)}`;
