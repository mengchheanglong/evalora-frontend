import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/button-link";
import { GmailIcon, Icon } from "@/components/icons";

export default function VerifyEmailPage() {
  return (
    <AuthLayout lead="Please verify your email address to activate your account and start using Evalora." panelClassName="max-w-[430px] pt-[180px] lg:ml-[141px]">
      <section className="space-y-[34px] text-center">
        <Icon className="mx-auto text-blue-700" name="mail" size={109} />
        <h1 className="sr-only">Verify your email</h1>
        <p className="pt-[127px] text-[16px] font-bold text-neutral-950">limpotkolbotey@gmail.com</p>

        <label className="block">
          <span className="sr-only">Verification code</span>
          <input className="h-[104px] w-[430px] rounded-[8px] border border-transparent bg-[#eef4ff] px-6 text-center text-3xl font-bold tracking-[0.3em] outline-none focus:border-sky-300" inputMode="numeric" maxLength={6} />
        </label>

        <Button className="h-[66px] w-[430px] border-neutral-400 text-[16px] font-medium" variant="outline">
          <GmailIcon />
          Open Gmail
        </Button>

        <p className="text-[16px] text-neutral-500">Didn&apos;t receive the email?</p>
      </section>
    </AuthLayout>
  );
}
