import Link from "next/link";
import { AuthDivider, AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/button-link";
import { GoogleIcon } from "@/components/icons";

export default function LoginPage() {
  return (
    <AuthLayout
      headline={<><span className="block">Assess Smarter,</span><span className="block"><span className="text-primary">Hire</span> Better.</span></>}
      lead="Evalora helps you evaluate candidates fairly and accurately with AI-powered assessments across multiple skills and traits."
    >
      <form className="mx-auto w-full space-y-[13px]">
        <div className="pb-[22px] text-center">
          <h1 className="text-[26px] font-black leading-[31px] tracking-[-0.01em]">Welcome back!</h1>
          <p className="mt-[12px] text-[14px] leading-[17px] text-neutral-600">Sign in to continue to your account.</p>
        </div>

        <label className="block">
          <span className="text-[14px] font-bold leading-[17px]">Email</span>
          <input className="form-field mt-[9px] h-[44px] rounded-[8px]" placeholder="Enter your email" type="email" />
        </label>

        <label className="block">
          <span className="text-[14px] font-bold leading-[17px]">Password</span>
          <input className="form-field mt-[9px] h-[44px] rounded-[8px]" placeholder="Enter your password" type="password" />
        </label>

        <div className="flex items-center justify-between pt-[15px] text-[12px] text-neutral-600">
          <label className="inline-flex items-center gap-[9px]">
            <input className="size-[21px] rounded-[6px] border border-neutral-200 accent-primary" type="checkbox" />
            Remember me
          </label>
          <Link className="font-bold text-blue-700" href="/forgot-password">
            Forgot password?
          </Link>
        </div>

        <Button className="mt-[18px] h-[44px] w-full rounded-[8px] !text-[12px] font-medium shadow-none" type="submit">
          Sign in
        </Button>

        <div className="pt-[18px]">
          <AuthDivider />
        </div>

        <Button className="h-[44px] w-full rounded-[8px] border-neutral-300 !text-[12px] font-medium shadow-none" variant="outline">
          <GoogleIcon />
          Sign in with google
        </Button>

        <p className="pt-[14px] text-center text-[12px] text-neutral-500">
          Don&apos;t have an account? <Link className="font-bold text-blue-700" href="/register">Sign up</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
