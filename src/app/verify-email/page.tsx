import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/button-link";
import { GmailIcon, Icon } from "@/components/icons";

export default function VerifyEmailPage() {
  return (
    <AuthLayout
      headline={<><span className="block">One last step to</span><span className="block text-primary">get you started</span></>}
      lead="Please verify your email address to activate your account and start using Evalora."
      panelClassName="max-w-[430px] pt-[126px] lg:ml-[141px]"
    >
      <section className="space-y-[30px] text-center">
        <Icon className="mx-auto text-blue-700" name="mail" size={109} />
        <div>
          <h1 className="mt-[34px] text-[36px] font-black leading-[43px] tracking-normal">Verify your email</h1>
          <p className="mx-auto mt-[20px] max-w-[420px] text-[20px] leading-[24px] text-neutral-600">We&apos;ve sent a verification link to</p>
          <p className="mt-[12px] text-[16px] font-bold text-neutral-950">limpotkolbotey@gmail.com</p>
        </div>

        <div className="mx-auto flex h-[104px] w-[430px] items-center justify-center rounded-card bg-primary-50 px-8 text-center text-[14px] leading-[18px] text-neutral-500">
          <p>
            Click the link in the email to verify your account.
            <br />
            The link will expire in 15 minutes.
          </p>
        </div>

        <Button className="h-[66px] w-[430px] border-neutral-400 text-[16px] font-medium" variant="outline">
          <GmailIcon />
          Open Gmail
        </Button>

        <div className="space-y-[10px] text-[16px] text-neutral-500">
          <p>Didn&apos;t receive the email?</p>
          <p>
            <button className="font-bold text-blue-700" type="button">Resend email</button>{" "}
            <span>(00:45)</span>
          </p>
        </div>
      </section>
    </AuthLayout>
  );
}
