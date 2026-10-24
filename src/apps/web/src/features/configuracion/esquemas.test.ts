import { esquemaComision, esquemaEdicionUsuario, esquemaParametros } from "./esquemas";

describe("RF-147 validación de la edición de usuario (zod)", () => {
  const valido = { nombre: "Ana Pérez", email: "ana@rumbo.test", rol: "empleado", acceso_redes: false };

  it("RF-147 acepta un nombre corregido", () => {
    expect(esquemaEdicionUsuario.safeParse({ ...valido, nombre: "Ana María" }).success).toBe(true);
  });

  it("RF-147 rechaza un nombre vacío", () => {
    expect(esquemaEdicionUsuario.safeParse({ ...valido, nombre: "" }).success).toBe(false);
  });

  it("RF-147 rechaza un nombre de solo espacios", () => {
    expect(esquemaEdicionUsuario.safeParse({ ...valido, nombre: "   " }).success).toBe(false);
  });

  it("RF-147 rechaza un nombre de más de 120 caracteres", () => {
    expect(esquemaEdicionUsuario.safeParse({ ...valido, nombre: "a".repeat(121) }).success).toBe(
      false,
    );
  });

  it("RF-147 no valida el email (se muestra bloqueado)", () => {
    expect(esquemaEdicionUsuario.safeParse({ ...valido, email: "jose@agencia.c" }).success).toBe(
      true,
    );
  });
});

const validos = { vigencia_cotizacion_meses: 1, anticipacion_salida_dias: 7, recontacto_meses: 6 };

describe("RF-084 validación de los parámetros (zod)", () => {
  it("RF-084 acepta valores enteros válidos", () => {
    expect(esquemaParametros.safeParse(validos).success).toBe(true);
  });

  it("RF-084 acepta anticipacion_salida_dias = 0", () => {
    expect(esquemaParametros.safeParse({ ...validos, anticipacion_salida_dias: 0 }).success).toBe(
      true,
    );
  });

  it.each([
    ["vigencia_cotizacion_meses", 0],
    ["vigencia_cotizacion_meses", -1],
    ["recontacto_meses", 0],
    ["anticipacion_salida_dias", -3],
    ["vigencia_cotizacion_meses", 1.5],
    ["recontacto_meses", "abc"],
  ])("RF-084 rechaza %s = %s", (campo, valor) => {
    expect(esquemaParametros.safeParse({ ...validos, [campo]: valor }).success).toBe(false);
  });
});

describe("RF-083 validación de la comisión por defecto (zod)", () => {
  it.each([
    ["porcentaje", 0],
    ["porcentaje", 100],
    ["porcentaje", 12.5],
    ["importe", 0],
    ["importe", 15000.5],
    ["importe", 250000],
  ])("RF-083 acepta %s con valor %s", (tipo, valor) => {
    expect(
      esquemaComision.safeParse({ comision_default_tipo: tipo, comision_default_valor: valor })
        .success,
    ).toBe(true);
  });

  it.each([
    ["porcentaje", 100.01],
    ["porcentaje", 150],
    ["porcentaje", -1],
    ["porcentaje", 10.555],
    ["importe", 100.001],
    ["importe", 1_000_000_000_000],
    ["importe", -1],
    ["importe", "abc"],
    ["otro", 10],
  ])("RF-083 rechaza %s con valor %s", (tipo, valor) => {
    expect(
      esquemaComision.safeParse({ comision_default_tipo: tipo, comision_default_valor: valor })
        .success,
    ).toBe(false);
  });
});
