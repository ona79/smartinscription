import { AuthLayout } from "@/components/auth-layout";
import { RegisterForm } from "@/features/auth/components/register-form";

export default function InscriptionPage() {
  return (
    <AuthLayout
      title="Créer un compte"
      subtitle="Inscrivez-vous en tant qu'étudiant pour démarrer votre dossier universitaire."
    >
      <RegisterForm />
    </AuthLayout>
  );
}
