import type { Metadata } from "next";
import { site } from "@/lib/config";

export const metadata: Metadata = { title: "Privacidad de datos" };

export default function PrivacyPage() {
  return (
    <div className="container-x max-w-3xl py-10 lg:py-14">
      <p className="eyebrow">Información legal</p>
      <h1 className="mt-2 text-[30px] font-semibold sm:text-[36px]">Privacidad de datos</h1>
      <div className="mt-8 space-y-5 text-[15px] leading-relaxed text-steel-700">
        <p>
          Esta tienda es operada por {site.legalName}. Cuando registra un pedido o una solicitud de cotización recopilamos los datos que usted
          ingresa en el formulario: nombre, empresa, correo electrónico, teléfono, identificación fiscal, ciudad, dirección de entrega y observaciones.
        </p>
        <p>
          Usamos esta información exclusivamente para gestionar su pedido o cotización, contactarle sobre su solicitud y permitirle consultar su estado
          mediante el número de referencia. El acceso está restringido al personal autorizado de {site.legalName}.
        </p>
        <p>
          El carrito y la lista de cotización se guardan únicamente en su navegador hasta que usted envía la solicitud.
        </p>
        <p>
          Para consultar, corregir o solicitar la eliminación de sus datos, contáctenos
          {site.email ? <> en <a className="text-climb-700 underline" href={`mailto:${site.email}`}>{site.email}</a></> : " a través de nuestros canales de atención"}.
        </p>
        <p className="rounded-md border border-steel-150 bg-steel-25 p-4 text-[13.5px] text-steel-500">
          Este texto describe el funcionamiento técnico de la plataforma y debe ser revisado y aprobado por el área legal de {site.legalName} antes de la operación comercial.
        </p>
      </div>
    </div>
  );
}
