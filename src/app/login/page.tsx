import { AuthDivider, AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/button-link";
import { GoogleIcon } from "@/components/icons";

export default function LoginPage() {
  return (
    <AuthLayout lead="Evalora helps you evaluate candidates fairly and accurately with AI-powered assessments across multiple skills and traits.">
      <form className="space-y-[19px]">
        <label className="block">
          <span className="text-[20px] font-bold leading-6">Email</span>
          <input className="form-field mt-[15px]" placeholder="Enter your email" type="email" />
        </label>

        <label className="block">
          <span className="text-[20px] font-bold leading-6">Password</span>
          <input className="form-field mt-[15px]" placeholder="Enter your password" type="password" />
        </label>

        <div className="flex items-center pt-[24px] text-[16px] text-neutral-600">
          <label className="inline-flex items-center gap-[11px]">
            <input className="size-[32px] rounded-[8px] border border-neutral-300 accent-[#2fb2e4]" type="checkbox" />
            Remember me
          </label>
        </div>

        <Button aria-label="Log in" className="mt-[27px] h-[65px] w-full text-lg" type="submit">
          <span className="sr-only">Log in</span>
        </Button>

        <div className="pt-[31px]">
        <AuthDivider />
        </div>

        <Button className="h-[66px] w-full border-neutral-400 text-[16px] font-medium" variant="outline">
          <GoogleIcon />
          Sign in with google
        </Button>

        <p className="pt-[24px] text-center text-[16px] text-neutral-500">Don&apos;t have an account?</p>
      </form>
    </AuthLayout>
  );
}
