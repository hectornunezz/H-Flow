import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Iniciar sesión | H-FLOW",
  description: "Accede a tu espacio de entrenamiento H-FLOW.",
};

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
