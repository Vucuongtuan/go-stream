import { RegisterForm } from "@/components/features/auth/RegisterForm";
import { AuthPageShell } from "@/components/features/auth/AuthPageShell";

export default function RegisterPage() {
  return (
    <AuthPageShell>
      <RegisterForm />
    </AuthPageShell>
  );
}
