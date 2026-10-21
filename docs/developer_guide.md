# Guía rápida para desarrolladores

## Requisitos

- Git
- Node.js y npm
- Un proyecto Supabase con URL, clave `anon` y clave `service_role`
- Una clave de API de Groq
- Claves de Stripe para ejecutar las funciones de pago

## 1. Clonar el repositorio

```bash
git clone https://github.com/hectornunezz/H-Flow.git
cd H-Flow
```

## 2. Instalar dependencias

```bash
npm install
```

## 3. Configurar las variables de entorno

Crea `.env.local` en la raíz del proyecto y añade las credenciales de tus entornos de desarrollo:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>
GROQ_API_KEY=<groq-api-key>
STRIPE_SECRET_KEY=<stripe-secret-key>
STRIPE_PRICE_ID=<stripe-recurring-price-id>
STRIPE_WEBHOOK_SECRET=<stripe-webhook-secret>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`npm run dev` carga `.env.local` y comprueba que estén definidas `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `GROQ_API_KEY`. Las variables de Stripe son necesarias solo para probar sus funciones. No uses valores de producción en un equipo compartido. No compartas ni confirmes `.env.local` en Git.

Las integraciones opcionales requieren variables adicionales:

```dotenv
CRON_SECRET=<cron-secret>
ENCRYPTION_KEY=<base64-encoded-32-byte-key>
VAPID_SUBJECT=mailto:<contact-email>
VAPID_PUBLIC_KEY=<vapid-public-key>
VAPID_PRIVATE_KEY=<vapid-private-key>
WHATSAPP_ACCESS_TOKEN=<whatsapp-access-token>
WHATSAPP_APP_SECRET=<whatsapp-app-secret>
WHATSAPP_VERIFY_TOKEN=<whatsapp-verify-token>
LLM_BASE_URL=http://127.0.0.1:3001/v1
LLM_API_KEY=<llm-api-key>
LLM_MODEL=auto
```

Define solo las variables de integraciones que vayas a probar. Configura también las tablas, políticas RLS, buckets y webhooks requeridos por cada integración.

## 4. Arrancar el servidor de desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en el navegador. El servidor de desarrollo recarga los cambios automáticamente.

## Comandos útiles

```bash
npm run lint
npm test
npx tsc --noEmit
```
