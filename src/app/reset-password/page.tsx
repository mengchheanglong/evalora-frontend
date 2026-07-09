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
      panelClassName="max-w-[320px] pt-[42px] lg:ml-[88px]"
    >
      <form className="space-y-[12px] text-center">
        <Icon className="mx-auto text-blue-700" name="lock" size={62} />
        <div>
          <h1 className="mt-[11px] text-[28px] font-black leading-[34px] tracking-normal">Reset your password</h1>
          <p className="mx-auto mt-[11px] max-w-[310px] text-[14px] leading-[17px] text-neutral-600">Enter and confirm your new password to continue.</p>
        </div>

        <label className="block pt-[12px] text-left">
          <span className="text-[14px] font-bold leading-[17px]">New Password</span>
          <span className="relative mt-[9px] block">
            <input className="form-field h-[46px] pr-10" placeholder="Enter new password" type="password" />
            <Icon className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600" name="eye" size={16} />
          </span>
        </label>

        <label className="block text-left">
          <span className="text-[14px] font-bold leading-[17px]">Confirm new password</span>
          <span className="relative mt-[9px] block">
            <input className="form-field h-[46px] pr-10" placeholder="Confirm new password" type="password" />
            <Icon className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600" name="eye" size={16} />
          </span>
        </label>

        <ul className="space-y-[8px] pt-[1px] text-left text-[12px] text-neutral-600">
          {passwordRules.map((rule) => (
            <li className="flex items-center gap-2" key={rule}>
              <span className="inline-flex size-[15px] items-center justify-center rounded-full bg-green-600 text-white">
                <Icon name="check" size={11} />
              </span>
              {rule}
            </li>
          ))}
        </ul>

        <Button className="h-[46px] w-full rounded-[5px] !text-[12px]" type="submit">
          Reset password
        </Button>

        <Link className="block text-[12px] font-bold text-blue-700" href="/login">
          &larr; Back to login
        </Link>
      </form>
    </AuthLayout>
  );
}
