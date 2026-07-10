import { AuthDivider, AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/button-link";
import { GoogleIcon, Icon } from "@/components/icons";

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      headline={<><span className="block">We&apos;ve got you</span><span className="block text-primary">secure password.</span></>}
      lead="Your new password must be different from previously used passwords."
      panelClassName="max-w-[400px]"
    >
      <form className="mx-auto w-full space-y-[15px] text-center">
        <Icon className="mx-auto text-blue-700" name="lock" size={72} />
        <div>
          <h1 className="mt-[20px] text-[26px] font-black leading-[31px] tracking-[-0.01em]">Forgot your password?</h1>
          <p className="mx-auto mt-[18px] max-w-[315px] text-[14px] leading-[17px] text-neutral-600">
            No worries! Enter your work email and we&apos;ll send you a link to reset your password.
          </p>
        </div>

        <label className="block pt-[2px] text-left">
          <span className="text-[14px] font-bold leading-[17px]">Email</span>
          <input className="form-field mt-[9px] h-[44px] rounded-[8px]" placeholder="Enter your email" type="email" />
        </label>

        <Button className="h-[44px] w-full rounded-[8px] !text-[12px] font-medium shadow-none" type="submit">
          Send reset link
        </Button>

        <div className="pt-[8px]">
          <AuthDivider />
        </div>

        <div className="flex justify-center">
          <Button className="flex h-[44px] w-full items-center justify-center gap-2 rounded-[8px] border-neutral-300 !text-[12px] font-medium shadow-none" variant="outline">
            <GoogleIcon />
            Sign in with google
          </Button>
        </div>

        <p className="flex items-center justify-center gap-2 pt-[8px] text-[11px] text-neutral-400">
          <Icon name="lock" size={13} />
          We&apos;ll never share your email with anyone else.
        </p>
      </form>
    </AuthLayout>
  );
}
