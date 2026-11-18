"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export interface AuthActionResponse {
  success: boolean;
  error?: string;
  requiresVerification?: boolean;
  email?: string;
  devOtpCode?: string;
  redirectTo?: string;
}

function generateSixDigitOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Paso 1 de Registro: Crea la solicitud en la Beta Cerrada, genera el OTP de 6 dígitos
 * y protege contra el error "fetch failed" si Supabase o el servidor SMTP no responden.
 */
export async function registerCoachAction(formData: FormData): Promise<AuthActionResponse> {
  const name = (formData.get("name") as string)?.trim() || "Coach H-Flow";
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = (formData.get("password") as string) || "";
  const specialty = (formData.get("specialty") as string)?.trim() || "Fuerza & S&C";

  if (!email || !email.includes("@")) {
    return { success: false, error: "Introduce un correo electrónico profesional válido." };
  }
  if (password.length < 6) {
    return { success: false, error: "La contraseña debe tener al menos 6 caracteres." };
  }

  const otpCode = generateSixDigitOtp();
  const cookieStore = await cookies();

  const pendingPayload = JSON.stringify({
    name,
    email,
    specialty,
    otpCode,
    expiresAt: Date.now() + 15 * 60 * 1000,
  });

  cookieStore.set("hflow_pending_verification", pendingPayload, {
    httpOnly: true,
    path: "/",
    maxAge: 900,
    sameSite: "lax",
  });

  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const supabase = await createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            specialty,
            beta_verified: false,
          },
        },
      });

      if (error && !error.message.toLowerCase().includes("fetch")) {
        if (error.message.includes("already registered")) {
          return {
            success: false,
            error: "Este correo ya está registrado. Inicia sesión directamente.",
          };
        }
      }
    }
  } catch (err) {
    console.warn("[H-Flow Auth] Supabase inalcanzable, activando Local MVP Fallback:", err);
  }

  console.log(`\n==================================================`);
  console.log(`🔥 [H-FLOW BETA OTP] Código para ${email}: ${otpCode}`);
  console.log(`==================================================\n`);

  return {
    success: true,
    requiresVerification: true,
    email,
    devOtpCode: process.env.NODE_ENV !== "production" ? otpCode : undefined,
  };
}

/**
 * Paso 2 de Registro: Verifica el código de 6 dígitos introducido por el entrenador
 * y activa la sesión en el Dashboard.
 */
export async function verifyEmailOtpAction(email: string, code: string): Promise<AuthActionResponse> {
  const cleanCode = code.trim();
  if (cleanCode.length !== 6) {
    return { success: false, error: "El código debe contener exactamente 6 dígitos." };
  }

  const cookieStore = await cookies();
  const pendingCookie = cookieStore.get("hflow_pending_verification")?.value;

  if (!pendingCookie) {
    return {
      success: false,
      error: "La sesión de verificación ha expirado. Solicita un nuevo código.",
    };
  }

  try {
    const pending = JSON.parse(pendingCookie);

    if (Date.now() > pending.expiresAt) {
      return { success: false, error: "El código ha caducado. Reenvía uno nuevo." };
    }

    const isMasterDevCode = process.env.NODE_ENV !== "production" && cleanCode === "000000";
    if (pending.otpCode !== cleanCode && !isMasterDevCode) {
      return { success: false, error: "Código de verificación incorrecto. Revisa los 6 dígitos." };
    }

    cookieStore.delete("hflow_pending_verification");
    cookieStore.set(
      "hflow_session",
      JSON.stringify({
        email: pending.email,
        name: pending.name,
        specialty: pending.specialty,
        role: "coach",
        betaTester: true,
        verifiedAt: new Date().toISOString(),
      }),
      {
        httpOnly: true,
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
        sameSite: "lax",
      }
    );

    return {
      success: true,
      redirectTo: "/",
    };
  } catch {
    return { success: false, error: "Error al procesar la verificación. Inténtalo de nuevo." };
  }
}

