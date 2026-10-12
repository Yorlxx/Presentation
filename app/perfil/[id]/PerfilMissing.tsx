"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearMyPresentationId, readMyPresentationId } from "@/lib/miFicha";
import NotFound from "../../not-found";

/** La ficha no se pudo leer: si era la del dispositivo, limpia y vuelve a casa. */
export default function PerfilMissing({ id }: { id: string }) {
  const router = useRouter();
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (readMyPresentationId() === id) {
      clearMyPresentationId();
      router.replace("/");
    } else {
      setGone(true);
    }
  }, [id, router]);

  if (gone) return <NotFound />;
  return <p className="py-10 text-center text-zinc-500">Verificando…</p>;
}
