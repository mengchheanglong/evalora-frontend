import Link from "next/link";
import { AuthDivider, AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/button-link";
import { GoogleIcon, Icon } from "@/components/icons";

export default function RegisterPage() {
  return (
    <AuthLayout
      headline={<><span className="block">Assess Smarter,</span><span className="block"><span className="text-primary">Hire</span> Better.</span></>}
      lead="Evalora helps you evaluate candidates fairly and accurately with AI-powered assessments across multiple skills and traits."
      panelClassName="max-w-[350px] pt-[45px] lg:ml-[58px]"
    >
      <form className="space-y-[13px]">
        <div className="text-center">
          <h1 className="text-[24px] font-black leading-[29px] tracking-[-0.02em]">Create your account</h1>
          <p className="mt-[10px] text-[13px] leading-[16px] text-neutral-600">Join Evalora and start assessing smarter.</p>
        </div>

        <div className="grid gap-x-[18px] gap-y-[10px] pt-[8px] md:grid-cols-2">
          <label className="block">
            <span className="text-[12px] font-bold leading-[15px]">Full Name</span>
            <input className="form-field mt-[8px] h-[38px]" placeholder="Enter your full name" type="text" />
          </label>

          <label className="block">
            <span className="text-[12px] font-bold leading-[15px]">Email</span>
            <input className="form-field mt-[8px] h-[38px]" placeholder="Enter your email" type="email" />
          </label>

          <label className="block">
            <span className="text-[12px] font-bold leading-[15px]">Password</span>
            <span className="relative mt-[8px] block">
              <input className="form-field h-[38px] pr-9" placeholder="Create a password" type="password" />
              <Icon className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600" name="eye" size={14} />
            </span>
            <span className="mt-[5px] block text-[9px] leading-[11px] text-neutral-400">Use 8+ characters with letters and numbers</span>
          </label>

          <label className="block">
            <span className="text-[12px] font-bold leading-[15px]">Confirm Password</span>
            <span className="relative mt-[8px] block">
              <input className="form-field h-[38px] pr-9" placeholder="Confirm a password" type="password" />
              <Icon className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600" name="eye" size={14} />
            </span>
          </label>
        </div>

        <label className="flex items-center gap-[7px] text-[10px] text-neutral-600">
          <input className="size-[18px] shrink-0 rounded-[5px] border border-neutral-300 accent-primary" type="checkbox" />
          <span>
            I agree to the <Link className="font-semibold text-blue-700" href="/terms">Terms of Service</Link> and <Link className="font-semibold text-blue-700" href="/privacy">Privacy Policy</Link>
          </span>
        </label>

        <Button className="mx-auto flex h-[38px] w-[250px] rounded-[5px] !text-[10px]" type="submit">
          Create an account
        </Button>

        <div className="mx-auto w-[250px]">
          <AuthDivider />
        </div>

        <Button className="mx-auto flex h-[38px] w-[250px] rounded-[5px] border-neutral-400 !text-[10px] font-medium" variant="outline">
          <GoogleIcon />
          Sign in with google
        </Button>

        <p className="text-center text-[10px] text-neutral-500">
          Already have an account? <Link className="font-bold text-blue-700" href="/login">login</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
