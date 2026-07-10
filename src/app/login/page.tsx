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
      <form className="space-y-[14px]">
        <div className="pb-[24px] text-center">
          <h1 className="text-[28px] font-black leading-[34px] tracking-[-0.02em]">Welcome back!</h1>
          <p className="mt-[13px] text-[14px] leading-[17px] text-neutral-600">Sign in to continue to your account.</p>
        </div>

        <label className="block">
          <span className="text-[14px] font-bold leading-[17px]">Email</span>
          <input className="form-field mt-[9px] h-[46px]" placeholder="Enter your email" type="email" />
        </label>

        <label className="block">
          <span className="text-[14px] font-bold leading-[17px]">Password</span>
          <input className="form-field mt-[9px] h-[46px]" placeholder="Enter your password" type="password" />
        </label>

        <div className="flex items-center justify-between pt-[16px] text-[12px] text-neutral-600">
          <label className="inline-flex items-center gap-[9px]">
            <input className="size-[22px] rounded-[5px] border border-neutral-300 accent-primary" type="checkbox" />
            Remember me
          </label>
          <Link className="font-bold text-blue-700" href="/forgot-password">
            Forgot password?
          </Link>
        </div>

        <Button className="mt-[18px] h-[46px] w-full rounded-[5px] !text-[12px]" type="submit">
          Sign in
        </Button>

        <div className="pt-[18px]">
          <AuthDivider />
        </div>

        <Button className="h-[46px] w-full rounded-[5px] border-neutral-400 !text-[12px] font-medium" variant="outline">
          <GoogleIcon />
          Sign in with google
        </Button>

        <p className="pt-[15px] text-center text-[12px] text-neutral-500">
          Don&apos;t have an account? <Link className="font-bold text-blue-700" href="/register">Sign up</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
