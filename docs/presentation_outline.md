# H-Flow — Guion de presentación

## Slide 1 — H-Flow: seguimiento del entrenamiento en un solo lugar
- Plataforma SaaS B2B para entrenadores y atletas.
- Centraliza planificación, check-ins y comunicación del seguimiento.
- Presentación: problema, solución, arquitectura, demostración y escalabilidad.

## Slide 2 — El problema de los entrenadores
- La planificación y el seguimiento suelen repartirse entre hojas, mensajería y herramientas inconexas.
- Revisar manualmente el progreso y detectar atletas inactivos consume tiempo.
- Los comentarios técnicos y las dudas pueden quedar dispersos o perder contexto.
- **Idea clave:** el entrenador necesita visibilidad operativa sin añadir más trabajo administrativo.

## Slide 3 — Usuarios y propuesta de valor
- **Entrenador:** administra atletas, asigna entrenamientos y revisa reportes.
- **Atleta:** consulta su rutina y registra métricas desde un portal móvil.
- **Propuesta:** conectar la planificación y el seguimiento entre ambos perfiles.
- Acceso basado en roles para separar las experiencias de entrenador y atleta.

## Slide 4 — Solución SaaS B2B
- Aplicación web con Next.js App Router y React.
- Supabase Auth gestiona las sesiones; Supabase Database almacena perfiles, rutinas, asignaciones, métricas y tareas.
- El entrenador puede contratar una suscripción recurrente mediante Stripe Checkout.
- Un webhook firmado confirma el pago y actualiza el estado de suscripción del entrenador.

## Slide 5 — Experiencia de seguimiento del atleta
- Portal móvil con entrenamiento asignado y ejercicios del día.
- Check-in de peso, sueño, estrés y fatiga.
- El entrenador consulta los reportes y métricas de sus atletas.
- **Demostración:** abrir el portal, registrar un check-in y enseñar dónde aparece en el seguimiento.

## Slide 6 — IA aplicada al entrenamiento
- **Whisper en Groq:** transcribe audios entrantes de WhatsApp para incorporarlos al flujo de gestión.
- **LLM en Groq:** responde preguntas del atleta con contexto de su rutina y plan nutricional consultados desde Supabase.
- Las respuestas están limitadas a las directrices disponibles; si falta información, el asistente indica que se consulte al entrenador.
- La IA complementa la supervisión profesional: no sustituye al preparador ni diagnostica lesiones.

## Slide 7 — Demostración técnica: flujo de una petición
1. El atleta se autentica y envía una pregunta desde el cliente.
2. Next.js valida sesión y rol en la ruta de API.
3. Supabase proporciona la rutina y el plan nutricional asignados.
4. El servidor envía a Groq una petición con el contexto mínimo necesario.
5. La respuesta vuelve al portal sin exponer claves de proveedor al navegador.
- **Mostrar:** ruta de API, comprobación de autorización y respuesta del asistente.

## Slide 8 — Arquitectura, datos y seguridad
- Cliente web ↔ Next.js: interfaz, Server Actions y API Routes sobre HTTPS.
- Next.js ↔ Supabase: autenticación, consultas y almacenamiento.
- Next.js ↔ Groq, Stripe y Meta: integraciones externas desde el servidor.
- Webhooks de Stripe y WhatsApp verifican la firma antes de procesar eventos.
- Las operaciones sensibles deben validar autorización en servidor; las políticas RLS y de Storage complementan esos controles.

## Slide 9 — Rendimiento y escalabilidad técnica
- Next.js comprime respuestas y sirve recursos estáticos con caché de larga duración.
- Las consultas de chat a rutina y nutrición se ejecutan en paralelo; el cron pagina perfiles y procesa atletas por lotes.
- Chat, transcripción y notificaciones dependen de proveedores externos y pueden aumentar la latencia.
- **Siguiente evolución:** instrumentar p50/p95/p99 y tasas de error; usar colas persistentes, reintentos e idempotencia para cargas asíncronas de mayor volumen.
- No se presentan cifras de rendimiento como resultados medidos: deben obtenerse con pruebas de carga y telemetría de producción.

## Slide 10 — Escalabilidad comercial y cierre
- Modelo SaaS B2B: suscripción recurrente por entrenador.
- Oportunidades de crecimiento: planes por volumen de atletas, automatización de seguimiento e integraciones adicionales.
- Validación comercial pendiente: pilotos con entrenadores, retención, conversión y coste por cuenta.
- Hoja de ruta: métricas de uso, colas para procesos pesados, controles de privacidad y pruebas de carga.
- **Cierre:** H-Flow busca devolver tiempo al entrenador y ofrecer al atleta un seguimiento claro y accesible.
