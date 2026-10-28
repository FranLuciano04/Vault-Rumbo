import { expect, type Page, test } from "@playwright/test";
import { DUENA, EMULADOR, elegirContrasena, URL_BASE } from "./compose";

// T-085: el catálogo de hoteles y las reseñas (CU-16, CU-17, CU-18, CU-29) contra el backend real.
// Los datos de partida se preparan por la API; lo que se prueba se hace desde la web. Cada test
// crea su propio destino y sus propias personas con un sufijo único: la base y el emulador se
// comparten entre specs. No depende de la semilla de demo de hoteles: crea sus propios datos.
const SUFIJO = String(Date.now());
const CLAVE = "Clave-de-prueba-6";

type Rol = "empleado" | "admin" | "freelance";

interface Persona {
  email: string;
}

interface IdApi {
  id: string;
}

async function ingresar(pagina: Page, email: string, password: string): Promise<void> {
  await pagina.goto("/login");
  await pagina.getByLabel("Email").fill(email);
  await pagina.getByLabel("Contraseña", { exact: true }).fill(password);
  const respuesta = pagina.waitForResponse((r) => r.url().includes("/api/auth/yo"));
  await pagina.getByRole("button", { name: "Ingresar" }).click();
  const yo = await respuesta;
  if (!yo.ok()) {
    const aviso = await pagina.getByRole("alert").textContent();
    throw new Error(`Falló el ingreso de ${email}: ${String(yo.status())} ${aviso ?? ""}`);
  }
  await expect(pagina).toHaveURL(/\/agenda$/, { timeout: 15_000 });
}

