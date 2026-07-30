import { LoginForm } from "@/components/features/auth/LoginForm";
import { AuthPageShell } from "@/components/features/auth/AuthPageShell";

export default function LoginPage() {
  return (
    <AuthPageShell>
      <LoginForm />
    </AuthPageShell>
  );
}
