import type {
  Availability, MovementType, OrderStatus, PaymentStatus, ProductStatus, QuoteStatus, SaleMode,
} from "./types";

export const PRODUCT_STATUS: Record<ProductStatus, { label: string; tone: Tone }> = {
  draft: { label: "Borrador", tone: "neutral" },
  pending_photos: { label: "Pendiente de fotografías", tone: "amber" },
  pending_review: { label: "Pendiente de revisión", tone: "blue" },
  published: { label: "Publicado", tone: "green" },
  archived: { label: "Archivado", tone: "muted" },
};

export const PRODUCT_STATUS_ORDER: ProductStatus[] = [
  "draft", "pending_photos", "pending_review", "published", "archived",
];

export const SALE_MODE: Record<SaleMode, { label: string; short: string }> = {
  direct: { label: "Compra directa", short: "Compra" },
  quote: { label: "Solicitud de cotización", short: "Cotización" },
};

export function availabilityLabel(a: Availability, mode: SaleMode) {
  if (a === "in_stock") return { label: "Disponible", tone: "green" as Tone };
  if (a === "low_stock") return { label: "Últimas unidades", tone: "amber" as Tone };
  return mode === "quote"
    ? { label: "Bajo pedido", tone: "blue" as Tone }
    : { label: "Agotado", tone: "red" as Tone };
}

export const MOVEMENT_TYPE: Record<MovementType, string> = {
  entry: "Entrada",
  exit: "Salida",
  adjustment: "Ajuste (conteo físico)",
  reservation: "Reserva",
  release: "Liberación",
  sale: "Despacho",
};

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: Tone; help: string }> = {
  received: { label: "Recibido", tone: "blue", help: "Pedido registrado. Las unidades están reservadas." },
  confirmed: { label: "Confirmado", tone: "blue", help: "Disponibilidad y condiciones confirmadas con el cliente." },
  preparing: { label: "En preparación", tone: "amber", help: "El almacén prepara el despacho." },
  shipped: { label: "Despachado", tone: "green", help: "Salió del almacén. Se descuenta la existencia física." },
  delivered: { label: "Entregado", tone: "green", help: "Entregado al cliente." },
  cancelled: { label: "Cancelado", tone: "muted", help: "Cancelado. Las reservas se liberan." },
};
export const ORDER_STATUS_ORDER: OrderStatus[] = ["received", "confirmed", "preparing", "shipped", "delivered", "cancelled"];

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: Tone }> = {
  pending: { label: "Pago pendiente", tone: "amber" },
  paid: { label: "Pago confirmado", tone: "green" },
  refunded: { label: "Reembolsado", tone: "muted" },
  not_applicable: { label: "No aplica", tone: "muted" },
};

export const QUOTE_STATUS: Record<QuoteStatus, { label: string; tone: Tone }> = {
  new: { label: "Nueva", tone: "blue" },
  in_review: { label: "En revisión", tone: "amber" },
  sent: { label: "Cotización enviada", tone: "blue" },
  accepted: { label: "Aceptada", tone: "green" },
  rejected: { label: "Rechazada", tone: "muted" },
  closed: { label: "Cerrada", tone: "muted" },
};
export const QUOTE_STATUS_ORDER: QuoteStatus[] = ["new", "in_review", "sent", "accepted", "rejected", "closed"];

export type Tone = "neutral" | "blue" | "green" | "amber" | "red" | "muted";
