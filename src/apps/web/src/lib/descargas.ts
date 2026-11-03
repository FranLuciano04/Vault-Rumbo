/** Guarda unos bytes como archivo mediante un enlace temporal. */
export function guardarArchivo(bytes: ArrayBuffer, nombre: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([bytes], { type: tipo }));
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}
