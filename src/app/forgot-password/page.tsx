import { AuthDivider, AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/button-link";
import { GoogleIcon, Icon } from "@/components/icons";

export default function ForgotPasswordPage() {
  return (
    <AuthLayout lead="Your new password must be different from previously used passwords." panelClassName="max-w-[455px] pt-[141px] lg:ml-[155px]">
      <form className="space-y-[37px] text-center">
        <Icon className="mx-auto text-blue-700" name="lock" size={104} />
        <div>
          <h1 className="mt-[26px] text-[36px] font-black leading-[43px] tracking-normal">Forgot your password?</h1>
          <p className="mx-auto mt-[27px] max-w-[420px] text-[22px] leading-[24px] text-neutral-600">
            No worries! Enter your work email and we&apos;ll send you a link to reset your password.
          </p>
        </div>

        <Button className="mt-[87px] h-[65px] w-[430px] text-[16px]" type="submit">
          Send reset link
        </Button>

        <div className="w-[455px]">
          <AuthDivider />
        </div>

        <Button className="h-[66px] w-[430px] border-neutral-400 text-[16px] font-medium" variant="outline">
          <GoogleIcon />
          Sign in with google
        </Button>

        <p className="flex items-center justify-center gap-2 pt-[6px] text-[16px] text-neutral-400">
          <Icon name="lock" size={18} />
          We&apos;ll never share your email with anyone else.
        </p>
      </form>
    </AuthLayout>
  );
}
