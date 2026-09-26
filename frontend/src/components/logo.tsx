export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="enp" x1="0" y1="0" x2="48" y2="48">
          <stop stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--accent-2)" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#enp)" opacity="0.16" />
      <rect x="1" y="1" width="46" height="46" rx="13" stroke="url(#enp)" strokeOpacity="0.5" />
      <path d="M26.5 9 14 27h8.5L21 39l13-18.5h-8.7L26.5 9Z" fill="url(#enp)" />
    </svg>
  );
}
