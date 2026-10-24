/**
 * Número de teléfono argentino en formato internacional (solo dígitos, con 549 para celulares),
 * o `null` si el contacto no es un único número válido (texto sin dígitos, dos números, email).
 */
export function normalizarTelefonoAR(contacto: string): string | null {
  const texto = contacto.trim();
  // Dos números juntos se distinguen por los separadores que no son de formato.
  if (/[^\d\s()+\-.]/.test(texto)) return null;
  if (/\d[\s.-]*\/|\d\s*[,;y]\s*\d/.test(texto)) return null;
  const tieneInternacional = texto.startsWith("+") || texto.startsWith("00");
  let digitos = texto.replace(/\D/g, "");
  if (tieneInternacional) {
    digitos = digitos.replace(/^00/, "");
    if (!digitos.startsWith("54")) return null;
    let resto = digitos.slice(2);
    if (resto.startsWith("9")) resto = resto.slice(1);
    return validar(resto);
  }
  if (digitos.startsWith("549")) return validar(digitos.slice(3));
  if (digitos.startsWith("54") && digitos.length > 10) return validar(digitos.slice(2));
  return validar(digitos);
}

/** Recibe el número nacional (código de área + abonado) con posible 0 y 15 de discado local. */
function validar(nacional: string): string | null {
  let numero = nacional.replace(/^0/, "");
  if (numero.length === 10) return `549${numero}`;
  // Con "15" local: el código de área tiene 2 a 4 dígitos y el abonado completa los 10 dígitos.
  for (const largoArea of [2, 3, 4]) {
    if (numero.slice(largoArea, largoArea + 2) === "15" && numero.length === 12) {
      numero = numero.slice(0, largoArea) + numero.slice(largoArea + 2);
      return numero.length === 10 ? `549${numero}` : null;
    }
  }
  return null;
}
