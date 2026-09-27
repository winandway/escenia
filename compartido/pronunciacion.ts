// Ajustes de ortografía SOLO para lo que se manda a la voz (los subtítulos
// conservan la palabra original). En español la H es muda, pero el modelo de
// voz la aspira en algunas palabras («Habana» sonaba «Jabana»): se quita la H
// muda delante de vocal, salvo en préstamos del inglés donde sí se aspira.
const CON_H_ASPIRADA = new Set([
  "hardware",
  "hacker",
  "hackers",
  "hashtag",
  "hobby",
  "hobbies",
  "hip",
  "hop",
  "hot",
  "hollywood",
  "houston",
  "harvard",
  "hilton",
  "harry",
  "harlem",
  "hulk",
  "hyundai",
  "heineken",
  "hong",
  "hannah",
  "hawái",
  "hawaii",
  "hámster",
  "hall",
  "hamburguesa",
  "handicap",
  "hello",
  "home",
  "hosting",
  "host",
  "hit",
  "hits",
  "hippie",
  "hippies",
  "hobbit",
  "hockey",
  "holding",
  "hooligan",
  "hotmail",
  "html",
  "http",
  "https",
]);

const VOCAL = "[aeiouáéíóúAEIOUÁÉÍÓÚ]";
const H_INICIAL = new RegExp(`^([¿¡"«(]*)([hH])(${VOCAL})`, "u");
const H_ENTRE_VOCALES = /([aeiouáéíóú])h([aeiouáéíóú])/giu;

function quitarH(palabra: string): string {
  // «Habana» → «Abana», «hermanos» → «ermanos», «ahora» → «aora». Conserva la mayúscula.
  return palabra
    .replace(
      H_INICIAL,
      (_, pre: string, h: string, vocal: string) => pre + (h === "H" ? vocal.toUpperCase() : vocal),
    )
    .replace(H_ENTRE_VOCALES, "$1$2");
}

/** Texto para la voz: misma cantidad de palabras que el original (los subtítulos dependen de eso). */
export function paraLaVoz(texto: string): string {
  return texto
    .split(/(\s+)/)
    .map((trozo) => {
      if (/^\s+$/.test(trozo) || !/[hH]/.test(trozo)) return trozo;
      const limpia = trozo.replace(/^[¿¡"«(]+|[.,;:!?»")]+$/gu, "").toLowerCase();
      if (CON_H_ASPIRADA.has(limpia)) return trozo;
      if (/^[¿¡"«(]*[hH][aeiouáéíóúAEIOUÁÉÍÓÚ]/u.test(trozo) || /[aeiouáéíóú]h[aeiouáéíóú]/iu.test(trozo)) {
        return quitarH(trozo);
      }
      return trozo;
    })
    .join("");
}
