import Link from "next/link";
import { AuthDivider, AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/button-link";
import { GoogleIcon, Icon } from "@/components/icons";

export default function RegisterPage() {
  return (
    <AuthLayout
      headline={<><span className="block">Assess Smarter,</span><span className="block"><span className="text-primary">Hire</span> Better.</span></>}
      lead="Evalora helps you evaluate candidates fairly and accurately with AI-powered assessments across multiple skills and traits."
      panelClassName="max-w-[520px]"
    >
      <form className="mx-auto w-full space-y-[13px]">
        <div className="pb-[20px] text-center">
          <h1 className="text-[27px] font-black leading-[32px] tracking-[-0.01em]">Create your account</h1>
          <p className="mt-[14px] text-[14px] leading-[17px] text-neutral-600">Join Evalora and start assessing smarter.</p>
        </div>

        <div className="grid gap-x-[30px] gap-y-[13px] md:grid-cols-2">
          <label className="block">
            <span className="text-[14px] font-bold leading-[17px]">Full Name</span>
            <input className="form-field mt-[9px] h-[44px] rounded-[8px]" placeholder="Enter your full name" type="text" />
          </label>

          <label className="block">
            <span className="text-[14px] font-bold leading-[17px]">Email</span>
            <input className="form-field mt-[9px] h-[44px] rounded-[8px]" placeholder="Enter your email" type="email" />
          </label>

          <label className="block">
            <span className="text-[14px] font-bold leading-[17px]">Password</span>
            <span className="relative mt-[9px] block">
              <input className="form-field h-[44px] rounded-[8px] pr-10" placeholder="Create a password" type="password" />
              <Icon className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600" name="eye" size={16} />
            </span>
            <span className="mt-[6px] block text-[9px] leading-[11px] text-neutral-400">Use 8+ characters with a mix of letters and numbers</span>
          </label>

          <label className="block">
            <span className="text-[14px] font-bold leading-[17px]">Confirm Password</span>
            <span className="relative mt-[9px] block">
              <input className="form-field h-[44px] rounded-[8px] pr-10" placeholder="Confirm a password" type="password" />
              <Icon className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600" name="eye" size={16} />
            </span>
          </label>
        </div>

        <label className="flex items-center gap-[8px] pt-[5px] text-[11px] text-neutral-500">
          <input className="size-[21px] shrink-0 rounded-[7px] border border-neutral-200 accent-primary" type="checkbox" />
          <span>
            I agree to the <Link className="font-semibold text-blue-700" href="/terms">Terms of Service</Link> and <Link className="font-semibold text-blue-700" href="/privacy">Privacy Policy</Link>
          </span>
        </label>

        <Button className="h-[44px] w-full rounded-[8px] !text-[12px] font-medium shadow-none" type="submit">
          Create an account
        </Button>

        <div className="pt-[8px]">
          <AuthDivider />
        </div>

        <div className="flex justify-center">
          <Button className="flex h-[44px] w-full max-w-[400px] items-center justify-center gap-2 rounded-[8px] border-neutral-300 !text-[12px] font-medium shadow-none" variant="outline">
            <GoogleIcon />
            Sign in with google
          </Button>
        </div>

        <p className="pt-[3px] text-center text-[12px] text-neutral-500">
          Already have an account? <Link className="font-bold text-blue-700" href="/login">login</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
