import { AuthDivider, AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/button-link";
import { GoogleIcon, Icon } from "@/components/icons";

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      headline={<><span className="block">We&apos;ve got you</span><span className="block text-primary">secure password.</span></>}
      lead="Your new password must be different from previously used passwords."
      panelClassName="max-w-[320px] pt-[62px] lg:ml-[88px]"
    >
      <form className="space-y-[16px] text-center">
        <Icon className="mx-auto text-blue-700" name="lock" size={66} />
        <div>
          <h1 className="mt-[16px] text-[28px] font-black leading-[34px] tracking-normal">Forgot your password?</h1>
          <p className="mx-auto mt-[13px] max-w-[310px] text-[14px] leading-[17px] text-neutral-600">
            No worries! Enter your work email and we&apos;ll send you a link to reset your password.
          </p>
        </div>

        <label className="block pt-[7px] text-left">
          <span className="text-[14px] font-bold leading-[17px]">Email</span>
          <input className="form-field mt-[9px] h-[46px]" placeholder="Enter your email" type="email" />
        </label>

        <Button className="h-[46px] w-full rounded-[5px] !text-[12px]" type="submit">
          Send reset link
        </Button>

        <AuthDivider />

        <Button className="h-[46px] w-full rounded-[5px] border-neutral-400 !text-[12px] font-medium" variant="outline">
          <GoogleIcon />
          Sign in with google
        </Button>

        <p className="flex items-center justify-center gap-2 pt-[4px] text-[12px] text-neutral-400">
          <Icon name="lock" size={14} />
          We&apos;ll never share your email with anyone else.
        </p>
      </form>
    </AuthLayout>
  );
}
