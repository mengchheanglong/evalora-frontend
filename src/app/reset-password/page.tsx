import Link from "next/link";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/button-link";
import { Icon } from "@/components/icons";

const passwordRules = [
  "At least 8 characters",
  "Include uppercase and lowercase letters",
  "Include a number",
  "Include a special character",
];

export default function ResetPasswordPage() {
  return (
    <AuthLayout
      headline={<><span className="block">Create a new</span><span className="block text-primary">covered.</span></>}
      lead="Enter your work email and we'll send you a link to reset your password."
      panelClassName="max-w-[420px]"
    >
      <form className="space-y-[24px] text-center">
        <div className="flex justify-center text-primary-700">
          <Icon name="lock" size={80} />
        </div>
        <div>
          <h1 className="text-[32px] font-bold leading-[38px] tracking-[-0.02em] text-neutral-950">Reset your password</h1>
          <p className="mx-auto mt-[8px] max-w-[340px] text-[15px] leading-[20px] text-neutral-500">Enter and confirm your new password to continue.</p>
        </div>

        <label className="block text-left">
          <span className="text-[13px] font-bold text-neutral-800">New Password</span>
          <span className="relative mt-[8px] block">
            <input className="form-field h-[48px] pr-10 text-[13px]" placeholder="Enter new password" type="password" />
            <Icon className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 cursor-pointer" name="eye" size={16} />
          </span>
        </label>

        <label className="block text-left">
          <span className="text-[13px] font-bold text-neutral-800">Confirm new password</span>
          <span className="relative mt-[8px] block">
            <input className="form-field h-[48px] pr-10 text-[13px]" placeholder="Confirm new password" type="password" />
            <Icon className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 cursor-pointer" name="eye" size={16} />
          </span>
        </label>

        <ul className="space-y-[8px] text-left text-[13px] text-neutral-600">
          {passwordRules.map((rule) => (
            <li className="flex items-center gap-[9px]" key={rule}>
              <span className="inline-flex size-[18px] items-center justify-center rounded-full bg-emerald-600 text-white shrink-0">
                <Icon name="check" size={12} />
              </span>
              <span>{rule}</span>
            </li>
          ))}
        </ul>

        <Button className="h-[48px] w-full rounded-[6px] !text-[14px] font-semibold" type="submit">
          Reset password
        </Button>

        <Link className="block text-[13px] font-bold text-primary-700 hover:underline" href="/login">
          &larr; Back to login
        </Link>
      </form>
    </AuthLayout>
  );
}
