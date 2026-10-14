import { useCallback, useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { DBProduct } from "@/lib/shop";
import { CATALOG, catalogById } from "@/lib/catalog";

const FEATURED_ID = "trishield-bracelet";

export const useProducts = () => {
  const [products, setProducts] = useState<DBProduct[]>(CATALOG);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const q = query(
        collection(db, "products"),
        where("active", "==", true)
      );
      const fetchPromise = getDocs(q);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Firestore products query timeout")), 3000)
      );
      const snap = await Promise.race([fetchPromise, timeoutPromise]);
      let rows: DBProduct[] = snap.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
        } as DBProduct;
      });

      // Filter out test categories from public grid
      rows = rows.filter((p) => p.category !== "test");
      rows.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

      const featured = catalogById(FEATURED_ID);
      const base = rows.length ? rows : CATALOG;
      const hasFeatured = base.some((p) => p.name === featured?.name || p.id === FEATURED_ID);
      setProducts(featured && !hasFeatured ? [featured, ...base] : base);
    } catch (err) {
      console.warn("Products load warning, fallback to catalog:", err);
      setProducts(CATALOG);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { products, loading, reload: load };
};
