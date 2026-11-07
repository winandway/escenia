// Quién sale en el estudio: cada invitado del catálogo en su tarjeta, con su miniatura. Son radios con el
// nombre «avatar», así el borrador de la ficha (useBorrador) los guarda y los devuelve como el resto.
import { AVATARES, avatarPorId, type AvatarId } from "@compartido/podcast-avatares";

/** La cabeza y los hombros del avatar, recortados de su imagen, sobre el azul del panel del invitado. */
export function MiniaturaAvatar({ avatar, lado = 64 }: { avatar: AvatarId; lado?: number }) {
  const a = avatarPorId(avatar);
  const k = lado / a.miniatura.lado;
  return (
    <span
      className="relative block shrink-0 overflow-hidden rounded-md bg-gradient-to-b from-[#0d1d4a] to-[#071029]"
      style={{ width: lado, height: lado }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- imagen local fija, sin optimizador en el Worker */}
      <img
        src={a.imagen}
        alt={a.nombre}
        loading="lazy"
        className="absolute max-w-none"
        style={{
          width: a.ancho * k,
          height: a.alto * k,
          left: -a.miniatura.x * k,
          top: -a.miniatura.y * k,
        }}
      />
    </span>
  );
}

export function SelectorAvatar({ porDefecto }: { porDefecto: AvatarId }) {
  return (
    <fieldset>
      <legend className="etiqueta">Quién sale en el estudio</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {AVATARES.map((a) => (
          <label
            key={a.id}
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-neutral-700 p-2 text-sm has-[:checked]:border-amber-500 has-[:checked]:bg-amber-500/10"
          >
            <input
              type="radio"
              name="avatar"
              value={a.id}
              defaultChecked={a.id === porDefecto}
              aria-label={a.nombre}
              className="accent-amber-500"
            />
            <MiniaturaAvatar avatar={a.id} />
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-neutral-100">{a.nombre}</span>
              <span className="block text-xs text-neutral-400">{a.descripcion}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
