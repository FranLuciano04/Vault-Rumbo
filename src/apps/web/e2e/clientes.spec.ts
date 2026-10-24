import { expect, type Page, test } from "@playwright/test";
import { DUENA, EMULADOR, elegirContrasena, URL_BASE } from "./compose";

// T-049: flujos de Clientes (CU-02, CU-03) contra el backend real. Los datos de partida se
// preparan por la API (más estable que la UI); lo que se prueba se hace desde la web.
// Los nombres y contactos llevan un sufijo único: la base y el emulador se comparten entre specs.
const SUFIJO = String(Date.now());
const CLAVE_FREELANCE = "Clave-de-prueba-3";

interface ClienteApi {
  id: string;
  nombre: string;
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

async function api<T>(token: string, metodo: string, ruta: string, cuerpo?: object): Promise<T> {
  // El Compose de e2e publica nginx por HTTP en localhost.
  // nosemgrep: typescript.react.security.react-insecure-request.react-insecure-request
  const respuesta = await fetch(`${URL_BASE}/api${ruta}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  expect(respuesta.ok, `${metodo} ${ruta} respondió ${String(respuesta.status)}`).toBe(true);
  return (await respuesta.json()) as T;
}

test.describe("CU-02 Registrar cliente", () => {
  test("RF-003 posible duplicado: avisa, muestra el parecido y deja confirmar el alta", async ({
    page,
  }) => {
    const contacto = `duplicado-${SUFIJO}@rumbo.test`;
    const existente = `Cliente Existente E2E ${SUFIJO}`;
    const nuevo = `Cliente Nuevo E2E ${SUFIJO}`;
    const token = await tokenDe(DUENA.email, DUENA.password);
    await api<ClienteApi>(token, "POST", "/clientes", {
      nombre: existente,
      contacto,
      segmento: "pareja",
    });

    await ingresar(page, DUENA.email, DUENA.password);
    await page.goto("/clientes/nuevo");
    await page.getByLabel("Nombre y apellido o grupo").fill(nuevo);
    await page.getByLabel("Contacto (teléfono o email)").fill(contacto);
    await page.getByRole("button", { name: "Registrar cliente" }).click();

    const aviso = page.getByRole("alert").filter({ hasText: "Posible cliente duplicado" });
    await expect(aviso).toBeVisible();
    await expect(aviso).toContainText(existente);
    await expect(aviso.getByRole("link", { name: "Ir al cliente existente" })).toBeVisible();
    // Todavía no se creó: seguimos en el formulario.
    await expect(page).toHaveURL(/\/clientes\/nuevo$/);

    await aviso.getByRole("button", { name: "Confirmar alta" }).click();

    await expect(page).toHaveURL(/\/clientes\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { name: nuevo, level: 1 })).toBeVisible();
  });
});

test.describe("CU-03 Gestionar ficha del cliente", () => {
  test("RF-151 visibilidad del freelance: no ve el cliente de otro asesor y sí los suyos", async ({
    page,
  }) => {
    const email = `freelance-${SUFIJO}@rumbo.test`;
    const ajeno = `Cliente Ajeno E2E ${SUFIJO}`;
    const propio = `Cliente Propio E2E ${SUFIJO}`;
    const duena = await tokenDe(DUENA.email, DUENA.password);
    const yo = await api<{ id: string }>(duena, "GET", "/auth/yo");
    const freelance = await api<{ id: string }>(duena, "POST", "/usuarios", {
      nombre: `Freelance E2E ${SUFIJO}`,
      email,
      rol: "freelance",
    });
    // El alta crea la cuenta sin contraseña (DEC-0016): se elige con el código del emulador.
    await elegirContrasena(email, CLAVE_FREELANCE);
    const clienteAjeno = await api<ClienteApi>(duena, "POST", "/clientes", {
      nombre: ajeno,
      contacto: `ajeno-${SUFIJO}@rumbo.test`,
      segmento: "familia",
      asesor_asignado_id: yo.id,
    });
    const clientePropio = await api<ClienteApi>(duena, "POST", "/clientes", {
      nombre: propio,
      contacto: `propio-${SUFIJO}@rumbo.test`,
      segmento: "amigos",
      asesor_asignado_id: freelance.id,
    });

    await ingresar(page, email, CLAVE_FREELANCE);

    // El listado trae solo los suyos.
    await page.goto("/clientes");
    await expect(page.getByText(propio)).toBeVisible();
    await expect(page.getByText(ajeno)).toHaveCount(0);

    // La ficha propia abre; la ajena responde 404 y la pantalla lo dice sin filtrar datos.
    await page.goto(`/clientes/${clientePropio.id}`);
    await expect(page.getByRole("heading", { name: propio, level: 1 })).toBeVisible();
    await page.goto(`/clientes/${clienteAjeno.id}`);
    await expect(
      page.getByText("Cliente no encontrado. No existe o no lo podés ver."),
    ).toBeVisible();
    await expect(page.getByText(ajeno)).toHaveCount(0);
  });

  test("RF-007 edición: un contacto inválido se rechaza en la ficha y no se guarda", async ({
    page,
  }) => {
    const nombre = `Cliente Edicion E2E ${SUFIJO}`;
    const contacto = `edicion-${SUFIJO}@rumbo.test`;
    const token = await tokenDe(DUENA.email, DUENA.password);
    const cliente = await api<ClienteApi>(token, "POST", "/clientes", {
      nombre,
      contacto,
      segmento: "individual",
    });

    await ingresar(page, DUENA.email, DUENA.password);
    await page.goto(`/clientes/${cliente.id}`);
    await page.getByRole("button", { name: "Editar ficha" }).click();
    await page.getByLabel("Contacto", { exact: true }).fill("esto-no-es-un-contacto");
    await page.getByRole("button", { name: "Guardar" }).click();

    await expect(page.getByText("Ingresá un teléfono o un email válido.")).toBeVisible();
    // La edición sigue abierta y nada se confirmó.
    await expect(page.getByRole("button", { name: "Guardar" })).toBeVisible();
    await expect(page.getByText("Ficha actualizada")).toHaveCount(0);

    // No persistió: cancelando y recargando, la ficha conserva el contacto original.
    await page.getByRole("button", { name: "Cancelar" }).click();
    await page.reload();
    await expect(page.getByText(contacto)).toBeVisible();
  });
});