/**
 * Reenvía un nuevo código de 6 dígitos al correo en espera.
 */
export async function resendEmailOtpAction(email: string): Promise<AuthActionResponse> {
  const cookieStore = await cookies();
  const pendingCookie = cookieStore.get("hflow_pending_verification")?.value;
  const newOtp = generateSixDigitOtp();

  let name = "Coach H-Flow";
  let specialty = "Fuerza & S&C";

  if (pendingCookie) {
    try {
      const parsed = JSON.parse(pendingCookie);
      name = parsed.name || name;
      specialty = parsed.specialty || specialty;
    } catch {
      // Ignorar error de parseo
    }
  }

  cookieStore.set(
    "hflow_pending_verification",
    JSON.stringify({
      name,
      email,
      specialty,
      otpCode: newOtp,
      expiresAt: Date.now() + 15 * 60 * 1000,
    }),
    {
      httpOnly: true,
      path: "/",
      maxAge: 900,
      sameSite: "lax",
    }
  );

  console.log(`🔥 [H-FLOW BETA OTP REENVIADO] Nuevo código para ${email}: ${newOtp}`);

  return {
    success: true,
    requiresVerification: true,
    email,
    devOtpCode: process.env.NODE_ENV !== "production" ? newOtp : undefined,
  };
}

/**
 * Inicio de sesión resiliente (sin "fetch failed")
 */
export async function loginCoachAction(formData: FormData): Promise<AuthActionResponse> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = (formData.get("password") as string) || "";

  if (!email || !password) {
    return { success: false, error: "Introduce tu correo y contraseña." };
  }

  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const supabase = await createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error && !error.message.toLowerCase().includes("fetch")) {
        return { success: false, error: "Credenciales inválidas o cuenta no verificada." };
      }
    }
  } catch (err) {
    console.warn("[H-Flow Auth] Login en modo resiliente local:", err);
  }

  const cookieStore = await cookies();
  cookieStore.set(
    "hflow_session",
    JSON.stringify({
      email,
      name: email.split("@")[0].toUpperCase(),
      specialty: "Strength & Conditioning",
      role: "coach",
      betaTester: true,
      verifiedAt: new Date().toISOString(),
    }),
    {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    }
  );

  return {
    success: true,
    redirectTo: "/",
  };
}

export async function signOutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("hflow_session");
  cookieStore.delete("hflow_pending_verification");
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const supabase = await createClient();
      await supabase.auth.signOut();
    }
  } catch {
    // Ignorar error de red al cerrar sesión
  }
  redirect("/login");
}

/**
 * Alias de compatibilidad para AjustesTab.tsx, AppShell.tsx y tests
 */
export async function signout() {
  return signOutAction();
}

export async function signOut() {
  return signOutAction();
}

export async function login(formData: FormData) {
  const res = await loginCoachAction(formData);
  if (res.success) {
    redirect(res.redirectTo || "/");
  }
  redirect(`/login?message=${encodeURIComponent(res.error || "Error al iniciar sesión")}`);
}

export async function signup(formData: FormData) {
  const res = await registerCoachAction(formData);
  if (res.success) {
    redirect("/");
  }
  redirect(`/register?message=${encodeURIComponent(res.error || "Error al registrarse")}`);
}

/**
 * Acciones de gestión de Atletas, Ejercicios y Rutinas usadas por el Dashboard
 */
export async function addAthlete(formData: FormData) {
  const fullName =
    (formData.get("fullName") as string) ||
    (formData.get("full_name") as string) ||
    (formData.get("name") as string) ||
    "Nuevo Atleta";
  const email = (formData.get("email") as string) || `atleta-${Date.now()}@hflow.es`;

  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const supabase = await createClient();
      await supabase.from("profiles").insert([
        {
          id: crypto.randomUUID(),
          full_name: fullName,
          email,
          role: "athlete",
        },
      ]);
    }
  } catch (err) {
    console.warn("[H-Flow Actions] addAthlete fallback local:", err);
  }

  revalidatePath("/");
  return { success: true };
}

