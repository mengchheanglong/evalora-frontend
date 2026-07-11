import Link from "next/link";

type EvaloraLogoProps = {
  className?: string;
  href?: string;
  compact?: boolean;
  size?: "default" | "auth";
};

export function LogoMark({ className = "" }: { className?: string }) {
  const sizeClass = className || "size-[48px]";
  return (
    <span className={`inline-flex shrink-0 items-center justify-center ${sizeClass}`}>
      <img
        alt=""
        aria-hidden="true"
        className="h-full w-full object-contain"
        src="/evalora-mark.png"
      />
    </span>
  );
}

export function EvaloraLogo({ className = "", href, compact = false, size = "default" }: EvaloraLogoProps) {
  const isAuth = size === "auth";
  const content = (
    <>
      <LogoMark className={compact ? "size-[36px]" : isAuth ? "size-[48px]" : ""} />
      {!compact && (
        <span className="leading-tight">
          <span className={`block font-bold tracking-[-0.02em] text-neutral-950 ${isAuth ? "text-[18px] leading-none" : "text-[20px] leading-none"}`}>Evalora</span>
          <span className={`block text-neutral-400 font-medium mt-0.5 ${isAuth ? "text-[11px] leading-tight" : "text-[12px] leading-tight"}`}>AI Candidate</span>
          <span className={`block text-neutral-400 font-medium ${isAuth ? "text-[11px] leading-tight" : "text-[12px] leading-tight"}`}>Assessment Platform</span>
        </span>
      )}
    </>
  );

  const classes = `inline-flex items-center gap-[10px] ${className}`;

  if (href) {
    return (
      <Link className={classes} href={href}>
        {content}
      </Link>
    );
  }

  return <div className={classes}>{content}</div>;
}
