import Image from "next/image";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/button-link";
import { Icon } from "@/components/icons";

export default function VerifyEmailPage() {
  return (
    <AuthLayout
      headline={
        <>
          <span className="block">One last step to</span>
          <span className="block text-primary">get you started</span>
        </>
      }
      lead="Please verify your email address to activate your account and start using Evalora."
      panelClassName="max-w-[400px]"
    >
      <section className="mx-auto w-full space-y-[18px] text-center">
        <Icon className="mx-auto text-blue-700" name="mail" size={78} />

        <div>
          <h1 className="mt-[20px] text-[26px] font-black leading-[31px] tracking-[-0.01em] text-neutral-950">
            Verify your email
          </h1>

          <p className="mx-auto mt-[18px] max-w-[310px] text-[14px] leading-[17px] text-neutral-600">
            We&apos;ve sent a verification link to
          </p>

          <p className="mt-[10px] text-[11px] font-bold text-neutral-950">
            limpotkolbotey@gmail.com
          </p>
        </div>

        <div className="mx-auto flex min-h-[62px] w-full items-center justify-center rounded-[8px] bg-primary-50 px-5 text-center text-[11px] leading-[13px] text-neutral-500">
          <p>
            Click the link in the email to verify your account.
            <br />
            The link will expire in 15 minutes.
          </p>
        </div>

        <Button
          className="flex h-[44px] w-full items-center justify-center gap-3 rounded-[8px] border border-neutral-300 bg-white !text-[12px] font-medium text-neutral-800 shadow-none transition hover:bg-neutral-50"
          variant="outline"
        >
          <Image
            src="/gmail-logo.png"
            alt="Gmail"
            width={20}
            height={20}
            className="object-contain"
          />
          <span>Open Gmail</span>
        </Button>

        <div className="space-y-[8px] pt-[2px] text-[11px] text-neutral-500">
          <p>Didn&apos;t receive the email?</p>

          <p>
            <button className="font-bold text-blue-700" type="button">
              Resend email
            </button>{" "}
            <span>(00:45)</span>
          </p>
        </div>
      </section>
    </AuthLayout>
  );
}