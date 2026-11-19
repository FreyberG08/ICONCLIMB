import { ElevatorDoors } from "@/components/motion/elevator-doors";

// Se vuelve a montar en cada navegación: las puertas se abren sobre la nueva página.
export default function StoreTemplate({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ElevatorDoors />
      {children}
    </>
  );
}
