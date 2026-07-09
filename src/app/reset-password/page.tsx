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
    <AuthLayout lead="Enter your work email and we'll send you a link to reset your password." panelClassName="max-w-[455px] pt-[141px] lg:ml-[155px]">
      <form className="space-y-[17px] text-center">
        <Icon className="mx-auto text-blue-700" name="lock" size={104} />
        <div>
          <h1 className="mt-[26px] text-[36px] font-black leading-[43px] tracking-normal">Reset your password</h1>
          <p className="mx-auto mt-[28px] max-w-[420px] text-[22px] leading-[24px] text-neutral-600">Enter and confirm your new password to continue.</p>
        </div>

        <label className="block pt-[47px] text-left">
          <span className="sr-only">New password</span>
          <span className="relative block">
            <input className="form-field h-[64px] pr-14" type="password" />
            <Icon className="absolute right-5 top-1/2 -translate-y-1/2 text-neutral-600" name="eye" size={24} />
          </span>
        </label>

        <label className="block text-left">
          <span className="text-[22px] font-bold leading-7">Confirm new password</span>
          <span className="relative mt-[14px] block">
            <input className="form-field h-[65px] pr-14" placeholder="Confirm new password" type="password" />
            <Icon className="absolute right-5 top-1/2 -translate-y-1/2 text-neutral-600" name="eye" size={24} />
          </span>
        </label>

        <ul className="space-y-[14px] pt-[1px] text-left text-[16px] text-neutral-600">
          {passwordRules.map((rule) => (
            <li className="flex items-center gap-3" key={rule}>
              <span className="inline-flex size-5 items-center justify-center rounded-full bg-green-600 text-white">
                <Icon name="check" size={16} />
              </span>
              {rule}
            </li>
          ))}
        </ul>

        <Button className="h-[65px] w-[430px] text-[16px]" type="submit">
          Reset password
        </Button>

        <Link className="block text-[18px] font-bold text-blue-700" href="/login">
          &larr; Back to login
        </Link>
      </form>
    </AuthLayout>
  );
}
