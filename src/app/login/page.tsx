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
      <form className="space-y-[12px]">
        <div className="pb-[20px] text-center">
          <h1 className="text-[24px] font-black leading-[29px] tracking-[-0.02em]">Welcome back!</h1>
          <p className="mt-[13px] text-[14px] leading-[17px] text-neutral-600">Sign in to continue to your account.</p>
        </div>

        <label className="block">
          <span className="text-[12px] font-bold leading-[15px]">Email</span>
          <input className="form-field mt-[8px] h-[38px]" placeholder="Enter your email" type="email" />
        </label>

        <label className="block">
          <span className="text-[12px] font-bold leading-[15px]">Password</span>
          <input className="form-field mt-[8px] h-[38px]" placeholder="Enter your password" type="password" />
        </label>

        <div className="flex items-center justify-between pt-[14px] text-[10px] text-neutral-600">
          <label className="inline-flex items-center gap-[8px]">
            <input className="size-[18px] rounded-[5px] border border-neutral-300 accent-primary" type="checkbox" />
            Remember me
          </label>
          <Link className="font-bold text-blue-700" href="/forgot-password">
            Forgot password?
          </Link>
        </div>

        <Button className="mt-[16px] h-[38px] w-full rounded-[5px] !text-[10px]" type="submit">
          Sign in
        </Button>

        <div className="pt-[16px]">
          <AuthDivider />
        </div>

        <Button className="h-[38px] w-full rounded-[5px] border-neutral-400 !text-[10px] font-medium" variant="outline">
          <GoogleIcon />
          Sign in with google
        </Button>

        <p className="pt-[13px] text-center text-[10px] text-neutral-500">
          Don&apos;t have an account? <Link className="font-bold text-blue-700" href="/register">Sign up</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
