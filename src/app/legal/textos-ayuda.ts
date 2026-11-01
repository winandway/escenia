// Los textos de los casos de ayuda en la web (C-AYUDA-1), en inglés (el principal) y en español.
// La prueba exige que las dos columnas tengan las mismas llaves y ninguna vacía.
export const TEXTOS_AYUDA = {
  en: {
    form_titulo: "Open a support case",
    form_sub: "Tell us what happened. You'll get a case number and a private conversation with our team.",
    nombre: "Your name",
    nombre_ph: "Full name",
    correo: "Your email",
    correo_ph: "you@example.com",
    asunto: "Subject",
    asunto_ph: "What do you need help with?",
    mensaje: "Message",
    mensaje_ph: "Describe what happened. If it's about a video, include the project name.",
    no_mandes: "Never include passwords or card numbers.",
    mandar: "Send",
    mandando: "Sending…",
    recuperado: "We recovered what you were writing.",
    empezar_de_nuevo: "Start over",
    error_datos: "Check your name, email, subject and message, then try again.",
    error_intentos: "Too many messages from this connection. Wait a bit and try again.",
    error_red: "We couldn't send it. Your text is still here; try again.",
    mis_casos: "Your cases",
    mis_casos_sub: "The cases you opened from this browser.",
    caso: "Case",
    estado_abierto: "Waiting for our reply",
    estado_respondido: "We replied",
    estado_cerrado: "Closed",
    cargando: "Loading your case…",
    no_existe: "We can't find this case. Check the link or open a new one.",
    volver: "← Support",
    tu: "You",
    soporte: "Escenia Support",
    responder: "Write a reply",
    responder_ph: "Write your message",
    cerrado_nota: "This case is closed. Write again if you still need help and we'll reopen it.",
    enlace_privado: "Keep this page's link: it's how you come back to your case. Don't share it.",
    respondemos: "We usually reply within one business day.",
  },
  es: {
    form_titulo: "Abre un caso de soporte",
    form_sub:
      "Cuéntanos qué pasó. Recibirás un número de caso y una conversación privada con nuestro equipo.",
    nombre: "Tu nombre",
    nombre_ph: "Nombre completo",
    correo: "Tu correo",
    correo_ph: "correo@ejemplo.com",
    asunto: "Asunto",
    asunto_ph: "¿Con qué necesitas ayuda?",
    mensaje: "Mensaje",
    mensaje_ph: "Describe qué pasó. Si es sobre un video, incluye el nombre del proyecto.",
    no_mandes: "Nunca incluyas contraseñas ni números de tarjeta.",
    mandar: "Enviar",
    mandando: "Enviando…",
    recuperado: "Recuperamos lo que estabas escribiendo.",
    empezar_de_nuevo: "Empezar de nuevo",
    error_datos: "Revisa tu nombre, tu correo, el asunto y el mensaje, y vuelve a intentarlo.",
    error_intentos: "Demasiados mensajes desde esta conexión. Espera un poco y vuelve a intentarlo.",
    error_red: "No se pudo enviar. Tu texto sigue aquí; vuelve a intentarlo.",
    mis_casos: "Tus casos",
    mis_casos_sub: "Los casos que abriste desde este navegador.",
    caso: "Caso",
    estado_abierto: "Esperando nuestra respuesta",
    estado_respondido: "Te respondimos",
    estado_cerrado: "Cerrado",
    cargando: "Cargando tu caso…",
    no_existe: "No encontramos este caso. Revisa el enlace o abre uno nuevo.",
    volver: "← Soporte",
    tu: "Tú",
    soporte: "Soporte de Escenia",
    responder: "Escribe una respuesta",
    responder_ph: "Escribe tu mensaje",
    cerrado_nota:
      "Este caso está cerrado. Si todavía necesitas ayuda, escribe otra vez y lo abrimos de nuevo.",
    enlace_privado: "Guarda el enlace de esta página: es tu forma de volver a tu caso. No lo compartas.",
    respondemos: "Solemos responder en un día hábil.",
  },
} as const;

export type EstadoCasoWeb = "abierto" | "respondido" | "cerrado";
export const etiquetaDeEstado = (idioma: "en" | "es", e: EstadoCasoWeb) =>
  TEXTOS_AYUDA[idioma][`estado_${e}`];
/** Lo que salió bien va en verde; lo pendiente, en gris (regla global). */
export const colorDeEstado = (e: EstadoCasoWeb) =>
  e === "respondido" ? "bg-green-100 text-green-800" : "bg-neutral-100 text-neutral-700";
export const rutaDelCaso = (idioma: "en" | "es", codigo: string) =>
  `${idioma === "es" ? "/es" : ""}/support/case/${codigo}`;
