import { AuthLayout } from "@/components/auth-layout";
import { LoginForm } from "@/features/auth/components/login-form";
import { isTestAccountsEnabled } from "@/features/auth/lib/test-accounts";

export const dynamic = "force-dynamic";

interface ConnexionPageProps {
  searchParams: Promise<{ raison?: string }>;
}

export default async function ConnexionPage({ searchParams }: ConnexionPageProps) {
  const showTestAccounts = isTestAccountsEnabled();
  const { raison } = await searchParams;

  return (
    <AuthLayout
      title="Connexion"
      subtitle="Accédez à votre espace étudiant, agent ou administrateur."
    >
      <LoginForm showTestAccounts={showTestAccounts} reason={raison} />
    </AuthLayout>
  );
}
