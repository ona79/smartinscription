import { AuthLayout } from "@/components/auth-layout";
import { LoginForm } from "@/features/auth/components/login-form";

export default function ConnexionPage() {
  return (
    <AuthLayout
      title="Connexion"
      subtitle="Accédez à votre espace étudiant, agent ou administrateur."
    >
      <LoginForm />
    </AuthLayout>
  );
}
