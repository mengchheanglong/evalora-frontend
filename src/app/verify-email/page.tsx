import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/button-link";
import { GmailIcon, Icon } from "@/components/icons";

export default function VerifyEmailPage() {
  return (
    <AuthLayout
      headline={<><span className="block">One last step to</span><span className="block text-primary">get you started</span></>}
      lead="Please verify your email address to activate your account and start using Evalora."
      panelClassName="max-w-[250px] pt-[58px] lg:ml-[88px]"
    >
      <section className="space-y-[14px] text-center">
        <Icon className="mx-auto text-blue-700" name="mail" size={58} />
        <div>
          <h1 className="mt-[15px] text-[24px] font-black leading-[29px] tracking-normal">Verify your email</h1>
          <p className="mx-auto mt-[12px] max-w-[250px] text-[12px] leading-[15px] text-neutral-600">We&apos;ve sent a verification link to</p>
          <p className="mt-[7px] text-[10px] font-bold text-neutral-950">limpotkolbotey@gmail.com</p>
        </div>

        <div className="mx-auto flex h-[58px] w-full items-center justify-center rounded-card bg-primary-50 px-5 text-center text-[10px] leading-[13px] text-neutral-500">
          <p>
            Click the link in the email to verify your account.
            <br />
            The link will expire in 15 minutes.
          </p>
        </div>

        <Button className="h-[38px] w-full rounded-[5px] border-neutral-400 !text-[10px] font-medium" variant="outline">
          <GmailIcon />
          Open Gmail
        </Button>

        <div className="space-y-[5px] text-[10px] text-neutral-500">
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
