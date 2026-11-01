// Un caso de ayuda por su enlace secreto (C-AYUDA-1): no se indexa y no deja la dirección a otros sitios.
import { ChatDelCaso } from "@/app/legal/ChatDelCaso";
import { MarcoPublico } from "@/app/legal/MarcoPublico";

export const metadata = {
  title: "Your support case",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};

export default async function PaginaCaso({ params }: PageProps<"/support/case/[codigo]">) {
  const { codigo } = await params;
  return (
    <MarcoPublico idioma="en">
      <main className="mx-auto max-w-3xl px-4 py-8 leading-relaxed">
        <ChatDelCaso codigo={codigo} idioma="en" />
      </main>
    </MarcoPublico>
  );
}
