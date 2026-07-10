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
      panelClassName="max-w-[400px]"
    >
      <form className="mx-auto w-full space-y-[13px] text-center">
        <Icon className="mx-auto text-blue-700" name="lock" size={72} />
        <div>
          <h1 className="mt-[20px] text-[25px] font-black leading-[30px] tracking-[-0.01em]">Reset your password</h1>
          <p className="mx-auto mt-[18px] max-w-[290px] text-[14px] leading-[17px] text-neutral-600">Enter and confirm your new password to continue.</p>
        </div>

        <label className="block pt-[18px] text-left">
          <span className="text-[14px] font-bold leading-[17px]">New Password</span>
          <span className="relative mt-[9px] block">
            <input className="form-field h-[44px] rounded-[8px] pr-10" placeholder="Enter new password" type="password" />
            <Icon className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600" name="eye" size={16} />
          </span>
        </label>

        <label className="block text-left">
          <span className="text-[14px] font-bold leading-[17px]">Confirm new password</span>
          <span className="relative mt-[9px] block">
            <input className="form-field h-[44px] rounded-[8px] pr-10" placeholder="Confirm new password" type="password" />
            <Icon className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600" name="eye" size={16} />
          </span>
        </label>

        <ul className="space-y-[8px] pt-[1px] text-left text-[11px] leading-[13px] text-neutral-600">
          {passwordRules.map((rule) => (
            <li className="flex items-center gap-2" key={rule}>
              <span className="inline-flex size-[14px] shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
                <Icon name="check" size={10} />
              </span>
              {rule}
            </li>
          ))}
        </ul>

        <Button className="mt-[3px] h-[44px] w-full rounded-[8px] !text-[12px] font-medium shadow-none" type="submit">
          Reset password
        </Button>

        <Link className="block pt-[2px] text-center text-[12px] font-bold text-blue-700" href="/login">
          &larr; Back to login
        </Link>
      </form>
    </AuthLayout>
  );
}
