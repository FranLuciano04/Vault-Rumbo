import { usuariosPorRol } from "@rumbo/shared/mocks";
import { seccionesVisibles } from "@/app/navegacion";

const ids = (rol: keyof typeof usuariosPorRol, cambios = {}) =>
  seccionesVisibles({ ...usuariosPorRol[rol], ...cambios }).map((s) => s.id);

const sinAdmin = [
  "agenda", "calendario", "clientes", "oportunidades", "cotizaciones",
  "viajes", "hoteles", "dashboard",
];
const todas = [
  "agenda", "calendario", "clientes", "oportunidades", "cotizaciones",
  "viajes", "hoteles", "redes", "dashboard", "reportes", "configuracion",
];

describe("RF-141 navegación por rol (tabla «Vistas por rol»)", () => {
  it("el empleado sin acceso a redes no ve Redes, Reportes ni Configuración", () => {
    expect(ids("empleado")).toEqual(sinAdmin);
  });

  it("el empleado con acceso a redes ve además Redes, pero no Reportes ni Configuración", () => {
    const resultado = ids("empleado", { acceso_redes: true });
    expect(resultado).toContain("redes");
    expect(resultado).not.toContain("reportes");
    expect(resultado).not.toContain("configuracion");
  });

  it("el admin ve todas las secciones", () => {
    expect(ids("admin")).toEqual(todas);
  });

  it("el dueño ve las mismas secciones que el admin", () => {
    expect(ids("dueno")).toEqual(todas);
  });

  it("el freelance no ve Redes, Reportes ni Configuración, aun con acceso_redes", () => {
    expect(ids("freelance")).toEqual(sinAdmin);
    expect(ids("freelance", { acceso_redes: true })).toEqual(sinAdmin);
  });

  it("el admin sin acceso a redes no ve Redes", () => {
    expect(ids("admin", { acceso_redes: false })).not.toContain("redes");
  });

  it("cada sección tiene etiqueta y ruta propias", () => {
    for (const s of seccionesVisibles(usuariosPorRol.admin)) {
      expect(s.etiqueta).not.toBe("");
      expect(s.ruta).toBe(`/${s.id}`);
    }
  });
});
