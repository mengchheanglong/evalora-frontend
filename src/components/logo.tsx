import Link from "next/link";

type EvaloraLogoProps = {
  className?: string;
  href?: string;
  compact?: boolean;
  size?: "default" | "auth";
};

export function LogoMark({ className = "" }: { className?: string }) {
  const sizeClass = className || "size-[64px]";
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
      <LogoMark className={compact ? "size-10" : isAuth ? "size-[42px]" : ""} />
      {!compact && (
        <span className="leading-tight">
          <span className={`block font-bold tracking-[-0.01em] text-neutral-950 ${isAuth ? "text-[14px] leading-[17px]" : "text-2xl"}`}>Evalora</span>
          <span className={`block text-neutral-500 ${isAuth ? "text-[11px] leading-[13px]" : "text-base"}`}>AI Candidate Assessment Platform</span>
        </span>
      )}
    </>
  );

  const classes = `inline-flex items-center ${isAuth ? "gap-[7px]" : "gap-3"} ${className}`;

  if (href) {
    return (
      <Link className={classes} href={href}>
        {content}
      </Link>
    );
  }

  return <div className={classes}>{content}</div>;
}
