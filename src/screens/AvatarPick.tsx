import { useState } from 'react';
import { Tx } from '../components/Tx';
import { avatars } from '../lib/content';
import { navigate } from '../router';
import { actions, useProgress } from '../store/useProgress';
import type { VoiceGender } from '../types';
import { AvatarView } from '../components/AvatarView';

export function AvatarPick({ onDone }: { onDone?: () => void }) {
  const progress = useProgress();
  const [selected, setSelected] = useState(progress.avatarId ?? avatars[0].id);
  const [addressAs, setAddressAs] = useState<VoiceGender | null>(progress.addressAs);

  function confirm() {
    if (!addressAs) return;
    actions.chooseAvatar(selected, addressAs);
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
      <AddressChoice value={addressAs} onChange={setAddressAs} />
      <button className="btn btn-primary" onClick={confirm} disabled={!addressAs}>
        <Tx t={(d) => d.avatar.confirm} />
      </button>
    </main>
  );
}

/** "Address me as": Hebrew is gendered, so the student chooses instead of the AI guessing. */
export function AddressChoice({ value, onChange }: { value: VoiceGender | null; onChange: (v: VoiceGender) => void }) {
  return (
    <fieldset className="address-choice">
      <legend>
        <Tx t={(d) => d.avatar.addressTitle} />
      </legend>
      <div className="address-options">
        {(['male', 'female'] as const).map((g) => (
          <button key={g} type="button" className={value === g ? 'on' : ''} onClick={() => onChange(g)} aria-pressed={value === g}>
            <Tx t={(d) => d.avatar.address[g]} />
          </button>
        ))}
      </div>
      <small className="muted">
        <Tx t={(d) => d.avatar.addressHint} />
      </small>
    </fieldset>
  );
}
