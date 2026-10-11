export function Stars({ count, max = 3 }: { count: number; max?: number }) {
  return (
    <span className="stars" aria-label={`${count}/${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < count ? '' : 'off'}>
          ⭐
        </span>
      ))}
    </span>
  );
}
