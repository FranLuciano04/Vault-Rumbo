import { esquemaComision, esquemaParametros } from "./esquemas";

const validos = { vigencia_cotizacion_meses: 1, anticipacion_salida_dias: 7, recontacto_meses: 6 };

describe("RF-084 validación de los parámetros (zod)", () => {
  it("RF-084 acepta valores enteros válidos", () => {
    expect(esquemaParametros.safeParse(validos).success).toBe(true);
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
