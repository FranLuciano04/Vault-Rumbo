---
id: T-168
titulo: Mostrar las consultas sin destino ni pasajeros en web y mobile
modulo: M4 — Oportunidades y cotizaciones
capa: web
estado: hecho
depende_de: [T-167, T-069]
tamaño: M
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-04, RF-013, DEC-0023]
origen: hallazgo T-069
asignado: palomap2003
tomado_el: 28/10/26 16:38
rama: feature/T-168-mostrar-las-consultas-sin-destino-ni-pas
pr:
---
# T-168 Mostrar las consultas sin destino ni pasajeros en web y mobile

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
La pantalla de nueva consulta deja registrar una oportunidad solo con cliente y canal. Las pantallas que muestran el destino o los pasajeros indican «Destino a definir» o «—» cuando faltan. Esto vale para la tarjeta y el detalle de la oportunidad, el historial del cliente en web y en mobile, y el aviso de oportunidad abierta. Aplica [[DEC-0023 Datos mínimos de la consulta|DEC-0023]].

## Criterios de aceptación
- [ ] `esquemaConsulta` deja opcionales el destino y los pasajeros. Una consulta sin esos datos se registra igual.
- [ ] La tarjeta, el detalle y el historial (web y mobile) muestran «Destino a definir» o «—» cuando falta el dato.
- [ ] Si al emitir una cotización llega el 409 por falta de destino o de pasajeros, se muestra el motivo.
- [ ] Desde el detalle de la oportunidad se pueden completar el destino y los pasajeros (`PATCH /oportunidades/{id}`), con las mismas validaciones que al crear. Una vez cargados no se vacían. *(Se sumó el 28/10/26 por un hallazgo importante de la review, con la decisión de Paloma: sin esto, una consulta registrada solo con cliente y canal no se podía cotizar nunca desde la web.)*

## Tests esperados
Se ajustan los tests de RF-013 de `NuevaConsulta.test.tsx` y se suman `describe('RF-013 consulta sin destino')` en la web y un test equivalente en el historial mobile.

## Contexto (leer solo esto)
- [[DEC-0023 Datos mínimos de la consulta|DEC-0023]]
- `src/apps/web/src/features/oportunidades/` (T-069, T-070, T-071 y T-072)
- `src/apps/mobile/src/features/clientes/HistorialClienteMobile.tsx`

## Archivos probables
- `src/packages/shared/src/esquemas/`
- `src/apps/web/src/features/oportunidades/` y `features/clientes/`
- `src/apps/mobile/src/features/clientes/`

## Fuera de alcance
- El backend, que va en T-167.

## Notas de implementación
- **Ampliación (decisión de Paloma, 28/10/26):** la review encontró que la web no tenía dónde completar el destino ni los pasajeros. Una consulta registrada solo con cliente y canal no se podía cotizar nunca. Se sumó el criterio de editar desde el detalle y el ticket pasó de S a M. Se hizo una segunda ronda de TDD (rojo `8f61d30`, verde `77e4e76`).
- **Edición (`EdicionDestinoPasajeros`):** cada dato se completa por separado. Lo que ya estaba cargado es obligatorio y no se vacía. El PATCH manda solo lo que cambió. El formulario se monta al abrirlo, así los valores iniciales salen de la oportunidad actual. Solo lo ve quien puede escribir y solo si la oportunidad está abierta.
- **Formulario de consulta:** el campo «Pasajeros» arranca vacío, porque DEC-0023 descarta poner un valor de relleno. El NaN del campo vacío se convierte en `undefined` sin unión de zod, así el decimal muestra el mensaje en castellano. El destino tiene un tope de 200 caracteres.
- **Accesibilidad:** el «—» de pasajeros usa `PasajerosOportunidad` con `role="img"` y `aria-label="Pasajeros sin definir"`. Si faltan las fechas, el encabezado de cotizaciones ya no muestra «—»; queda igual que el detalle y la tarjeta.
- **Shared:** `textoPasajeros` en `etiquetas.ts`. Mobile no necesitó cambios de código, porque T-167 ya mostraba «Destino a definir».
- **Review (Opus, dos rondas):** sin bloqueantes. Ronda 1: el hallazgo importante dio origen a la ampliación y los menores quedaron arreglados. Ronda 2: un importante (completar cada dato por separado) y cuatro menores (tests de permisos, montar el formulario al abrirlo, cancelar y el tope de 200), todos arreglados.
- **Para el equipo:** el backend deja editar destino y pasajeros de una oportunidad ganada o perdida (`servicios/oportunidades.py`). El front oculta el botón, pero falta decidir si una oportunidad cerrada es de solo lectura, salvo las notas. Queda abierto para la sync.
- **Modelos:** tests, implementación, refactor y fix con Sonnet, y review con Opus, sin escalado.
- **Checks en la PC (toca `@rumbo/shared`):** después del merge de `main`, web da 722 passed. Antes del merge, la cobertura de web era 93,7 % de líneas. Shared da 403 y mobile 183. Lint y tipos están limpios en las tres partes.
