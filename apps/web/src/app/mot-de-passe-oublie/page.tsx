import { AuthLayout } from "@/components/auth-layout";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export default function MotDePasseOubliePage() {
  return (
    <AuthLayout
      title="Mot de passe oublié"
      subtitle="Saisissez votre adresse e-mail pour recevoir un lien de réinitialisation."
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
