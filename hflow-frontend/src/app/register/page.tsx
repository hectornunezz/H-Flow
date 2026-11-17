import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Registro Beta | H-FLOW",
  description: "Crea tu cuenta y verifica tu correo para acceder a la Beta Cerrada de H-FLOW.",
};

export default function RegisterPage() {
  return <AuthForm mode="register" />;
}
