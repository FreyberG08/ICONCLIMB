/** Enlace de WhatsApp hacia el teléfono de un cliente (solo dígitos, con código de país). */
export function whatsappLinkFor(phone: string, text: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
