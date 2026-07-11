import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "dark" | "outline" | "ghost";

const variants: Record<Variant, string> = {
  primary: "bg-primary !text-white hover:bg-primary-600",
  secondary: "bg-neutral-200 text-neutral-950 hover:bg-neutral-300",
  dark: "bg-navy !text-white hover:bg-navy-700",
  outline: "border border-neutral-300 bg-white text-neutral-950 hover:border-neutral-500",
  ghost: "text-neutral-700 hover:bg-neutral-100",
};

const baseClasses =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-card px-5 py-2.5 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
  variant?: Variant;
};

export function ButtonLink({ className = "", href, children, variant = "primary", ...props }: ButtonLinkProps) {
  return (
    <Link className={`${baseClasses} ${variants[variant]} ${className}`} href={href} {...props}>
      {children}
    </Link>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: Variant;
};

export function Button({ className = "", children, variant = "primary", type = "button", ...props }: ButtonProps) {
  return (
    <button className={`${baseClasses} ${variants[variant]} ${className}`} type={type} {...props}>
      {children}
    </button>
  );
}
