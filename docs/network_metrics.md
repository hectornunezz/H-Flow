# Análisis de latencia de red — H-Flow

## 1. Objetivo

Comparar los componentes de latencia de tres operaciones del sistema:

1. Procesamiento síncrono de un audio recibido desde WhatsApp.
2. Inferencia de estructuración de tareas mediante FreeLLMAPI local.
3. Inserción de la tarea resultante en Supabase.

El repositorio no contiene una campaña de medición ni muestras de tiempos observados. Por ello, este documento no atribuye valores numéricos a los servicios: presenta el comportamiento esperado, el método reproducible y una tabla para registrar resultados experimentales.

## 2. Alcance del flujo evaluado

El endpoint `POST /api/whatsapp-sync` procesa una transcripción o un audio en modo de prueba. Cuando la entrada contiene un archivo de audio y el modo mock está desactivado, el endpoint solicita una transcripción a Groq Whisper. A continuación, intenta estructurar la transcripción mediante un endpoint compatible con OpenAI, configurado por `LLM_BASE_URL` y cuyo valor predeterminado es `http://127.0.0.1:3001/v1`. Si la llamada local falla, utiliza Groq como alternativa. Por último, inserta la tarea en `tasks` de Supabase.

El procesamiento está encadenado de forma síncrona dentro de la misma petición HTTP: la respuesta final no se envía hasta terminar los pasos aplicables.

## 3. Modelo de latencia

Para una ejecución con audio real y FreeLLMAPI local disponible:

```text
T_total =
  T_cliente_a_HFlow
  + T_descarga_audio_Meta
  + T_transcripcion_Groq
  + T_inferencia_FreeLLMAPI
  + T_insert_Supabase
  + T_respuesta_a_cliente
```

Para una entrada ya transcrita, se excluyen la descarga del audio y Whisper. Si FreeLLMAPI falla y se utiliza el fallback de Groq, la inferencia pasa a depender de una red externa y de la carga del proveedor. Si se activa el modo mock, la fase de transcripción no realiza una llamada al servicio de audio.

Las fases son mayoritariamente secuenciales. Por lo tanto, sus tiempos se suman; el tiempo total no equivale únicamente al tiempo de inferencia del modelo.

## 4. Comparativa cualitativa

| Operación | Ubicación del servicio | Red implicada | Contribución esperada | Variables principales |
|---|---|---|---|---|
| Webhook y procesamiento de WhatsApp | Meta, Next.js y proveedores externos | Internet y varias conexiones HTTPS | Alta y variable: puede incluir descarga de audio, transcripción, inferencia y persistencia en una única respuesta | Tamaño del audio, RTT, ancho de banda, carga de Meta/Groq/LLM y tiempo de base de datos |
| Estructuración con FreeLLMAPI | Local por defecto (`127.0.0.1:3001`) | Loopback si Next.js y el modelo comparten host; de lo contrario depende de la topología real | Menor coste de red esperado que una inferencia remota, pero el cómputo del modelo puede dominar | Modelo, cuantización, hardware, longitud de entrada/salida, concurrencia y ubicación del servicio |
| Persistencia en Supabase | Servicio gestionado remoto | Conexión HTTPS desde el servidor Next.js a Supabase | Una operación de escritura; normalmente inferior al tiempo de inferencia, pero dependiente de red y base de datos | Región, RTT, índices, políticas, carga, tamaño de fila y conexiones |

La tabla expresa expectativas arquitectónicas, no resultados de benchmark. No se puede concluir que la inferencia local sea siempre más rápida: un equipo con recursos limitados o un modelo mayor puede superar la latencia de una API remota. La ubicación predeterminada `127.0.0.1` solo representa loopback cuando Next.js y FreeLLMAPI ejecutan en el mismo host o contenedor de red.

El webhook real `app/api/webhook/whatsapp` también consulta los metadatos de audio a Meta, descarga el archivo, llama a Whisper y remite la transcripción al endpoint interno de sincronización. El recorrido completo real puede, por tanto, tener más fases que el endpoint de sincronización aislado.

## 5. Protocolo de medición

