# H-FLOW | Estado del proyecto

## Resumen ejecutivo

H-FLOW es una plataforma para entrenadores con API Express/Prisma, panel web
Next.js, base de datos PostgreSQL, portal de atletas y herramientas de planes,
retención, facturación y marketing. La API y el panel se sirven, por defecto,
en `http://localhost:3000` y `http://localhost:3001`, respectivamente.

## Endpoints del backend

Salvo indicación contraria, los endpoints siguientes requieren autenticación
JWT de entrenador.

| Área | Método | Endpoint | Acceso |
|---|---|---|---|
| Estado | GET | `/` | Público |
| Atletas | POST | `/api/athletes` | Entrenador |
| Atletas | GET | `/api/athletes` | Entrenador; los administradores configurados ven todos los atletas |
| Atletas | GET | `/api/athletes/trainer/:trainerId` | Entrenador |
| Atletas | GET | `/api/athletes/:id` | Entrenador |
| Atletas | PUT | `/api/athletes/:id` | Entrenador |
| Atletas | DELETE | `/api/athletes/:id` | Entrenador |
| Atletas | PUT | `/api/athletes/:id/avatar` | Entrenador |
| Atletas | PATCH | `/api/athletes/:athleteId/metrics` | Entrenador |
| Atletas | POST | `/api/athletes/import-csv` | Entrenador |
| Autenticación | POST | `/api/auth/register` | Público |
| Autenticación | POST | `/api/auth/login` | Público |
| Check-ins | POST | `/api/checkins` | Entrenador |
| Check-ins | GET | `/api/checkins/:athleteId` | Entrenador |
| Dashboard | GET | `/api/dashboard/stats` | Entrenador |
| Dashboard | GET | `/api/dashboard/retention-alerts` | Entrenador |
| Dashboard | GET | `/api/dashboard/export-report` | Entrenador |
| Planes con IA | POST | `/api/ai/generate-plan` | Entrenador |
| Marketing | POST | `/api/marketing/generate` | Entrenador |
| Marketing | POST | `/api/marketing/schedule` | Entrenador |
| Marketing | GET | `/api/marketing/episodes` | Entrenador |
| Marketing | GET | `/api/marketing/episodes/:episodeId/video` | Entrenador |
| Marketing | GET | `/api/marketing/episodes/:episodeId/audio` | Entrenador |
| Nutrición | POST | `/api/nutrition` | Entrenador |
| Nutrición | GET | `/api/nutrition` | Entrenador |
| Nutrición | GET | `/api/nutrition/:planId` | Entrenador |
| Nutrición | PATCH | `/api/nutrition/:planId` | Entrenador |
| Nutrición | DELETE | `/api/nutrition/:planId` | Entrenador |
| Pagos | POST | `/api/payments/webhook` | Público; validación del webhook Stripe |
| Pagos | GET | `/api/payments/subscription` | Entrenador |
| Pagos | POST | `/api/payments/checkout` | Entrenador |
| Perfil | GET | `/api/profile` | Entrenador |
| Perfil | PUT | `/api/profile` | Entrenador |
| Portal de atletas | POST | `/api/athlete-portal/access` | Entrenador |
| Portal de atletas | GET | `/api/athlete-portal/me` | Token de portal |
| Portal de atletas | POST | `/api/athlete-portal/checkins` | Token de portal |
| Portal de atletas | GET | `/api/athlete-portal/workouts/:planId/pdf` | Token de portal |
| Portal de atletas | GET | `/api/athlete-portal/nutrition/:planId/pdf` | Token de portal |
| Entrenamiento | POST | `/api/workouts` | Entrenador |
| Entrenamiento | GET | `/api/workouts` | Entrenador |
| Entrenamiento | GET | `/api/workouts/:id` | Entrenador |
| Entrenamiento | PUT / PATCH | `/api/workouts/:id` / `/api/workouts/:planId` | Entrenador |
| Entrenamiento | DELETE | `/api/workouts/:id` | Entrenador |
| Entrenamiento | GET | `/api/workouts/:id/pdf` | Entrenador |

La documentación interactiva de la API está disponible en
`http://localhost:3000/api-docs`.
Los identificadores con permisos administrativos se configuran mediante
`ADMIN_TRAINER_IDS`.

## Vistas del frontend

| Ruta | Vista |
|---|---|
| `/` | Landing page B2B de H-FLOW |
| `/login` | Inicio de sesión |
| `/register` | Registro de entrenador |
| `/dashboard` | Resumen, métricas y alertas de retención |
| `/dashboard/athletes` | Listado, alta e importación de atletas |
| `/dashboard/athletes/[id]` | Detalle del atleta, progreso, gráfica y acceso al portal |
| `/dashboard/plans` | Creación y asignación de planes de entrenamiento y nutrición, con asistencia de IA |
| `/dashboard/workouts` | Placeholder informativo; la gestión de rutinas está disponible desde Planes |
| `/dashboard/marketing` | Programación y seguimiento de Reels con reproducción de audio y vídeo |
| `/dashboard/billing` | Suscripción, uso de IA e inicio de Stripe Checkout |
| `/dashboard/settings` | Perfil profesional, seguridad y recursos de marca |
| `/portal/[token]` | Portal del atleta con planes, PDFs, evolución y check-ins |

## Puesta en marcha completa con Docker Compose

Requisitos: Node.js 20 o superior, npm y Docker con Docker Compose.

Desde la raíz del repositorio:

1. Crear el archivo de entorno desde la plantilla:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Editar `.env` y sustituir `POSTGRES_PASSWORD` por una contraseña segura
   compatible con URL y `JWT_SECRET` por un secreto aleatorio de al menos
   32 caracteres. Las variables opcionales de OpenAI, Stripe, correo e
   Instagram se pueden completar según las integraciones que se vayan a usar.
3. Construir y arrancar PostgreSQL, backend y frontend:

   ```sh
   docker compose up --build
   ```

   En el arranque, el backend espera a que PostgreSQL esté disponible y aplica
   las migraciones Prisma automáticamente.
4. Abrir los servicios:
   - Panel web: <http://localhost:3001>
   - API: <http://localhost:3000>
   - Documentación API: <http://localhost:3000/api-docs>

Para detener los servicios sin borrar los datos persistidos:

```sh
docker compose down
```

La guía de desarrollo local y los comandos de pruebas están en
[`README.md`](./README.md).