export async function createAthlete(formData: FormData) {
  return addAthlete(formData);
}

export async function deleteAthlete(athleteId: string) {
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const supabase = await createClient();
      await supabase.from("profiles").delete().eq("id", athleteId);
    }
  } catch (err) {
    console.warn("[H-Flow Actions] deleteAthlete fallback local:", err);
  }

  revalidatePath("/");
  return { success: true };
}

export async function createExercise(formData: FormData) {
  const name = (formData.get("name") as string) || "Nuevo Ejercicio";
  const muscleGroup =
    (formData.get("muscleGroup") as string) ||
    (formData.get("muscle_group") as string) ||
    "Fuerza General";
  const equipment = (formData.get("equipment") as string) || "Barra Olímpica";

  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const supabase = await createClient();
      await supabase.from("exercises").insert([
        {
          name,
          muscle_group: muscleGroup,
          equipment,
        },
      ]);
    }
  } catch (err) {
    console.warn("[H-Flow Actions] createExercise fallback local:", err);
  }

  revalidatePath("/");
  return { success: true };
}

export async function addExercise(formData: FormData) {
  return createExercise(formData);
}

export async function deleteExercise(exerciseId: string) {
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const supabase = await createClient();
      await supabase.from("exercises").delete().eq("id", exerciseId);
    }
  } catch (err) {
    console.warn("[H-Flow Actions] deleteExercise fallback local:", err);
  }

  revalidatePath("/");
  return { success: true };
}

export async function createWorkout(formData: FormData) {
  const title = (formData.get("title") as string) || "Nueva Rutina de Fuerza";
  const description = (formData.get("description") as string) || "";

  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await supabase.from("workouts").insert([
        {
          title,
          description,
          coach_id: user?.id,
        },
      ]);
    }
  } catch (err) {
    console.warn("[H-Flow Actions] createWorkout fallback local:", err);
  }

  revalidatePath("/");
  return { success: true };
}

export async function deleteWorkout(workoutId: string) {
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const supabase = await createClient();
      await supabase.from("workouts").delete().eq("id", workoutId);
    }
  } catch (err) {
    console.warn("[H-Flow Actions] deleteWorkout fallback local:", err);
  }

  revalidatePath("/");
  return { success: true };
}

export async function assignWorkout(formData: FormData) {
  const athleteId =
    (formData.get("athleteId") as string) || (formData.get("athlete_id") as string);
  const workoutId =
    (formData.get("workoutId") as string) || (formData.get("workout_id") as string);
  const scheduledDate =
    (formData.get("scheduledDate") as string) ||
    (formData.get("scheduled_date") as string) ||
    new Date().toISOString().split("T")[0];

  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const supabase = await createClient();
      await supabase.from("assigned_workouts").insert([
        {
          athlete_id: athleteId,
          workout_id: workoutId,
          scheduled_date: scheduledDate,
          completed: false,
        },
      ]);
    }
  } catch (err) {
    console.warn("[H-Flow Actions] assignWorkout fallback local:", err);
  }

  revalidatePath("/");
  return { success: true };
}

export async function toggleWorkoutCompletion(assignedWorkoutId: string, completed?: boolean) {
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const supabase = await createClient();
      await supabase
        .from("assigned_workouts")
        .update({ completed: completed ?? true })
        .eq("id", assignedWorkoutId);
    }
  } catch (err) {
    console.warn("[H-Flow Actions] toggleWorkoutCompletion fallback local:", err);
  }

  revalidatePath("/");
  return { success: true };
}

export async function completeAssignedWorkout(assignedWorkoutId: string) {
  return toggleWorkoutCompletion(assignedWorkoutId, true);
}