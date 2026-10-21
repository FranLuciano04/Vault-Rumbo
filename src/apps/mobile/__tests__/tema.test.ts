// Mismos tokens que la web (src/apps/web/src/estilos/tokens.css), expuestos en theme.extend.
const config = require("../tailwind.config.js");

const extend = config.theme?.extend ?? {};
const colores = extend.colors ?? {};
const valor = (c: unknown) => (typeof c === "string" ? c : (c as { DEFAULT?: string })?.DEFAULT)?.toLowerCase();

describe("RNF-11 tema de NativeWind con los tokens del sistema de diseño", () => {
  it("el color primario es el azul del equipo #22506f", () => {
    expect(valor(colores.primary)).toBe("#22506f");
  });

  it("secundario y acento son el celeste claro #e6eff5", () => {
    expect(valor(colores.secondary)).toBe("#e6eff5");
    expect(valor(colores.accent)).toBe("#e6eff5");
  });

  it("borde e input son el gris #d9d9d9 y el anillo de foco es #73a5c4", () => {
    expect(valor(colores.border)).toBe("#d9d9d9");
    expect(valor(colores.input)).toBe("#d9d9d9");
    expect(valor(colores.ring)).toBe("#73a5c4");
  });

  it("los textos sobre primario son blancos", () => {
    expect(valor(colores["primary-foreground"] ?? colores.primary?.foreground)).toBe("#ffffff");
  });

  it("usa Plus Jakarta Sans como tipografía sans", () => {
    expect(JSON.stringify(extend.fontFamily?.sans ?? "")).toContain("Plus Jakarta Sans");
  });
});
