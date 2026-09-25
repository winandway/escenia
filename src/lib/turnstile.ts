// Escudo anti-robots de Cloudflare. Si no hay claves, se apaga solo.
// Si Cloudflare no responde, se deja pasar: detrás sigue la contraseña.

export async function turnstileOk(
  token: string | undefined,
  secreto: string | undefined,
  ip: string,
  fetcher: typeof fetch = fetch,
): Promise<{ ok: boolean; motivo: string }> {
  if (!secreto) return { ok: true, motivo: "sin configurar" };
  if (!token) return { ok: false, motivo: "falta el pase del navegador" };
  try {
    const r = await fetcher("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ secret: secreto, response: token, remoteip: ip }),
    });
    if (!r.ok) return { ok: true, motivo: `cloudflare respondió ${r.status}; se deja pasar` };
    const datos = (await r.json()) as { success?: boolean };
    return datos.success ? { ok: true, motivo: "ok" } : { ok: false, motivo: "pase rechazado" };
  } catch {
    return { ok: true, motivo: "cloudflare no respondió; se deja pasar" };
  }
}
