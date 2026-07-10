import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/button-link";
import { GmailIcon, Icon } from "@/components/icons";

export default function VerifyEmailPage() {
  return (
    <AuthLayout
      headline={<><span className="block">One last step to</span><span className="block text-primary">get you started</span></>}
      lead="Please verify your email address to activate your account and start using Evalora."
      panelClassName="max-w-[420px]"
    >
      <section className="space-y-[24px] text-center">
        <div className="flex justify-center text-primary-700">
          <Icon name="mail" size={80} />
        </div>
        <div>
          <h1 className="text-[32px] font-bold leading-[38px] tracking-[-0.02em] text-neutral-950">Verify your email</h1>
          <p className="mt-[8px] text-[15px] text-neutral-500">We&apos;ve sent a verification link to</p>
          <p className="mt-[6px] text-[14px] font-bold text-neutral-950">limpotkolbotey@gmail.com</p>
        </div>

        <div className="w-full bg-primary-50 rounded-[8px] p-6 text-center text-[13px] leading-[18px] text-neutral-600 border border-primary-100/30">
          <p>
            Click the link in the email to verify your account.
            <br />
            The link will expire in 15 minutes.
          </p>
        </div>

        <Button className="h-[48px] w-full rounded-[6px] border border-neutral-300 !text-[14px] font-semibold text-neutral-700 bg-white hover:bg-neutral-50" variant="outline">
          <GmailIcon />
          Open Gmail
        </Button>

        <div className="space-y-[6px] text-[13px] text-neutral-500">
          <p>Didn&apos;t receive the email?</p>
          <p>
            <button className="font-bold text-primary-700 hover:underline cursor-pointer" type="button">Resend email</button>{" "}
            <span className="text-neutral-400">(00:45)</span>
          </p>
        </div>
      </section>
    </AuthLayout>
  );
}
