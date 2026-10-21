# Aviso legal y política de privacidad de H-Flow

> **Borrador para completar antes de publicar.** Este documento describe los tratamientos previstos y las funciones presentes en el código de H-Flow. No sustituye una revisión jurídica. El responsable del tratamiento debe completar los campos entre corchetes, confirmar los proveedores, contratos, ubicaciones, plazos y bases jurídicas reales, y adaptar el texto a la entidad que explota el servicio.

**Última actualización:** [fecha]

## 1. Aviso legal

### Titular del servicio

- **Titular / responsable del servicio:** [nombre o razón social]
- **NIF/CIF:** [identificador fiscal]
- **Domicilio:** [dirección postal completa]
- **Correo de contacto:** [correo electrónico]
- **Registro mercantil u otro registro aplicable:** [datos registrales, si procede]

H-Flow es una plataforma de gestión de entrenamiento y seguimiento de atletas dirigida a entrenadores y organizaciones deportivas.

### Condiciones de uso

El acceso al servicio requiere utilizarlo conforme a la ley, a estas condiciones y a las instrucciones del entrenador responsable de la planificación deportiva. El usuario debe mantener la confidencialidad de sus credenciales y comunicar cualquier uso no autorizado.

H-Flow es una herramienta de gestión y apoyo. La planificación, valoración y supervisión del entrenamiento corresponden al profesional responsable. La información generada por sistemas de inteligencia artificial es asistencial, puede ser inexacta y no constituye diagnóstico, tratamiento médico ni consejo sanitario.

### Propiedad intelectual

Los derechos sobre el software, la marca, el diseño y los contenidos de H-Flow pertenecen a [titular de los derechos] o a sus licenciantes. No se concede una licencia distinta de la necesaria para utilizar el servicio conforme a sus condiciones.

### Responsabilidad y enlaces externos

El servicio puede integrarse con proveedores externos, como Supabase, Groq, Stripe y Meta. Sus servicios se rigen también por sus propias condiciones. El titular de H-Flow no controla los contenidos ni la disponibilidad de sitios de terceros.

## 2. Responsable del tratamiento y roles

La entidad que opera H-Flow es **[nombre o razón social y datos de contacto]**. Para consultas sobre privacidad: **[correo de privacidad]**. Delegado de Protección de Datos, si corresponde: **[datos de contacto]**.

El rol aplicable depende del tratamiento y de la relación contractual:

- El entrenador o la organización deportiva determina normalmente la finalidad y las instrucciones del seguimiento de sus atletas. Puede ser responsable del tratamiento de los datos que incorpora y consulta en H-Flow.
- La entidad operadora de H-Flow puede actuar como encargada del tratamiento al alojar o procesar esos datos por cuenta del entrenador, y como responsable independiente para los datos necesarios para administrar cuentas, seguridad, facturación y funcionamiento de la plataforma.
- Los proveedores tecnológicos pueden actuar como encargados, subencargados o responsables independientes según el servicio concreto y sus condiciones.

Los contratos y avisos aplicables deben identificar los roles reales, las instrucciones documentadas y los acuerdos exigidos por el RGPD. Este reparto debe confirmarse antes de prestar el servicio.

## 3. Personas y datos tratados

Según las funciones habilitadas y la información introducida, H-Flow puede tratar:

- **Identificación y cuenta:** nombre, correo electrónico, identificador de usuario, rol y datos de autenticación gestionados por Supabase Auth.
- **Relación deportiva:** entrenador asignado, atletas vinculados, rutinas, ejercicios, calendario, sesiones y tareas.
- **Métricas físicas y de bienestar:** peso corporal, horas de sueño, nivel de estrés, fatiga y registros de entrenamiento.
- **Información potencialmente relativa a la salud:** molestias, lesiones, limitaciones físicas, notas que revelen síntomas y mensajes de voz que contengan esa información. Estos datos pueden ser categorías especiales de datos personales conforme al artículo 9 del RGPD.
- **Comunicaciones y archivos:** preguntas al asistente, notas, transcripciones de audios y, cuando se habilite, archivos de audio o vídeo asociados al entrenamiento.
- **Suscripción:** estado de suscripción e identificadores de pago. Los datos de tarjeta se introducen en Stripe Checkout y, según la integración, son tratados por Stripe; H-Flow no debe recopilar datos completos de tarjeta si no son necesarios.
- **Datos técnicos:** registros de solicitudes, datos de seguridad y métricas de rendimiento de la aplicación, en la medida en que se habiliten.
- **Notificaciones:** identificadores y claves técnicas de suscripciones push asociadas al dispositivo.

No se deben introducir datos de salud que no sean necesarios para el seguimiento acordado. Evita incluir información identificativa de terceros en notas, audios o consultas.

## 4. Finalidades y bases jurídicas

