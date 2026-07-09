import Link from "next/link";
import { AuthDivider, AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/button-link";
import { GoogleIcon, Icon } from "@/components/icons";

export default function RegisterPage() {
  return (
    <AuthLayout
      headline={<><span className="block">Assess Smarter,</span><span className="block"><span className="text-primary">Hire</span> Better.</span></>}
      lead="Evalora helps you evaluate candidates fairly and accurately with AI-powered assessments across multiple skills and traits."
      panelClassName="max-w-[568px] pt-[86px] lg:ml-[40px]"
    >
      <form className="space-y-[24px]">
        <div className="text-center">
          <h1 className="text-[36px] font-black leading-[43px] tracking-[-0.02em]">Create your account</h1>
          <p className="mt-[18px] text-[20px] leading-6 text-neutral-600">Join Evalora and start assessing smarter.</p>
        </div>

        <div className="grid gap-x-[40px] gap-y-[18px] pt-[18px] md:grid-cols-2">
          <label className="block">
            <span className="text-[20px] font-bold leading-6">Full Name</span>
            <input className="form-field mt-[15px] h-[65px]" placeholder="Enter your full name" type="text" />
          </label>

          <label className="block">
            <span className="text-[20px] font-bold leading-6">Email</span>
            <input className="form-field mt-[15px] h-[65px]" placeholder="Enter your email" type="email" />
          </label>

          <label className="block">
            <span className="text-[20px] font-bold leading-6">Password</span>
            <span className="relative mt-[15px] block">
              <input className="form-field h-[65px] pr-14" placeholder="Create a password" type="password" />
              <Icon className="absolute right-5 top-1/2 -translate-y-1/2 text-neutral-600" name="eye" size={24} />
            </span>
            <span className="mt-[8px] block text-[10px] leading-3 text-neutral-400">Use 8+ characters with a mix of letters and numbers</span>
          </label>

          <label className="block">
            <span className="text-[20px] font-bold leading-6">Confirm Password</span>
            <span className="relative mt-[15px] block">
              <input className="form-field h-[65px] pr-14" placeholder="Confirm a password" type="password" />
              <Icon className="absolute right-5 top-1/2 -translate-y-1/2 text-neutral-600" name="eye" size={24} />
            </span>
          </label>
        </div>

        <label className="flex items-center gap-[9px] text-[12px] text-neutral-600">
          <input className="size-[32px] shrink-0 rounded-card border border-neutral-300 accent-primary" type="checkbox" />
          <span>
            I agree to the{" "}
            <Link className="font-semibold text-blue-700" href="/terms">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link className="font-semibold text-blue-700" href="/privacy">
              Privacy Policy
            </Link>
          </span>
        </label>

        <Button className="ml-[80px] h-[65px] w-[455px] text-[16px]" type="submit">
          Create an account
        </Button>

        <div className="ml-[80px] w-[455px]">
          <AuthDivider />
        </div>

        <Button className="ml-[80px] h-[66px] w-[430px] border-neutral-400 text-[16px] font-medium" variant="outline">
          <GoogleIcon />
          Sign in with google
        </Button>

        <p className="text-center text-[16px] text-neutral-500">
          Already have an account? <Link className="font-bold text-blue-700" href="/login">login</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
