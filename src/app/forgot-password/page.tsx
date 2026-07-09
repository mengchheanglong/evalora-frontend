import { AuthDivider, AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/button-link";
import { GoogleIcon, Icon } from "@/components/icons";

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      headline={<><span className="block">We&apos;ve got you</span><span className="block text-primary">secure password.</span></>}
      lead="Your new password must be different from previously used passwords."
      panelClassName="max-w-[250px] pt-[66px] lg:ml-[88px]"
    >
      <form className="space-y-[14px] text-center">
        <Icon className="mx-auto text-blue-700" name="lock" size={56} />
        <div>
          <h1 className="mt-[14px] text-[24px] font-black leading-[29px] tracking-normal">Forgot your password?</h1>
          <p className="mx-auto mt-[12px] max-w-[250px] text-[12px] leading-[15px] text-neutral-600">
            No worries! Enter your work email and we&apos;ll send you a link to reset your password.
          </p>
        </div>

        <label className="block pt-[6px] text-left">
          <span className="text-[12px] font-bold leading-[15px]">Email</span>
          <input className="form-field mt-[8px] h-[38px]" placeholder="Enter your email" type="email" />
        </label>

        <Button className="h-[38px] w-full rounded-[5px] !text-[10px]" type="submit">
          Send reset link
        </Button>

        <AuthDivider />

        <Button className="h-[38px] w-full rounded-[5px] border-neutral-400 !text-[10px] font-medium" variant="outline">
          <GoogleIcon />
          Sign in with google
        </Button>

        <p className="flex items-center justify-center gap-2 pt-[3px] text-[10px] text-neutral-400">
          <Icon name="lock" size={13} />
          We&apos;ll never share your email with anyone else.
        </p>
      </form>
    </AuthLayout>
  );
}