Los datos se utilizan, según la función contratada, para:

| Finalidad | Datos relacionados | Base jurídica que debe aplicarse |
|---|---|---|
| Crear y administrar cuentas y permitir el acceso por roles | Cuenta, identificadores y autenticación | Ejecución del contrato o medidas precontractuales; seguridad y obligaciones legales cuando proceda |
| Asignar rutinas y gestionar el seguimiento deportivo | Rutinas, tareas y métricas de entrenamiento | Ejecución del contrato o servicio entre atleta y entrenador; para el tratamiento por la plataforma, instrucciones del responsable correspondiente |
| Registrar peso, sueño, estrés, fatiga, molestias o lesiones | Métricas físicas y datos potencialmente de salud | Base del artículo 6 y, cuando sean datos de salud, una excepción válida del artículo 9. Cuando corresponda, consentimiento explícito, específico, informado, demostrable y revocable |
| Transcribir mensajes de voz y generar resúmenes o respuestas con IA | Audio o transcripción, preguntas y contexto deportivo necesario | Base del artículo 6 y, si se tratan datos de salud, una excepción válida del artículo 9; informar previamente del uso de proveedores de IA |
| Gestionar suscripciones de entrenadores | Cuenta, estado de suscripción y referencias de Stripe | Ejecución del contrato y obligaciones legales de facturación |
| Enviar notificaciones solicitadas | Suscripción push y datos de la notificación | Prestación de la función solicitada y configuración del dispositivo; consentimiento cuando lo exijan las normas aplicables |
| Proteger, mantener y diagnosticar el servicio | Datos técnicos y registros mínimos | Interés legítimo debidamente ponderado, obligación legal o ejecución del contrato, según el caso |

El responsable debe documentar la base jurídica concreta de cada operación. El consentimiento para tratar datos de salud no debe deducirse del mero uso de la aplicación ni condicionarse cuando el dato no sea necesario para el servicio. Debe existir una alternativa adecuada cuando el usuario no consienta un tratamiento opcional.

## 5. Uso de inteligencia artificial

H-Flow puede utilizar Groq para transcribir audios mediante Whisper y para generar respuestas o resúmenes a partir de rutinas, planes nutricionales, preguntas y métricas pertinentes. En el flujo de mensajería, también puede utilizarse un servicio compatible con la API de OpenAI configurado como FreeLLMAPI o una alternativa local.

Antes de activar estas funciones, el responsable debe:

- Informar qué datos se envían a cada proveedor, con qué finalidad y durante cuánto tiempo.
- Confirmar las condiciones de uso de los datos, la retención del proveedor, la ubicación de procesamiento y las opciones de exclusión de entrenamiento.
- Formalizar los acuerdos de tratamiento y las garantías para transferencias internacionales que correspondan.
- Limitar el contexto compartido a lo necesario y evitar enviar identificadores directos cuando no sean imprescindibles.

Las respuestas y resúmenes son orientativos y pueden contener errores. No sustituyen el criterio del entrenador ni el de profesionales sanitarios. No se deben utilizar para diagnosticar, decidir tratamientos ni tomar decisiones con efectos jurídicos o similares sobre una persona sin las garantías legales aplicables y una evaluación específica.

## 6. Destinatarios y proveedores

Los datos pueden ser accesibles para el entrenador u organización vinculada al atleta y para proveedores necesarios para operar las funciones habilitadas. Entre las integraciones previstas o presentes en el código figuran:

- **Supabase:** autenticación, base de datos y almacenamiento.
- **Groq:** transcripción de audio e inferencia de modelos.
- **Stripe:** pago y administración de suscripciones.
- **Meta / WhatsApp:** recepción y recuperación de medios asociados a mensajes, si se activa la integración.
- **Proveedores de notificaciones push:** entrega de notificaciones al dispositivo.
- **FreeLLMAPI u otro proveedor compatible:** estructuración de tareas, si se configura.
- **Vercel u otro proveedor de alojamiento:** alojamiento y entrega de la aplicación, según el despliegue.

La lista final de subencargados, las ubicaciones de tratamiento y los enlaces a sus avisos y acuerdos deben completarse según la configuración de producción: **[enlace a la lista de proveedores y subencargados]**.

H-Flow no debe vender datos personales. Cualquier comunicación adicional debe limitarse a instrucciones del responsable, prestación del servicio o una obligación legal.

## 7. Transferencias internacionales

Algunos proveedores pueden procesar datos fuera del Espacio Económico Europeo. Antes de utilizar una función, el responsable debe verificar la ubicación efectiva del proyecto y de cada proveedor, así como la existencia de una decisión de adecuación o, en su defecto, de garantías apropiadas —por ejemplo, cláusulas contractuales tipo— y, cuando proceda, medidas suplementarias.

Información sobre transferencias y garantías aplicables: **[detallar países, proveedores, mecanismo y cómo obtener copia de las garantías]**.

