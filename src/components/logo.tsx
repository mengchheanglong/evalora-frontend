import Link from "next/link";

type EvaloraLogoProps = {
  className?: string;
  href?: string;
  compact?: boolean;
};

export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex size-[64px] shrink-0 items-center justify-center ${className}`}>
      <img
        alt=""
        aria-hidden="true"
        className="h-full w-full object-contain"
        src="/evalora-mark.png"
      />
    </span>
  );
}

export function EvaloraLogo({ className = "", href, compact = false }: EvaloraLogoProps) {
  const content = (
    <>
      <LogoMark className={compact ? "size-10" : ""} />
      {!compact && (
        <span className="leading-tight">
          <span className="block text-2xl font-bold tracking-[-0.01em] text-neutral-950">Evalora</span>
          <span className="block text-base text-neutral-500">AI Candidate Assessment Platform</span>
        </span>
      )}
    </>
  );

  const classes = `inline-flex items-center gap-3 ${className}`;

  if (href) {
    return (
      <Link className={classes} href={href}>
        {content}
      </Link>
    );
  }

  return <div className={classes}>{content}</div>;
}
