# H-Flow

H-Flow es una plataforma SaaS B2B impulsada por IA para Entrenadores de Élite. Centraliza la gestión de atletas, rutinas y tareas, y convierte reportes de voz en información estructurada para facilitar el seguimiento diario.

## Arquitectura del sistema

- **Next.js App Router:** interfaz web, rutas de la aplicación y lógica de servidor mediante Server Components, Client Components y Server Actions.
- **Supabase:** autenticación y persistencia de perfiles, rutinas, bloques de entrenamiento, ejercicios y tareas.
- **Groq Whisper:** transcripción de audio a texto.
- **FreeLLMAPI:** procesamiento del texto transcrito para extraer información accionable y estructurar tareas.

## Flujo de datos: de audio a tarea

1. El entrenador proporciona un audio de WhatsApp desde la interfaz de H-Flow.
2. El audio se envía al flujo de procesamiento del servidor.
3. Groq Whisper transcribe el audio a texto.
4. FreeLLMAPI analiza la transcripción e identifica los datos relevantes, como el atleta, la actividad, la fecha y la hora.
5. La aplicación presenta la información estructurada para que el entrenador pueda revisarla.
6. Al confirmarla, H-Flow persiste la tarea y sus datos relacionados en Supabase.
7. La tarea queda disponible en el calendario y en el panel de seguimiento.

## Decisiones de diseño

- **Dark Mode:** la interfaz utiliza una base oscura para mantener una experiencia cómoda y consistente en el entorno de trabajo del entrenador.
- **Glassmorphism:** paneles translúcidos, desenfoque y bordes sutiles aportan jerarquía visual sin recargar la interfaz.
- **Mobile-First:** componentes y vistas adaptables priorizan el uso desde dispositivos móviles, donde los entrenadores suelen consultar reportes y tareas.
- **Acento de marca:** el naranja `#FF5A00` destaca acciones principales y estados importantes.

## Variables de entorno en Vercel

Configura estas variables en **Vercel → Project Settings → Environment Variables** para los entornos que correspondan. No guardes sus valores en `vercel.json` ni en el repositorio:

| Variable | Uso |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública anon de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave privada para operaciones administrativas del webhook Stripe |
| `GROQ_API_KEY` | Autenticación con la API de Groq |
| `STRIPE_SECRET_KEY` | Clave privada de Stripe |
| `STRIPE_WEBHOOK_SECRET` | Secreto de firma del webhook Stripe |
| `STRIPE_PRICE_ID` | ID del precio recurrente de Stripe |
| `NEXT_PUBLIC_APP_URL` | URL HTTPS pública de la aplicación |

En Stripe, configura el webhook para `POST /api/stripe/webhook` y suscribe el evento `checkout.session.completed`.
