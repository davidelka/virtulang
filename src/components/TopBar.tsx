import type { ReactNode } from 'react';
import { ar } from '../i18n/ar';
import { Tx } from './Tx';
import { navigate } from '../router';
import { useProgress } from '../store/useProgress';
import { AvatarView } from './AvatarView';

interface Props {
  title?: ReactNode;
  back?: string;
}

export function TopBar({ title, back }: Props) {
  const p = useProgress();
  return (
    <header className="topbar">
      {back ? (
        <button className="icon-btn" onClick={() => navigate(back)} aria-label={ar.common.back}>
          →
        </button>
      ) : (
        <span className="brand"><Tx t={(d) => d.appName} /></span>
      )}
      {title && <h1 className="topbar-title">{title}</h1>}
      <button className="topbar-me" onClick={() => navigate('/profile')} aria-label={ar.topbar.profile}>
        <span className="chip">{ar.topbar.streak(p.streak)}</span>
        <span className="chip chip-points">⭐ {p.points}</span>
        <AvatarView avatarId={p.avatarId} equipped={p.equipped} size={36} />
      </button>
    </header>
  );
}
