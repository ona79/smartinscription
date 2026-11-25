import { AuthLayout } from "@/components/auth-layout";
import { LoginForm } from "@/features/auth/components/login-form";
import { isTestAccountsEnabled } from "@/features/auth/lib/test-accounts";

export default function ConnexionPage() {
  const showTestAccounts = isTestAccountsEnabled();

  return (
    <AuthLayout
      title="Connexion"
      subtitle="Accédez à votre espace étudiant, agent ou administrateur."
    >
      <LoginForm showTestAccounts={showTestAccounts} />
    </AuthLayout>
  );
}
