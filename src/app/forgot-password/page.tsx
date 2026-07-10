import { AuthDivider, AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/button-link";
import { GoogleIcon, Icon } from "@/components/icons";

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      headline={<><span className="block">We&apos;ve got you</span><span className="block text-primary">secure password.</span></>}
      lead="Your new password must be different from previously used passwords."
      panelClassName="max-w-[420px]"
    >
      <form className="space-y-[24px] text-center">
        <div className="flex justify-center text-primary-700">
          <Icon name="lock" size={80} />
        </div>
        <div>
          <h1 className="text-[32px] font-bold leading-[38px] tracking-[-0.02em] text-neutral-950">Forgot your password?</h1>
          <p className="mx-auto mt-[8px] max-w-[340px] text-[15px] leading-[20px] text-neutral-500">
            No worries! Enter your work email and we&apos;ll send you a link to reset your password.
          </p>
        </div>

        <label className="block text-left">
          <span className="text-[13px] font-bold text-neutral-800">Email</span>
          <input className="form-field mt-[8px] h-[48px] text-[13px]" placeholder="Enter your email" type="email" />
        </label>

        <Button className="h-[48px] w-full rounded-[6px] !text-[14px] font-semibold" type="submit">
          Send reset link
        </Button>

        <AuthDivider />

        <Button className="h-[48px] w-full rounded-[6px] border border-neutral-300 !text-[14px] font-semibold text-neutral-700 bg-white hover:bg-neutral-50" variant="outline">
          <GoogleIcon />
          Sign in with google
        </Button>

        <p className="flex items-center justify-center gap-[6px] text-[12px] text-neutral-400">
          <Icon name="lock" size={14} />
          We&apos;ll never share your email with anyone else.
        </p>
      </form>
    </AuthLayout>
  );
}
