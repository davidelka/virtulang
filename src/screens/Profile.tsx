import { useState } from 'react';
import { Bi, Tx, both } from '../components/Tx';
import { shopItems } from '../lib/content';
import { navigate } from '../router';
import { actions, useProgress } from '../store/useProgress';
import { TopBar } from '../components/TopBar';
import { AvatarView } from '../components/AvatarView';
import { AddressChoice, AvatarPick } from './AvatarPick';
import { setSpeechSpeed, speakHebrew } from '../lib/speech';

const SPEED_SAMPLE = { female: 'שלום! ככה אני מדברת. זה מתאים לכם?', male: 'שלום! ככה אני מדבר. זה מתאים לכם?' };

export function Profile() {
  const p = useProgress();
  const [picking, setPicking] = useState(false);
  if (picking) return <AvatarPick onDone={() => setPicking(false)} />;

  const totalStars = Object.values(p.stars).reduce((s, n) => s + n, 0);

  return (
    <>
      <TopBar back="/" title={<Tx t={(d) => d.profile.title} />} />
      <main className="screen">
        <div className="profile-head">
          <AvatarView avatarId={p.avatarId} equipped={p.equipped} size={110} />
          <h1>{p.name}</h1>
          <span className="muted"><Tx t={(d) => d.profile.classCode(p.classCode)} /></span>
        </div>

        <div className="stats">
          <div className="stat"><b dir="ltr">{p.level}</b><small><Tx t={(d) => d.profile.level} /></small></div>
          <div className="stat"><b>{p.points}</b><small><Tx t={(d) => d.profile.points} /></small></div>
          <div className="stat"><b>{p.streak} 🔥</b><small><Tx t={(d) => d.profile.streak} /></small></div>
          <div className="stat"><b>{totalStars} ⭐</b><small><Tx t={(d) => d.profile.stars} /></small></div>
        </div>

        <h2><Tx t={(d) => d.profile.shop} /></h2>
        <p className="muted"><Tx t={(d) => d.profile.shopHint} /></p>
        <div className="shop-grid">
          {shopItems.map((item) => {
            const unlocked = p.points >= item.unlockAt;
            const on = p.equipped[item.slot] === item.id;
            const preview =
              item.slot === 'badge' ? { children: item.value } :
              item.slot === 'bg' ? { style: { background: item.value } } :
              { style: { border: `5px solid ${item.value}` } };
            return (
              <div key={item.id} className={`shop-item ${unlocked ? '' : 'locked'} ${on ? 'on' : ''}`}>
                <span className="shop-preview" {...preview} />
                <b>
                  <Bi ar={item.nameAr} he={item.nameHe} />
                </b>
                {unlocked ? (
                  <button className={`btn ${on ? 'btn-secondary' : 'btn-primary'}`} onClick={() => actions.toggleItem(item.id)}>
                    <Tx t={(d) => (on ? d.profile.equipped : d.profile.equip)} />
                  </button>
                ) : (
                  <small className="muted"><Tx t={(d) => d.profile.unlockAt(item.unlockAt)} /></small>
                )}
              </div>
            );
          })}
        </div>

        <AddressChoice value={p.addressAs} onChange={actions.setAddressAs} />

        <fieldset className="address-choice">
          <legend>
            <Tx t={(d) => d.profile.speechSpeed} />
          </legend>
          <div className="address-options">
            {(['slow', 'normal', 'fast'] as const).map((s) => (
              <button
                key={s}
                type="button"
                className={p.speechSpeed === s ? 'on' : ''}
                aria-pressed={p.speechSpeed === s}
                onClick={() => {
                  actions.setSpeechSpeed(s);
                  setSpeechSpeed(s); // apply before the preview plays
                  speakHebrew(SPEED_SAMPLE[p.voice], p.voice);
                }}
              >
                <Tx t={(d) => d.profile.speed[s]} />
              </button>
            ))}
          </div>
          <small className="muted">
            <Tx t={(d) => d.profile.speedHint} />
          </small>
        </fieldset>

        <div className="profile-actions">
          <button className="btn btn-secondary" onClick={() => setPicking(true)}><Tx t={(d) => d.profile.changeAvatar} /></button>
          <button
            className="btn"
            onClick={() => {
              if (confirm(both((d) => d.profile.logoutConfirm, '\n\n'))) {
                actions.logout();
                navigate('/', { replace: true });
              }
            }}
          >
            <Tx t={(d) => d.profile.logout} />
          </button>
        </div>
      </main>
    </>
  );
}
