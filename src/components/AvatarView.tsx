import type { Progress } from '../types';
import { getAvatar, getShopItem } from '../lib/content';

interface Props {
  avatarId: string | null;
  equipped?: Progress['equipped'];
  size?: number;
}

export function AvatarView({ avatarId, equipped = {}, size = 48 }: Props) {
  const bg = getShopItem(equipped.bg)?.value;
  const frame = getShopItem(equipped.frame)?.value;
  const badge = getShopItem(equipped.badge)?.value;
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.58,
        background: bg,
        borderColor: frame,
        borderWidth: frame ? Math.max(3, size / 16) : undefined,
      }}
      aria-hidden
    >
      {getAvatar(avatarId).emoji}
      {badge && (
        <span className="avatar-badge" style={{ fontSize: size * 0.3 }}>
          {badge}
        </span>
      )}
    </span>
  );
}
