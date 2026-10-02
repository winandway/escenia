// Una fila de espera por nombre: lo que entra a la misma fila corre de uno en
// uno, aunque se pida a la vez. Hace falta donde varias búsquedas en paralelo
// leen, cambian y reescriben el MISMO archivo de caché: sin fila, la última que
// escribe borra lo que anotaron las demás (pasó con las fotos de internet al
// pedir los planos de a tres: C-RITMO-1).
const filas = new Map<string, Promise<unknown>>();

export function enSerie<T>(fila: string, tarea: () => Promise<T>): Promise<T> {
  const previa = filas.get(fila) ?? Promise.resolve();
  const turno = previa.then(tarea, tarea);
  // La fila sigue aunque una tarea falle; el fallo le llega a quien la pidió.
  filas.set(
    fila,
    turno.catch(() => undefined),
  );
  return turno;
}
