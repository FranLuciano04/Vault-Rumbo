/// <reference types="nativewind/types" />

declare module "*.css";

// Metro resuelve las imágenes importadas a un id numérico de recurso (lo que espera `<Image source>`).
declare module "*.png" {
  const recurso: number;
  export default recurso;
}
