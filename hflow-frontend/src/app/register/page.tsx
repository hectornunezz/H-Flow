import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Crear cuenta | H-FLOW",
  description: "Crea tu cuenta de entrenador en H-FLOW.",
};

export default function RegisterPage() {
  return <AuthForm mode="register" />;
}