## 8. Conservación y eliminación

Los datos se conservarán solo durante el tiempo necesario para cada finalidad y según las instrucciones del responsable y las obligaciones legales. El periodo concreto no está establecido en este borrador y debe definirse antes de publicarlo:

- Cuenta y datos de relación contractual: **[plazo]**.
- Rutinas, métricas y datos potencialmente de salud: **[plazo o criterio de supresión al finalizar la relación]**.
- Audios y transcripciones: **[plazo por tipo de dato; valorar conservarlos el mínimo tiempo posible]**.
- Registros técnicos y de seguridad: **[plazo]**.
- Datos de facturación: durante los plazos legales aplicables: **[concretar jurisdicción y plazo]**.
- Copias de seguridad y eliminación definitiva: **[ciclo de retención y borrado]**.

Al finalizar el servicio, la entidad operadora devolverá o eliminará los datos tratados por cuenta del responsable conforme al contrato y a las obligaciones legales aplicables. La eliminación de un registro activo puede no retirar inmediatamente copias de seguridad sujetas a ciclos de borrado documentados.

## 9. Derechos de las personas

La persona interesada puede solicitar acceso, rectificación, supresión, oposición, limitación del tratamiento y portabilidad cuando proceda. También puede retirar el consentimiento en cualquier momento, sin afectar a la licitud del tratamiento anterior a su retirada.

Las solicitudes deben dirigirse a **[correo de privacidad]** o al entrenador u organización responsable de los datos deportivos. Cuando H-Flow actúe como encargado, trasladará la solicitud al responsable y le prestará asistencia conforme al contrato.

La persona interesada puede presentar una reclamación ante la autoridad de control competente. En España: **Agencia Española de Protección de Datos (AEPD), [https://www.aepd.es](https://www.aepd.es)**. En otro país del EEE, ante la autoridad de protección de datos correspondiente.

## 10. Menores

Antes de permitir el registro de menores, el responsable debe definir la edad mínima, el proceso de autorización parental cuando sea exigible, la información adaptada a la edad y las salvaguardas para los datos de salud y actividad física. No se debe habilitar el tratamiento de datos de menores hasta que estas condiciones estén configuradas y comunicadas.

## 11. Seguridad

H-Flow utiliza medidas técnicas y organizativas proporcionales al riesgo, que deben incluir controles de acceso, separación de roles, protección de credenciales, conexiones cifradas, gestión de permisos de base de datos y almacenamiento, copias de seguridad, supervisión de accesos y procedimientos de respuesta a incidentes.

El código incluye verificaciones de sesión y rol en determinadas rutas, verificación de firmas en webhooks y utilidades de cifrado para uso en servidor. La existencia de una utilidad no implica que todos los datos almacenados estén cifrados por aplicación. La configuración efectiva de RLS, políticas de Storage, cifrado, retención de registros y gestión de claves debe auditarse y documentarse antes de realizar afirmaciones específicas.

En caso de violación de seguridad, el responsable y los encargados actuarán conforme a los artículos 33 y 34 del RGPD, incluidos los plazos de notificación aplicables.

## 12. Cookies y almacenamiento local

H-Flow utiliza cookies técnicas necesarias para mantener la sesión de Supabase. La aplicación también puede guardar preferencias funcionales en el almacenamiento local del navegador. Antes de utilizar cookies o tecnologías no necesarias para analítica, publicidad o seguimiento, debe informarse al usuario y obtenerse el consentimiento cuando lo exija la normativa aplicable.

Inventario actualizado de cookies y tecnologías similares: **[nombre, finalidad, duración, proveedor y base jurídica]**.

## 13. Cambios en esta política

Esta política puede actualizarse para reflejar cambios legales, técnicos o funcionales. La versión vigente indicará la fecha de actualización. Cuando un cambio afecte de manera significativa a las finalidades o bases jurídicas, se informará a las personas interesadas y se solicitará el consentimiento cuando sea necesario.

## 14. Información que debe completarse antes de publicar

- Identidad, dirección y contacto del titular y responsable del servicio.
- Reparto de roles entre plataforma, entrenador y organización; contratos de encargo.
- Base jurídica del tratamiento de métricas y datos de salud, incluida la excepción del artículo 9 aplicable y el mecanismo de consentimiento explícito cuando corresponda.
- Plazos de conservación, borrado y copias de seguridad por categoría de datos.
- Configuración real de proveedores, subencargados, regiones y transferencias internacionales.
- Proceso de atención de derechos, privacidad de menores y contacto del DPD cuando sea obligatorio.
- Inventario de cookies y datos de analítica efectivamente habilitados.
- Evaluación de impacto relativa a la protección de datos cuando el tratamiento de datos de salud y el perfilado previsto implique alto riesgo.
