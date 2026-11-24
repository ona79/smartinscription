import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { LoginForm } from "@/features/auth/components/login-form";

export default function ConnexionPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
      <Link href="/" className="mb-6 flex items-center gap-2 font-bold">
        <ShieldCheck className="h-6 w-6 text-teal-700" />
        <span>SmartInscription IA</span>
      </Link>
      <LoginForm />
    </div>
  );
}
