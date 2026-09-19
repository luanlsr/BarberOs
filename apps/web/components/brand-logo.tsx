import Image from 'next/image';

type BrandLogoProps = Readonly<{
  compact?: boolean;
}>;

export function BrandLogo({ compact = false }: BrandLogoProps) {
  return (
    <span className={`brand-logo${compact ? ' brand-logo-compact' : ''}`} aria-label="BarberOS">
      <Image src="/brand-mark.svg" alt="" width={32} height={32} priority />
      {!compact ? <span className="brand-logo-name">BarberOS</span> : null}
    </span>
  );
}