/** Token de Firebase del emulador, para llamar a la API como esa persona. */
async function tokenDe(email: string, password: string): Promise<string> {
  // HTTP a propósito: el emulador escucha solo en 127.0.0.1 (docker-compose.e2e.yml).
  // nosemgrep: typescript.react.security.react-insecure-request.react-insecure-request
  const respuesta = await fetch(
    `${EMULADOR}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const cuerpo = (await respuesta.json()) as { idToken?: string };
  expect(cuerpo.idToken, `el emulador debería dar token a ${email}`).toBeDefined();
  return cuerpo.idToken ?? "";
}

async function pedir(token: string, metodo: string, ruta: string, cuerpo?: object) {
  // El Compose de e2e publica nginx por HTTP en localhost.
  // nosemgrep: typescript.react.security.react-insecure-request.react-insecure-request
  return fetch(`${URL_BASE}/api${ruta}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
}

async function api<T>(token: string, metodo: string, ruta: string, cuerpo?: object): Promise<T> {
  const respuesta = await pedir(token, metodo, ruta, cuerpo);
  expect(respuesta.ok, `${metodo} ${ruta} respondió ${String(respuesta.status)}`).toBe(true);
  return (await respuesta.json()) as T;
}

/** Alta de una persona del equipo por la API, con contraseña elegida (DEC-0016). */
async function crearPersona(rol: Rol, etiqueta: string): Promise<Persona> {
  const email = `${rol}-hoteles-${etiqueta}-${SUFIJO}@rumbo.test`;
  const duena = await tokenDe(DUENA.email, DUENA.password);
  await api(duena, "POST", "/usuarios", {
    nombre: `${rol} Hoteles ${etiqueta} E2E ${SUFIJO}`,
    email,
    rol,
  });
  await elegirContrasena(email, CLAVE);
  return { email };
}

async function crearDestino(
  token: string,
  etiqueta: string,
): Promise<{ id: string; nombre: string }> {
  const nombre = `Destino Hoteles ${etiqueta} ${SUFIJO}`;
  const destino = await api<IdApi>(token, "POST", "/destinos", { nombre, pais: "Argentina" });
  return { id: destino.id, nombre };
}

async function crearHotel(
  token: string,
  destinoId: string,
  nombre: string,
  extra: object = {},
): Promise<string> {
  const hotel = await api<IdApi>(token, "POST", "/hoteles", {
    nombre,
    destino_id: destinoId,
    categoria: "4 estrellas",
    precio_referencia: "100000.00",
    servicios: ["wifi"],
    ...extra,
  });
  return hotel.id;
}

async function crearCliente(
  token: string,
  etiqueta: string,
): Promise<{ id: string; nombre: string }> {
  const nombre = `Cliente Hoteles ${etiqueta} ${SUFIJO}`;
  const cliente = await api<IdApi>(token, "POST", "/clientes", {
    nombre,
    contacto: `hoteles-${etiqueta.toLowerCase()}-${SUFIJO}@rumbo.test`,
    segmento: "pareja",
  });
  return { id: cliente.id, nombre };
}

async function crearResena(
  token: string,
  hotelId: string,
  clienteId: string,
  puntaje: number,
  comentario: string,
): Promise<string> {
  const resena = await api<IdApi>(token, "POST", `/hoteles/${hotelId}/resenas`, {
    cliente_id: clienteId,
    puntaje,
    comentario,
    fecha: new Date().toISOString().slice(0, 10),
  });
  return resena.id;
}

test.describe("CU-16 Gestionar hotel en catálogo", () => {
  test("RF-097 alta: el empleado da de alta un hotel desde la web y aparece en el catálogo", async ({
    page,
  }) => {
    const duena = await tokenDe(DUENA.email, DUENA.password);
    const destino = await crearDestino(duena, "Alta");
    const empleado = await crearPersona("empleado", "alta");
    const nombre = `Hotel Alta E2E ${SUFIJO}`;
    await ingresar(page, empleado.email, CLAVE);

    await page.goto("/hoteles");
    await page.getByRole("link", { name: "Nuevo hotel" }).click();
    await expect(page.getByRole("heading", { name: "Nuevo hotel", level: 1 })).toBeVisible();

    await page.getByLabel("Nombre", { exact: true }).fill(nombre);
    await page.getByLabel("Destino", { exact: true }).selectOption({ label: destino.nombre });
    await page.getByLabel("Categoría (opcional)").selectOption("4 estrellas");
    await page.getByLabel("Precio de referencia (opcional)").fill("150.000");
    await page.getByRole("button", { name: "Wifi" }).click();
    await page.getByRole("button", { name: "Registrar hotel" }).click();

    // Vuelve al catálogo; el hotel nuevo está en su destino, activo y sin reseñas.
    await expect(page).toHaveURL(/\/hoteles$/);
    await page.getByLabel("Destino", { exact: true }).selectOption({ label: destino.nombre });
    await expect(page.getByText("1 hotel encontrado")).toBeVisible();
    const tarjeta = page.getByRole("listitem").filter({ hasText: nombre });
    await expect(tarjeta).toContainText("4 estrellas");
    await expect(tarjeta).toContainText("Sin reseñas");
    await expect(tarjeta).toContainText(/150\.000/);
    await expect(tarjeta).toContainText("wifi");
  });

  test("RF-099 duplicado: repetir el nombre en el destino no da de alta y ofrece abrir el existente", async ({
    page,
  }) => {
    const duena = await tokenDe(DUENA.email, DUENA.password);
    const destino = await crearDestino(duena, "Duplicado");
    const empleado = await crearPersona("empleado", "duplicado");
    const nombre = `Hotel Repetido E2E ${SUFIJO}`;
    await crearHotel(duena, destino.id, nombre);
    await ingresar(page, empleado.email, CLAVE);

    await page.goto("/hoteles/nuevo");
    await page.getByLabel("Nombre", { exact: true }).fill(nombre);
    await page.getByLabel("Destino", { exact: true }).selectOption({ label: destino.nombre });
    await page.getByRole("button", { name: "Registrar hotel" }).click();

    await expect(page.getByRole("link", { name: /Abrir el hotel existente/ })).toBeVisible();
    await expect(page).toHaveURL(/\/hoteles\/nuevo$/);
  });
});

test.describe("CU-17 Registrar reseña de hotel", () => {
  test("RF-101 reseña: el empleado registra la reseña de un cliente y el puntaje del hotel se actualiza", async ({
    page,
  }) => {
    const duena = await tokenDe(DUENA.email, DUENA.password);
    const destino = await crearDestino(duena, "Resena");
    const hotelId = await crearHotel(duena, destino.id, `Hotel Reseña E2E ${SUFIJO}`);
    const cliente = await crearCliente(duena, "Resena");
    const empleado = await crearPersona("empleado", "resena");
    const comentario = `Muy buena estadía ${SUFIJO}`;
    await ingresar(page, empleado.email, CLAVE);

    await page.goto(`/hoteles/${hotelId}`);
    await expect(page.getByText("Sin reseñas")).toBeVisible();
    await page.getByRole("button", { name: "Nueva reseña" }).click();

    await page.getByLabel("Buscar cliente").fill(cliente.nombre);
    await page.getByRole("button", { name: new RegExp(cliente.nombre) }).click();
    await page.getByLabel("Puntaje").fill("5");
    await page.getByLabel("Comentario").fill(comentario);
    await page.getByRole("button", { name: "Guardar reseña" }).click();

    await expect(page.getByText(comentario)).toBeVisible();
    await expect(page.getByText("5,0", { exact: true })).toBeVisible();
    await expect(page.getByText("· 1 reseña", { exact: true })).toBeVisible();
    await expect(page.getByText("Sin reseñas")).toHaveCount(0);
  });
});

test.describe("CU-18 Buscar y recomendar hoteles", () => {
  test("RF-109 orden: «Mejor valorados» ordena por puntaje promedio y deja al final los sin reseñas", async ({
    page,
  }) => {
    const duena = await tokenDe(DUENA.email, DUENA.password);
    const destino = await crearDestino(duena, "Orden");
    // Por nombre irían Alfa, Sin y Zeta: el orden por puntaje es Zeta, Alfa, Sin.
    const alfa = `Hotel Alfa ${SUFIJO}`;
    const zeta = `Hotel Zeta ${SUFIJO}`;
    const sin = `Hotel Sin reseñas ${SUFIJO}`;
    const idAlfa = await crearHotel(duena, destino.id, alfa);
    const idZeta = await crearHotel(duena, destino.id, zeta);
    await crearHotel(duena, destino.id, sin);
    const cliente = await crearCliente(duena, "Orden");
    // Alfa suma más (9) que Zeta (5), pero su promedio (3) es menor: distingue promedio de suma.
    for (const comentario of ["Regular uno", "Regular dos", "Regular tres"]) {
      await crearResena(duena, idAlfa, cliente.id, 3, comentario);
    }
    await crearResena(duena, idZeta, cliente.id, 5, "Excelente");
    await ingresar(page, DUENA.email, DUENA.password);

    await page.goto("/hoteles");
    await page.getByLabel("Destino", { exact: true }).selectOption({ label: destino.nombre });
    await expect(page.getByText("3 hoteles encontrados")).toBeVisible();
    await expect(page.getByLabel("Ordenar por")).toHaveValue("valoracion");
    const resultados = page
      .getByRole("list")
      .filter({ has: page.getByRole("heading", { level: 2 }) });
    await expect(resultados.getByRole("heading", { level: 2 })).toHaveText([zeta, alfa, sin]);

    const tarjetaZeta = page.getByRole("listitem").filter({ hasText: zeta });
    await expect(tarjetaZeta).toContainText("5,0");
    await expect(page.getByRole("listitem").filter({ hasText: alfa })).toContainText("3,0");

    // Por nombre, el orden es otro.
    await page.getByLabel("Ordenar por").selectOption("nombre");
    await expect(resultados.getByRole("heading", { level: 2 })).toHaveText([alfa, sin, zeta]);
  });
});

test.describe("CU-29 Eliminar reseña", () => {
  test("RF-111 ocultar: la admin oculta una reseña con motivo, el promedio cambia, y al restaurarla vuelve", async ({
    page,
  }) => {
    const duena = await tokenDe(DUENA.email, DUENA.password);
    const destino = await crearDestino(duena, "Moderar");
    const hotelId = await crearHotel(duena, destino.id, `Hotel Moderar E2E ${SUFIJO}`);
    const clienteA = await crearCliente(duena, "ModerarA");
    const clienteB = await crearCliente(duena, "ModerarB");
    const buena = `Reseña buena ${SUFIJO}`;
    const mala = `Reseña a ocultar ${SUFIJO}`;
    await crearResena(duena, hotelId, clienteA.id, 5, buena);
    await crearResena(duena, hotelId, clienteB.id, 3, mala);
    const admin = await crearPersona("admin", "moderar");
    await ingresar(page, admin.email, CLAVE);

    await page.goto(`/hoteles/${hotelId}`);
    await expect(page.getByText("4,0", { exact: true })).toBeVisible();
    await expect(page.getByText("· 2 reseñas", { exact: true })).toBeVisible();

    const publicadas = page.getByRole("region", { name: "Reseñas", exact: true });
    const reseñaMala = publicadas.getByRole("listitem").filter({ hasText: mala });
    await reseñaMala.getByRole("button", { name: "Ocultar reseña" }).click();

    // Sin motivo no se oculta.
    await reseñaMala.getByRole("button", { name: "Confirmar" }).click();
    await expect(reseñaMala.getByRole("alert")).toContainText("El motivo es obligatorio");

    await reseñaMala.getByLabel("Motivo").fill("Datos de otra persona");
    await reseñaMala.getByRole("button", { name: "Confirmar" }).click();

    // El promedio ya no la cuenta y aparece entre las ocultas, con su motivo.
    await expect(page.getByText("5,0", { exact: true })).toBeVisible();
    await expect(page.getByText("· 1 reseña", { exact: true })).toBeVisible();
    await expect(publicadas.getByText(mala)).toHaveCount(0);
    const ocultas = page.getByRole("region", { name: "Reseñas ocultas" });
    await expect(ocultas.getByText(mala)).toBeVisible();
    await expect(ocultas).toContainText("Motivo: Datos de otra persona");

    // El catálogo también refleja el promedio de la reseña que quedó.
    await page.goto("/hoteles");
    await page.getByLabel("Destino", { exact: true }).selectOption({ label: destino.nombre });
    await expect(page.getByRole("listitem").filter({ hasText: "Hotel Moderar" })).toContainText(
      "5,0",
    );

    // Restaurar la devuelve al promedio.
    await page.goto(`/hoteles/${hotelId}`);
    await page
      .getByRole("region", { name: "Reseñas ocultas" })
      .getByRole("button", { name: "Restaurar reseña" })
      .click();
    await expect(page.getByText("4,0", { exact: true })).toBeVisible();
    await expect(page.getByText("· 2 reseñas", { exact: true })).toBeVisible();
    await expect(publicadas.getByText(mala)).toBeVisible();
    await expect(page.getByRole("region", { name: "Reseñas ocultas" })).toHaveCount(0);
  });
});

test.describe("RF-151 permisos del freelance sobre el catálogo", () => {
  test("RF-151 el freelance consulta los hoteles pero no da de alta ni reseña", async ({
    page,
  }) => {
    const duena = await tokenDe(DUENA.email, DUENA.password);
    const destino = await crearDestino(duena, "Freelance");
    const nombre = `Hotel Freelance E2E ${SUFIJO}`;
    const hotelId = await crearHotel(duena, destino.id, nombre);
    const freelance = await crearPersona("freelance", "catalogo");
    await ingresar(page, freelance.email, CLAVE);

    // Ve el catálogo, pero no el alta.
    await page.goto("/hoteles");
    await page.getByLabel("Destino", { exact: true }).selectOption({ label: destino.nombre });
    await expect(page.getByRole("link", { name: nombre })).toBeVisible();
    await expect(page.getByRole("link", { name: "Nuevo hotel" })).toHaveCount(0);
    await expect(page.getByRole("note")).toContainText("Solo consulta");

    // La ruta del alta lo devuelve al catálogo.
    await page.goto("/hoteles/nuevo");
    await expect(page).toHaveURL(/\/hoteles$/);

    // En el detalle lee, pero no registra reseñas ni edita el hotel.
    await page.goto(`/hoteles/${hotelId}`);
    await expect(page.getByRole("heading", { name: nombre, level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Nueva reseña" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Editar" })).toHaveCount(0);

    // Y la API lo rechaza igual si lo intenta por su cuenta.
    const token = await tokenDe(freelance.email, CLAVE);
    const alta = await pedir(token, "POST", "/hoteles", {
      nombre: `Hotel Prohibido ${SUFIJO}`,
      destino_id: destino.id,
      servicios: [],
    });
    expect(alta.status).toBe(403);

    const cliente = await crearCliente(duena, "Freelance");
    const resena = await pedir(token, "POST", `/hoteles/${hotelId}/resenas`, {
      cliente_id: cliente.id,
      puntaje: 4,
      comentario: "No debería registrarse",
      fecha: new Date().toISOString().slice(0, 10),
    });
    expect(resena.status).toBe(403);
  });
});
