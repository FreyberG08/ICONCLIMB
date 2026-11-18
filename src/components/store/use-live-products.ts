"use client";

import { useEffect, useState } from "react";
import type { CatalogProduct } from "@/lib/types";
import { refreshProducts } from "@/app/(store)/actions";

/** Consulta al servidor los datos vigentes (precio y disponibilidad) de los productos. */
export function useLiveProducts(ids: string[], ready: boolean) {
  const key = [...ids].sort().join(",");
  const [state, setState] = useState<{ loading: boolean; map: Map<string, CatalogProduct> }>({ loading: true, map: new Map() });
  useEffect(() => {
    if (!ready) return;
    if (!key) {
      setState({ loading: false, map: new Map() });
      return;
    }
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    refreshProducts(key.split(","))
      .then((list) => alive && setState({ loading: false, map: new Map(list.map((p) => [p.id, p])) }))
      .catch(() => alive && setState({ loading: false, map: new Map() }));
    return () => {
      alive = false;
    };
  }, [key, ready]);
  return state;
}
