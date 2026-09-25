// Acceso a la base. El resto del código habla con `BaseDatos`, nunca con D1
// directo: así las pruebas corren contra un SQLite en memoria idéntico.

export type Valor = string | number | null;

export interface BaseDatos {
  todos<T>(sql: string, params?: Valor[]): Promise<T[]>;
  uno<T>(sql: string, params?: Valor[]): Promise<T | null>;
  ejecutar(sql: string, params?: Valor[]): Promise<{ cambios: number; ultimoId: number | null }>;
}

/** Lo mínimo de D1 que usamos (así no dependemos de sus tipos completos). */
type D1Minimo = {
  prepare(sql: string): {
    bind(...v: Valor[]): {
      all<T>(): Promise<{ results: T[] }>;
      first<T>(): Promise<T | null>;
      run(): Promise<{ meta: { changes?: number; last_row_id?: number } }>;
    };
  };
};

export function baseDesdeD1(d1: D1Minimo): BaseDatos {
  return {
    async todos<T>(sql: string, params: Valor[] = []) {
      const r = await d1
        .prepare(sql)
        .bind(...params)
        .all<T>();
      return r.results;
    },
    async uno<T>(sql: string, params: Valor[] = []) {
      return d1
        .prepare(sql)
        .bind(...params)
        .first<T>();
    },
    async ejecutar(sql: string, params: Valor[] = []) {
      const r = await d1
        .prepare(sql)
        .bind(...params)
        .run();
      return { cambios: r.meta.changes ?? 0, ultimoId: r.meta.last_row_id ?? null };
    },
  };
}
