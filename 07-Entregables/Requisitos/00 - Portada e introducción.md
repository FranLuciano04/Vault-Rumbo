---
title: "Rumbo — Especificación de Requisitos"
subtitle: "Universidad de Morón · Ingeniería Informática — Trabajo de Campo (PC1)"
author:
  - "Francisco Luciano"
  - "Nahuel Viniegra"
  - "Paloma Patiño"
date: "2.º cuatrimestre 2026 · Entrega: 23/10/26"
---

# Introducción

**Rumbo** es un CRM a medida para agencias de turismo PyME. Digitaliza el circuito completo del negocio —de la consulta a la venta— que hoy se lleva con papel, carpetas físicas y planillas: registro de clientes y su historial, oportunidades y cotizaciones, viajes con su control económico (venta, costo, comisión y cuotas), alertas y vencimientos, catálogo de hoteles con reseñas, contenido de redes, y dashboard con reportes.

Este documento presenta la **especificación de requisitos** del sistema para la primera prueba de concepto (PC1). Es el complemento del documento de casos de uso: donde aquel describe *cómo se usa* el sistema, este enuncia *qué debe hacer*.

Se compone de:

- **153 requisitos funcionales**, agrupados en los once módulos del sistema.
- **13 requisitos no funcionales**, más las restricciones de alcance acordadas y el listado de atributos de calidad que todavía deben definirse.
- La **matriz de trazabilidad** entre casos de uso y requisitos funcionales.
- El listado de **requisitos con dependencias abiertas**, que esperan una confirmación de la agencia o del equipo.

## Método

Los requisitos funcionales se obtuvieron por **ingeniería inversa sobre los 31 casos de uso ya especificados**. De cada caso de uso se recorrieron el flujo principal, los flujos alternativos, las precondiciones, las postcondiciones y las reglas de negocio, y de allí se extrajo la capacidad funcional que el sistema debe ofrecer, separándola del guion de interacción propio del caso de uso. Cada requisito declara el caso de uso del que proviene y el punto exacto —paso o flujo alternativo— que lo respalda.

Cuando dos casos de uso describen la misma capacidad, se enunció **un solo requisito**, referenciado desde ambos en la matriz de trazabilidad.

Los **requisitos no funcionales no se derivan de los casos de uso**: describen cómo debe comportarse el sistema y provienen del relevamiento, de las decisiones de arquitectura y del alcance acordado.

Este documento **no incorpora funcionalidad que no estuviera ya especificada**. Los puntos sin definir se declaran como tales y no se completaron con valores estimados.

## Convenciones

- **Identificación:** `RF-###` para los requisitos funcionales, numerados de forma correlativa y agrupados por módulo; `RNF-##` para los no funcionales.
- **Prioridad:** se derivó con un criterio explícito, porque el proyecto no registra prioridades de negocio: **alta** si el requisito pertenece al flujo principal de su caso de uso, **media** si proviene de un flujo alternativo, una validación o una corrección, y **baja** si el requisito está marcado como opcional o futuro. Los 31 casos de uso pertenecen al alcance de PC1, de modo que la prioridad ordena el trabajo dentro de esa etapa y no decide qué entra en ella.
- **Tipo:** alta, baja, modificación, consulta, validación, cálculo, automático (lo ejecuta el sistema sin intervención) o seguridad.
- El documento usa el **lenguaje ubicuo** del dominio: *Cliente*, *Oportunidad*, *Cotización*, *Viaje*, *Pago*, *Alerta*, *Hotel*, *Reseña*, *Usuario*, *Destino*, *Operador* y *ContenidoRed*.
- Los importes se expresan en **pesos argentinos (ARS)** y **dólares (USD)** según la moneda de cada operación; las fechas de negocio, en formato **dd/mm/aa**.

\newpage