### 5.1 Preparación

- Ejecutar Next.js, FreeLLMAPI y Supabase en las ubicaciones que se quieran evaluar y documentar esas ubicaciones.
- Usar el mismo conjunto de transcripciones para las pruebas de inferencia local y remota.
- Mantener fijos el modelo, parámetros de generación, contexto, entrada y límite de tokens.
- Medir por separado el endpoint de sincronización con transcripción de texto y el flujo con audio real.
- No incluir secretos ni datos personales en las muestras; usar datos sintéticos.
- Hacer una fase de calentamiento antes de recopilar muestras y repetir cada escenario con una concurrencia documentada.

### 5.2 Marcas temporales

Usar un reloj monotónico en el servidor, como `performance.now()`, para medir duración. Registrar duración total y marcas antes y después de cada etapa:

```text
request_received
transcription_started
transcription_completed
local_inference_started
local_inference_completed
fallback_inference_started (si aplica)
fallback_inference_completed (si aplica)
supabase_insert_started
supabase_insert_completed
response_sent
```

No utilizar diferencias entre relojes de cliente y servidor como duración de una operación individual, ya que pueden estar desincronizados. La latencia percibida por el cliente debe medirse aparte desde el inicio de la solicitud hasta la recepción completa de la respuesta.

### 5.3 Tamaño de muestra e indicadores

Para cada escenario, reunir suficientes solicitudes repetidas para representar variaciones de red y carga; documentar el número exacto de muestras y excluir o marcar ejecuciones fallidas sin ocultarlas. Calcular:

- **p50 (mediana):** latencia típica.
- **p95 y p99:** cola de latencia y comportamiento bajo variación.
- **Media y desviación estándar:** dispersión, interpretadas junto con percentiles.
- **Tasa de error y timeout:** solicitudes no completadas correctamente.
- **Tamaño de entrada:** bytes de audio, caracteres de transcripción y tokens estimados cuando estén disponibles.

Informar las medidas en milisegundos e indicar región, fecha, entorno, hardware, versión del modelo y concurrencia.

## 6. Plantilla de resultados

Completar con mediciones obtenidas en el entorno experimental. No sustituir campos vacíos por estimaciones.

| Escenario | Muestras | p50 (ms) | p95 (ms) | p99 (ms) | Error/timeout (%) | Entorno y condiciones |
|---|---:|---:|---:|---:|---:|---|
| LLM local — FreeLLMAPI | — | — | — | — | — | — |
| Escritura de una tarea — Supabase | — | — | — | — | — | — |
| Sincronización — transcripción existente, LLM local y Supabase | — | — | — | — | — | — |
| Sincronización — audio real, Whisper, LLM local y Supabase | — | — | — | — | — | — |
| Fallback — Groq, cuando el proveedor local falla | — | — | — | — | — | — |

## 7. Interpretación y limitaciones

- El tiempo total del webhook puede estar dominado por la transferencia del audio y la inferencia, no por el `INSERT` en Supabase.
- El modo mock evita la transcripción real; sus resultados no son comparables con el flujo completo de WhatsApp.
- El fallback de Groq permite continuidad ante un fallo local, pero añade otra llamada de red y puede elevar la latencia total.
- Mediciones de loopback no representan una FreeLLMAPI desplegada en otro host, región o contenedor aislado.
- Los tiempos de Supabase varían con la región, el volumen y las políticas aplicadas; una única escritura no permite inferir rendimiento bajo carga.
- Las pruebas deben identificar por separado latencia de red e inferencia. Un único cronómetro alrededor de todo el endpoint no distingue sus causas.
- Los límites de timeout de los proveedores no son objetivos de rendimiento: solo acotan cuánto espera la solicitud.

## 8. Conclusión

Desde el punto de vista de red, FreeLLMAPI local puede reducir el recorrido de red cuando comparte host con Next.js; Supabase añade una escritura remota; y el procesamiento síncrono de WhatsApp compone varias etapas y previsiblemente presenta la mayor variabilidad. Esta comparación es cualitativa hasta ejecutar el protocolo y completar la tabla con mediciones observadas.
