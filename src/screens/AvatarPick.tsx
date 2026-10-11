import { useState } from 'react';
import { Tx } from '../components/Tx';
import { avatars } from '../lib/content';
import { navigate } from '../router';
import { actions, useProgress } from '../store/useProgress';
import { AvatarView } from '../components/AvatarView';

export function AvatarPick({ onDone }: { onDone?: () => void }) {
  const progress = useProgress();
  const [selected, setSelected] = useState(progress.avatarId ?? avatars[0].id);

  function confirm() {
    actions.chooseAvatar(selected);
    if (onDone) onDone();
    else navigate('/', { replace: true });
  }

  return (
    <main className="screen center">
      <h1><Tx t={(d) => d.avatar.title} /></h1>
      <p className="muted"><Tx t={(d) => d.avatar.subtitle} /></p>
      <div className="avatar-grid">
        {avatars.map((a) => (
          <button
            key={a.id}
            className={`avatar-option ${selected === a.id ? 'selected' : ''}`}
            onClick={() => setSelected(a.id)}
            aria-pressed={selected === a.id}
          >
            <AvatarView avatarId={a.id} size={84} />
          </button>
        ))}
      </div>
      <button className="btn btn-primary" onClick={confirm}>
        <Tx t={(d) => d.avatar.confirm} />
      </button>
    </main>
  );
}
