import Link from "next/link";
import { AuthLayout } from "@/components/auth-layout";
import { ButtonLink } from "@/components/button-link";
import { Icon } from "@/components/icons";

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      headline={<><span className="block">Password reset</span><span className="block text-primary">is not available yet.</span></>}
      lead="Password recovery is not connected to the backend in this MVP. Sign in with your workspace email or create a new account."
      panelClassName="max-w-[420px]"
    >
      <div className="space-y-6 text-center">
        <div className="flex justify-center text-primary-700">
          <Icon name="lock" size={64} />
        </div>
        <div>
          <h1 className="text-[28px] font-bold leading-[34px] tracking-[-0.02em] text-neutral-950">Reset not configured</h1>
          <p className="mx-auto mt-2 max-w-[340px] text-[14px] leading-5 text-neutral-500">
            This screen is a placeholder. Use your existing workspace credentials, or ask the workspace owner for access.
          </p>
        </div>
        <ButtonLink className="h-12 w-full rounded-[6px] !text-[14px] font-semibold" href="/login">
          Back to sign in
        </ButtonLink>
        <p className="text-[12px] text-neutral-500">
          Need a workspace? <Link className="font-bold text-primary-700" href="/register">Create one</Link>
        </p>
      </div>
    </AuthLayout>
  );
}
