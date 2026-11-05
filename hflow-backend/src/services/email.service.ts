import nodemailer, { type Transporter } from "nodemailer";

type EmailContent = {
  subject: string;
  text: string;
  html: string;
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function renderEmail(content: { preheader: string; heading: string; body: string }): string {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(content.heading)}</title>
  </head>
  <body style="margin:0;background:#f3f5f9;font-family:Arial,Helvetica,sans-serif;color:#182230">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(content.preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f5f9;padding:36px 16px">
      <tr><td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border-radius:12px;overflow:hidden">
          <tr><td style="background:#172554;padding:24px 36px;color:#fff;font-size:20px;font-weight:700;letter-spacing:1px">H-FLOW</td></tr>
          <tr><td style="padding:36px">
            <h1 style="margin:0 0 20px;font-size:26px;line-height:1.3;color:#172554">${escapeHtml(content.heading)}</h1>
            ${content.body}
            <p style="margin:32px 0 0;color:#526174">El equipo de H-Flow</p>
          </td></tr>
          <tr><td style="padding:20px 36px;background:#f8fafc;color:#718096;font-size:12px">Este mensaje se ha enviado automáticamente. No respondas a este correo.</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export class EmailService {
  private transporter: Transporter | undefined;

  private getTransporter(): Transporter {
    if (this.transporter) return this.transporter;

    const host = requireEnv("SMTP_HOST");
    const portValue = process.env.SMTP_PORT?.trim() || "587";
    const port = Number(portValue);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error("SMTP_PORT must be an integer between 1 and 65535");
    }

    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASSWORD;
    if (Boolean(user) !== Boolean(pass)) {
      throw new Error("SMTP_USER and SMTP_PASSWORD must both be configured or both be empty");
    }

    const secureValue = process.env.SMTP_SECURE?.trim().toLowerCase();
    if (secureValue && !["true", "false"].includes(secureValue)) {
      throw new Error("SMTP_SECURE must be true or false");
    }

    const secure = secureValue ? secureValue === "true" : port === 465;
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      ...(user && pass && !secure ? { requireTLS: true } : {}),
      ...(user && pass ? { auth: { user, pass } } : {}),
    });
    return this.transporter;
  }

  private async send(email: string, content: EmailContent): Promise<void> {
    await this.getTransporter().sendMail({
      from: requireEnv("SMTP_FROM"),
      to: email,
      subject: content.subject,
      text: content.text,
      html: content.html,
    });
  }

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    await this.send(email, {
      subject: "Te damos la bienvenida a H-Flow",
      text: `Hola ${name},\n\nTu cuenta de H-Flow ya está lista. Desde tu panel puedes organizar el seguimiento de tus atletas y sus planes de entrenamiento.\n\nEl equipo de H-Flow`,
      html: renderEmail({
        preheader: "Tu espacio de entrenador ya está listo.",
        heading: `Te damos la bienvenida, ${name}`,
        body: "<p style=\"margin:0;font-size:16px;line-height:1.7;color:#526174\">Tu cuenta ya está lista. Desde tu panel puedes organizar el seguimiento de tus atletas y sus planes de entrenamiento.</p>",
      }),
    });
  }

  async sendPasswordReset(email: string, token: string): Promise<void> {
    const resetUrl = new URL(requireEnv("PASSWORD_RESET_URL"));
    if (!["http:", "https:"].includes(resetUrl.protocol)) {
      throw new Error("PASSWORD_RESET_URL must use HTTP or HTTPS");
    }
    resetUrl.searchParams.set("token", token);
    const link = resetUrl.toString();
    await this.send(email, {
      subject: "Restablece tu contraseña de H-Flow",
      text: `Recibimos una solicitud para restablecer tu contraseña de H-Flow.\n\nUsa este enlace para continuar: ${link}\n\nSi no solicitaste este cambio, puedes ignorar este mensaje.`,
      html: renderEmail({
        preheader: "Enlace seguro para restablecer tu contraseña.",
        heading: "Restablece tu contraseña",
        body: `<p style="margin:0 0 24px;font-size:16px;line-height:1.7;color:#526174">Recibimos una solicitud para restablecer tu contraseña. Usa el botón para continuar. Si no solicitaste este cambio, puedes ignorar este mensaje.</p><p style="margin:0 0 24px"><a href="${escapeHtml(link)}" style="display:inline-block;padding:13px 22px;background:#2563eb;border-radius:6px;color:#fff;text-decoration:none;font-weight:700">Restablecer contraseña</a></p><p style="margin:0;font-size:13px;line-height:1.6;color:#718096">Si el botón no funciona, copia este enlace en tu navegador:<br><a href="${escapeHtml(link)}" style="color:#2563eb;word-break:break-all">${escapeHtml(link)}</a></p>`,
      }),
    });
  }

  async sendNewPlanNotification(athleteEmail: string, planType: string): Promise<void> {
    const safePlanType = escapeHtml(planType);
    await this.send(athleteEmail, {
      subject: "Tienes un nuevo plan en H-Flow",
      text: `Tu entrenador ha preparado un nuevo plan (${planType}) para ti. Inicia sesión en H-Flow para consultarlo.`,
      html: renderEmail({
        preheader: "Tu entrenador ha preparado un nuevo plan para ti.",
        heading: "Tienes un nuevo plan",
        body: `<p style="margin:0;font-size:16px;line-height:1.7;color:#526174">Tu entrenador ha preparado un nuevo plan de <strong style="color:#172554">${safePlanType}</strong> para ti. Inicia sesión en H-Flow para consultar los detalles y empezar.</p>`,
      }),
    });
  }

  async sendWorkoutReminder(
    athleteEmail: string,
    athleteName: string,
    planTitles: string[],
  ): Promise<void> {
    const safeName = escapeHtml(athleteName);
    const safeTitles = planTitles.map(escapeHtml);
    const planList = safeTitles.map((title) => `<li style="margin:0 0 8px">${title}</li>`).join("");
    const plainPlanList = planTitles.map((title) => `- ${title}`).join("\n");
    await this.send(athleteEmail, {
      subject: "Tu entrenamiento de hoy te espera",
      text: `Hola ${athleteName},\n\nHoy tienes estos planes de entrenamiento:\n${plainPlanList}\n\nCada paso cuenta. ¡Mucho éxito!\n\nEl equipo de H-Flow`,
      html: renderEmail({
        preheader: "Un recordatorio para tu entrenamiento de hoy.",
        heading: `¡Vamos con todo, ${safeName}!`,
        body: `<p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#526174">Hoy tienes programado${planTitles.length === 1 ? "" : "s"}:</p><ul style="margin:0;padding:0 0 0 22px;font-size:16px;line-height:1.7;color:#172554">${planList}</ul><p style="margin:24px 0 0;font-size:16px;line-height:1.7;color:#526174">Cada paso cuenta. ¡Mucho éxito en tu entrenamiento de hoy!</p>`,
      }),
    });
  }
}

export const emailService = new EmailService();
