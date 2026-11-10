import swaggerJsdoc from "swagger-jsdoc";

const response = (description: string) => ({ description });
const jsonBody = (schema: Record<string, unknown>, required = true) => ({
  required,
  content: { "application/json": { schema } },
});
const idParameter = (name = "id") => ({
  name,
  in: "path",
  required: true,
  schema: { type: "string" },
});
const secured = [{ bearerAuth: [] }];

const definition = {
  openapi: "3.0.3",
  info: {
    title: "H-FLOW API",
    version: "1.0.0",
    description: "API para gestionar entrenadores, atletas y planes de H-FLOW.",
  },
  servers: [{ url: "/" }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: { message: { type: "string" } },
          },
        },
      },
      Credentials: {
        type: "object",
        required: ["email", "password"],
        additionalProperties: false,
        properties: {
          email: { type: "string", format: "email", maxLength: 254 },
          password: { type: "string", minLength: 8, maxLength: 72 },
        },
      },
      Registration: {
        allOf: [
          { $ref: "#/components/schemas/Credentials" },
          {
            type: "object",
            required: ["name"],
            properties: { name: { type: "string", minLength: 1, maxLength: 100 } },
          },
        ],
      },
      AthleteInput: {
        type: "object",
        required: ["name", "objective", "currentWeight"],
        properties: {
          name: { type: "string", minLength: 1, maxLength: 100 },
          objective: { type: "string", minLength: 1, maxLength: 500 },
          currentWeight: { type: "number", exclusiveMinimum: 0 },
          trainerId: { type: "string" },
          email: { type: "string", format: "email" },
        },
      },
      WorkoutPlanInput: {
        type: "object",
        required: ["title", "description", "athleteId"],
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          athleteId: { type: "string" },
          scheduledAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      NutritionPlanInput: {
        type: "object",
        required: ["details", "calories", "athleteId"],
        properties: {
          details: { type: "string" },
          calories: { type: "integer", minimum: 0 },
          athleteId: { type: "string" },
        },
      },
      MarketingScheduleInput: {
        type: "object",
        required: ["topic", "audience", "tone"],
        properties: {
          topic: { type: "string", maxLength: 300 },
          audience: { type: "string" },
          tone: { type: "string" },
          scheduledAt: { type: "string", format: "date-time" },
        },
      },
      MarketingGenerateInput: {
        type: "object",
        required: ["topic", "audience", "tone"],
        additionalProperties: false,
        properties: {
          topic: { type: "string", minLength: 1, maxLength: 300 },
          audience: { type: "string", minLength: 1, maxLength: 200 },
          tone: { type: "string", minLength: 1, maxLength: 120 },
          durationSeconds: { type: "number", minimum: 5, maximum: 60 },
        },
      },
    },
  },
  paths: {
    "/api/auth/register": {
      post: {
        tags: ["auth"],
        summary: "Registrar entrenador",
        requestBody: jsonBody({ $ref: "#/components/schemas/Registration" }),
        responses: {
          "201": response("Cuenta creada y token emitido."),
          "400": response("Datos de registro no válidos."),
          "409": response("El correo ya está registrado."),
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["auth"],
        summary: "Iniciar sesión",
        requestBody: jsonBody({ $ref: "#/components/schemas/Credentials" }),
        responses: {
          "200": response("Autenticación correcta; devuelve el token."),
          "401": response("Credenciales incorrectas."),
          "400": response("Datos no válidos."),
        },
      },
    },
    "/api/athletes": {
      get: {
        tags: ["athletes"],
        summary: "Listar atletas propios o todos los atletas como administrador",
        security: secured,
        parameters: [
          { name: "search", in: "query", schema: { type: "string", maxLength: 100 }, description: "Filtra por nombre, correo u objetivo." },
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
        ],
        responses: { "200": response("Lista paginada de atletas y metadatos de paginación."), "400": response("Parámetros de consulta no válidos."), "401": response("No autenticado.") },
      },
      post: {
        tags: ["athletes"],
        summary: "Crear atleta",
        security: secured,
        requestBody: jsonBody({ $ref: "#/components/schemas/AthleteInput" }),
        responses: { "201": response("Atleta creado."), "400": response("Datos no válidos."), "401": response("No autenticado.") },
      },
    },
    "/api/athletes/import-csv": {
      post: {
        tags: ["athletes"],
        summary: "Importar atletas desde un archivo CSV",
        security: secured,
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["file"],
                properties: { file: { type: "string", format: "binary" } },
              },
            },
          },
        },
        responses: {
          "201": response("Cantidad de atletas importados."),
          "400": response("Archivo o filas CSV no válidas."),
          "401": response("No autenticado."),
          "413": response("El archivo supera 5 MB."),
        },
      },
    },
    "/api/athletes/trainer/{trainerId}": {
      get: {
        tags: ["athletes"],
        summary: "Listar atletas de un entrenador",
        security: secured,
        parameters: [idParameter("trainerId")],
        responses: { "200": response("Lista de atletas."), "401": response("No autenticado."), "403": response("Sin permiso para acceder a este entrenador.") },
      },
    },
    "/api/athletes/{id}": {
      get: {
        tags: ["athletes"],
        summary: "Obtener atleta",
        security: secured,
        parameters: [idParameter()],
        responses: { "200": response("Detalle del atleta."), "401": response("No autenticado."), "404": response("Atleta no encontrado.") },
      },
      put: {
        tags: ["athletes"],
        summary: "Actualizar atleta",
        security: secured,
        parameters: [idParameter()],
        requestBody: jsonBody({ type: "object", minProperties: 1, properties: {
          name: { type: "string" }, objective: { type: "string" }, currentWeight: { type: "number" },
          isActive: { type: "boolean" }, email: { type: "string", format: "email", nullable: true },
        } }),
        responses: { "200": response("Atleta actualizado."), "400": response("Datos no válidos."), "404": response("Atleta no encontrado.") },
      },
      delete: {
        tags: ["athletes"],
        summary: "Eliminar atleta",
        security: secured,
        parameters: [idParameter()],
        responses: { "204": response("Atleta eliminado."), "401": response("No autenticado."), "404": response("Atleta no encontrado.") },
      },
    },
    "/api/athletes/{id}/avatar": {
      put: {
        tags: ["athletes"],
        summary: "Subir o actualizar avatar",
        security: secured,
        parameters: [idParameter()],
        requestBody: {
          required: true,
          content: { "multipart/form-data": { schema: { type: "object", required: ["avatar"], properties: { avatar: { type: "string", format: "binary" } } } } },
        },
        responses: { "200": response("Avatar actualizado."), "400": response("Imagen no válida."), "413": response("La imagen supera el tamaño permitido.") },
      },
    },
    "/api/athletes/{athleteId}/metrics": {
      patch: {
        tags: ["athletes"],
        summary: "Actualizar métricas del atleta",
        security: secured,
        parameters: [idParameter("athleteId")],
        requestBody: jsonBody({ type: "object", minProperties: 1, properties: {
          objective: { type: "string" }, currentWeight: { type: "number", exclusiveMinimum: 0 },
        } }),
        responses: { "200": response("Métricas actualizadas."), "400": response("Datos no válidos."), "404": response("Atleta no encontrado.") },
      },
    },
    "/api/workouts": {
      get: {
        tags: ["workouts"],
        summary: "Listar planes de entrenamiento",
        security: secured,
        parameters: [{ name: "athleteId", in: "query", schema: { type: "string" } }],
        responses: { "200": response("Lista de planes."), "401": response("No autenticado.") },
      },
      post: {
        tags: ["workouts"],
        summary: "Crear plan de entrenamiento",
        security: secured,
        requestBody: jsonBody({ $ref: "#/components/schemas/WorkoutPlanInput" }),
        responses: { "201": response("Plan creado."), "400": response("Datos no válidos."), "404": response("Atleta no encontrado.") },
      },
    },
    "/api/workouts/{id}/clone": {
      post: {
        tags: ["workouts"],
        summary: "Clonar microciclo para la semana siguiente",
        description: "Crea un plan nuevo vinculado al original; conserva la prescripción y avanza la fecha siete días sin modificar el histórico.",
        security: secured,
        parameters: [idParameter()],
        responses: {
          "201": response("Microciclo clonado."),
          "401": response("No autenticado."),
          "404": response("Plan no encontrado."),
        },
      },
    },
    "/api/workouts/reports": {
      get: {
        tags: ["workouts"],
        summary: "Comparativa de RIR pautado y ejecución real",
        security: secured,
        parameters: [{ name: "athleteId", in: "query", schema: { type: "string" } }],
        responses: {
          "200": response("Registros de series con plan y atleta."),
          "401": response("No autenticado."),
        },
      },
    },
    "/api/workouts/reports/sets": {
      post: {
        tags: ["workouts"],
        summary: "Registrar una serie en el hub de reportes",
        security: secured,
        requestBody: jsonBody({
          type: "object",
          required: ["workoutPlanId", "exercise", "setNumber", "targetRir"],
          properties: {
            workoutPlanId: { type: "string" },
            exercise: { type: "string", maxLength: 120 },
            setNumber: { type: "integer", minimum: 1, maximum: 50 },
            targetRir: { type: "number", minimum: 0, maximum: 10 },
          },
        }),
        responses: {
          "201": response("Serie añadida al informe."),
          "400": response("Datos no válidos."),
          "404": response("Plan no encontrado."),
        },
      },
    },
    "/api/workouts/reports/sets/{setId}": {
      patch: {
        tags: ["workouts"],
        summary: "Actualizar kilos y RIR reales de una serie",
        security: secured,
        parameters: [idParameter("setId")],
        requestBody: jsonBody({
          type: "object",
          minProperties: 1,
          properties: {
            actualRir: { type: "number", minimum: 0, maximum: 10, nullable: true },
            actualKg: { type: "number", minimum: 0, maximum: 1000, nullable: true },
          },
        }),
        responses: {
          "200": response("Ejecución actualizada."),
          "400": response("Datos no válidos."),
          "404": response("Serie no encontrada."),
        },
      },
    },
    "/api/workouts/reports/sets/{setId}/video": {
      get: {
        tags: ["workouts"],
        summary: "Reproducir el vídeo privado de una serie",
        security: secured,
        parameters: [idParameter("setId")],
        responses: {
          "200": {
            description: "Vídeo de la ejecución.",
            content: {
              "video/mp4": { schema: { type: "string", format: "binary" } },
              "video/webm": { schema: { type: "string", format: "binary" } },
              "video/quicktime": { schema: { type: "string", format: "binary" } },
            },
          },
          "404": response("Vídeo no encontrado."),
        },
      },
      post: {
        tags: ["workouts"],
        summary: "Subir o reemplazar el vídeo de una serie efectiva",
        security: secured,
        parameters: [idParameter("setId")],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["video"],
                properties: { video: { type: "string", format: "binary" } },
              },
            },
          },
        },
        responses: {
          "200": response("Vídeo guardado."),
          "400": response("Formato de vídeo no admitido."),
          "404": response("Serie no encontrada."),
          "413": response("El vídeo supera 100 MB."),
        },
      },
    },
    "/api/workouts/{id}": {
      get: {
        tags: ["workouts"],
        summary: "Obtener plan de entrenamiento",
        security: secured,
        parameters: [idParameter()],
        responses: { "200": response("Detalle del plan."), "404": response("Plan no encontrado.") },
      },
      put: {
        tags: ["workouts"],
        summary: "Actualizar plan de entrenamiento",
        security: secured,
        parameters: [idParameter()],
        requestBody: jsonBody({ $ref: "#/components/schemas/WorkoutPlanInput" }, false),
        responses: { "200": response("Plan actualizado."), "400": response("Datos no válidos."), "404": response("Plan no encontrado.") },
      },
      patch: {
        tags: ["workouts"],
        summary: "Actualizar parcialmente un plan de entrenamiento",
        security: secured,
        parameters: [{ name: "planId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: jsonBody({ $ref: "#/components/schemas/WorkoutPlanInput" }, false),
        responses: { "200": response("Plan actualizado."), "404": response("Plan no encontrado.") },
      },
      delete: {
        tags: ["workouts"],
        summary: "Eliminar plan de entrenamiento",
        security: secured,
        parameters: [idParameter()],
        responses: { "204": response("Plan eliminado."), "404": response("Plan no encontrado.") },
      },
    },
    "/api/workouts/{id}/pdf": {
      get: {
        tags: ["workouts"],
        summary: "Descargar plan de entrenamiento en PDF",
        security: secured,
        parameters: [idParameter()],
        responses: { "200": { description: "Documento PDF.", content: { "application/pdf": { schema: { type: "string", format: "binary" } } } }, "404": response("Plan no encontrado.") },
      },
    },
    "/api/nutrition": {
      get: {
        tags: ["nutrition"],
        summary: "Listar planes nutricionales",
        security: secured,
        parameters: [{ name: "athleteId", in: "query", schema: { type: "string" } }],
        responses: { "200": response("Lista de planes."), "401": response("No autenticado.") },
      },
      post: {
        tags: ["nutrition"],
        summary: "Crear plan nutricional",
        security: secured,
        requestBody: jsonBody({ $ref: "#/components/schemas/NutritionPlanInput" }),
        responses: { "201": response("Plan creado."), "400": response("Datos no válidos."), "404": response("Atleta no encontrado.") },
      },
    },
    "/api/nutrition/{planId}": {
      get: {
        tags: ["nutrition"],
        summary: "Obtener plan nutricional",
        security: secured,
        parameters: [idParameter("planId")],
        responses: { "200": response("Detalle del plan."), "404": response("Plan no encontrado.") },
      },
      patch: {
        tags: ["nutrition"],
        summary: "Actualizar plan nutricional",
        security: secured,
        parameters: [idParameter("planId")],
        requestBody: jsonBody({ type: "object", minProperties: 1, properties: {
          details: { type: "string" }, calories: { type: "integer", minimum: 0 }, athleteId: { type: "string" },
        } }),
        responses: { "200": response("Plan actualizado."), "400": response("Datos no válidos."), "404": response("Plan no encontrado.") },
      },
      delete: {
        tags: ["nutrition"],
        summary: "Eliminar plan nutricional",
        security: secured,
        parameters: [idParameter("planId")],
        responses: { "204": response("Plan eliminado."), "404": response("Plan no encontrado.") },
      },
    },
    "/api/marketing/generate": {
      post: {
        tags: ["marketing"],
        summary: "Generar un único vídeo de marketing bajo demanda",
        security: secured,
        requestBody: jsonBody({ $ref: "#/components/schemas/MarketingGenerateInput" }),
        responses: { "201": response("Reel generado con subtítulos y CTA."), "400": response("Datos no válidos."), "401": response("No autenticado."), "502": response("Falló la generación.") },
      },
    },
    "/api/marketing/schedule": {
      post: {
        tags: ["marketing"],
        summary: "Programar episodio de marketing",
        security: secured,
        requestBody: jsonBody({ $ref: "#/components/schemas/MarketingScheduleInput" }),
        responses: { "201": response("Episodio programado."), "400": response("Datos no válidos."), "409": response("El tema ya está programado o generado.") },
      },
    },
    "/api/marketing/episodes": {
      get: {
        tags: ["marketing"],
        summary: "Listar episodios de marketing",
        security: secured,
        responses: { "200": response("Hasta 100 episodios del entrenador."), "401": response("No autenticado.") },
      },
    },
    "/api/marketing/episodes/{episodeId}/audio": {
      get: {
        tags: ["marketing"],
        summary: "Descargar audio de un episodio",
        security: secured,
        parameters: [idParameter("episodeId")],
        responses: { "200": { description: "Audio MP3.", content: { "audio/mpeg": { schema: { type: "string", format: "binary" } } } }, "404": response("Audio no encontrado.") },
      },
    },
    "/api/marketing/episodes/{episodeId}/video": {
      get: {
        tags: ["marketing"],
        summary: "Reproducir o descargar el vídeo renderizado de un episodio",
        description: "Admite peticiones Range para reproducción en streaming. Añade download=true para descargar.",
        security: secured,
        parameters: [idParameter("episodeId")],
        responses: {
          "200": {
            description: "Vídeo MP4.",
            content: { "video/mp4": { schema: { type: "string", format: "binary" } } },
          },
          "206": { description: "Rango del vídeo MP4.", content: { "video/mp4": { schema: { type: "string", format: "binary" } } } },
          "401": response("No autenticado."),
          "404": response("Vídeo no encontrado."),
          "416": response("Rango solicitado no válido."),
        },
      },
    },
    "/api/payments/subscription": {
      get: {
        tags: ["payments"],
        summary: "Consultar plan actual y uso mensual de IA",
        security: secured,
        responses: {
          "200": response("Plan, estado de suscripción y episodios IA del mes."),
          "401": response("No autenticado."),
          "404": response("Entrenador no encontrado."),
        },
      },
    },
    "/api/payments/checkout": {
      post: {
        tags: ["payments"],
        summary: "Crear sesión de Stripe Checkout para una suscripción Pro",
        security: secured,
        responses: {
          "201": response("Sesión Checkout creada."),
          "401": response("No autenticado."),
          "502": response("No se pudo crear la sesión de Stripe."),
        },
      },
    },
    "/api/profile": {
      get: {
        tags: ["profile"],
        summary: "Consultar el perfil del entrenador autenticado",
        security: secured,
        responses: {
          "200": response("Datos de cuenta, biografía, especialidad y experiencia."),
          "401": response("No autenticado."),
          "404": response("Entrenador no encontrado."),
        },
      },
      put: {
        tags: ["profile"],
        summary: "Actualizar perfil, contraseña y avatar del entrenador",
        security: secured,
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["name", "specialty", "experienceYears", "bio"],
                properties: {
                  name: { type: "string", maxLength: 100 },
                  specialty: { type: "string", maxLength: 100 },
                  experienceYears: { type: "integer", minimum: 0, maximum: 80 },
                  bio: { type: "string", maxLength: 2000 },
                  password: { type: "string", minLength: 8, maxLength: 72 },
                  avatar: { type: "string", format: "binary" },
                },
              },
            },
          },
        },
        responses: {
          "200": response("Perfil actualizado."),
          "400": response("Datos o imagen no válidos."),
          "401": response("No autenticado."),
        },
      },
    },
    "/api/athlete-portal/access": {
      post: {
        tags: ["athlete-portal"],
        summary: "Generar enlace temporal de acceso para un atleta propio",
        security: secured,
        requestBody: jsonBody({
          type: "object",
          required: ["athleteId"],
          additionalProperties: false,
          properties: { athleteId: { type: "string" } },
        }),
        responses: {
          "201": response("Enlace de portal firmado válido durante siete días."),
          "401": response("Se requiere autenticación de entrenador."),
          "404": response("Atleta no encontrado."),
        },
      },
    },
    "/api/athlete-portal/me": {
      get: {
        tags: ["athlete-portal"],
        summary: "Consultar la rutina y el plan nutricional del portal",
        security: secured,
        responses: {
          "200": response("Datos del atleta y sus planes actuales."),
          "401": response("Token de portal inválido o expirado."),
        },
      },
    },
    "/api/athlete-portal/checkins": {
      post: {
        tags: ["athlete-portal"],
        summary: "Registrar un check-in del atleta autenticado por portal",
        security: secured,
        requestBody: jsonBody({
          type: "object",
          required: ["weight"],
          additionalProperties: false,
          properties: {
            weight: { type: "number", exclusiveMinimum: 0 },
            notes: { type: "string", maxLength: 5000 },
          },
        }),
        responses: {
          "201": response("Check-in registrado y peso actual actualizado."),
          "400": response("Datos de check-in no válidos."),
          "401": response("Token de portal inválido o expirado."),
        },
      },
    },
    "/api/athlete-portal/workouts/{planId}/pdf": {
      get: {
        tags: ["athlete-portal"],
        summary: "Descargar PDF del plan de entrenamiento propio",
        security: secured,
        parameters: [idParameter("planId")],
        responses: {
          "200": { description: "Documento PDF.", content: { "application/pdf": { schema: { type: "string", format: "binary" } } } },
          "401": response("Token de portal inválido o expirado."),
          "404": response("Plan no encontrado."),
        },
      },
    },
    "/api/athlete-portal/nutrition/{planId}/pdf": {
      get: {
        tags: ["athlete-portal"],
        summary: "Descargar PDF del plan nutricional propio",
        security: secured,
        parameters: [idParameter("planId")],
        responses: {
          "200": { description: "Documento PDF.", content: { "application/pdf": { schema: { type: "string", format: "binary" } } } },
          "401": response("Token de portal inválido o expirado."),
          "404": response("Plan no encontrado."),
        },
      },
    },
    "/api/ai/generate-plan": {
      post: {
        tags: ["ai"],
        summary: "Generar borrador de plan de entrenamiento o nutrición",
        security: secured,
        requestBody: jsonBody({
          type: "object",
          required: ["athleteId", "type"],
          additionalProperties: false,
          properties: {
            athleteId: { type: "string" },
            type: { type: "string", enum: ["workout", "nutrition"] },
          },
        }),
        responses: {
          "200": response("Borrador estructurado generado con OpenAI."),
          "400": response("Solicitud no válida."),
          "401": response("Autenticación de entrenador requerida."),
          "404": response("Atleta no encontrado o no pertenece al entrenador."),
          "502": response("No se pudo generar el borrador."),
          "503": response("La generación con OpenAI no está configurada."),
        },
      },
    },
    "/api/dashboard/stats": {
      get: {
        tags: ["dashboard"],
        summary: "Obtener estadísticas del panel",
        security: secured,
        responses: { "200": response("Estadísticas del entrenador autenticado."), "401": response("No autenticado.") },
      },
    },
    "/api/dashboard/retention-alerts": {
      get: {
        tags: ["dashboard"],
        summary: "Listar atletas activos en riesgo de abandono",
        description: "Devuelve atletas con más de siete días sin check-in o sin planes asignados.",
        security: secured,
        responses: {
          "200": response("Alertas de retención con los motivos y fechas de último check-in."),
          "401": response("No autenticado."),
        },
      },
    },
    "/api/dashboard/export-report": {
      get: {
        tags: ["dashboard"],
        summary: "Exportar informe mensual de atletas",
        description: "Descarga un CSV con estado y progreso de peso de los atletas del entrenador autenticado.",
        security: secured,
        responses: {
          "200": {
            description: "Informe CSV descargable.",
            content: {
              "text/csv": {
                schema: { type: "string", format: "binary" },
              },
            },
          },
          "401": response("No autenticado."),
          "500": response("No se pudo generar el informe."),
        },
      },
    },
  },
  tags: [
    { name: "auth", description: "Registro e inicio de sesión." },
    { name: "athletes", description: "Gestión de atletas." },
    { name: "workouts", description: "Planes de entrenamiento." },
    { name: "nutrition", description: "Planes nutricionales." },
    { name: "marketing", description: "Generación y programación de contenido." },
    { name: "payments", description: "Suscripciones y pagos con Stripe." },
    { name: "profile", description: "Perfil y preferencias del entrenador." },
    { name: "athlete-portal", description: "Acceso temporal del atleta a sus planes y check-ins." },
    { name: "ai", description: "Generación asistida por IA de borradores de planes." },
    { name: "dashboard", description: "Estadísticas del panel." },
  ],
};

export const swaggerSpec = swaggerJsdoc({
  definition,
  apis: [],
});
