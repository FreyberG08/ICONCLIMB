import { Badge } from "@/components/ui/badge";
import { PRODUCT_STATUS } from "@/lib/labels";
import type { ProductStatus } from "@/lib/types";

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const s = PRODUCT_STATUS[status];
  return <Badge tone={s.tone} dot>{s.label}</Badge>;
}

export function StockCell({ onHand, reserved, minStock }: { onHand: number; reserved: number; minStock: number }) {
  const available = onHand - reserved;
  const tone = available <= 0 ? "text-err-600" : available <= minStock ? "text-warn-600" : "text-ink";
  return (
    <span className="font-mono text-[12.5px] tabular-nums">
      <span className={tone}>{available}</span>
      <span className="text-steel-400"> / {onHand}</span>
      {reserved > 0 && <span className="ml-1 text-[11px] text-climb-600">({reserved} res.)</span>}
    </span>
  );
}
