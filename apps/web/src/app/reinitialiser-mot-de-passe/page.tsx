import { AuthLayout } from "@/components/auth-layout";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export default function ReinitialiserMotDePassePage() {
  return (
    <AuthLayout
      title="Nouveau mot de passe"
      subtitle="Choisissez un nouveau mot de passe d'au moins 8 caractères."
    >
      <ResetPasswordForm />
    </AuthLayout>
  );
}
