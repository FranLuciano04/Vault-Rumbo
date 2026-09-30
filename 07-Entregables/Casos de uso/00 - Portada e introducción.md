---
title: "Rumbo — Especificación de Casos de Uso"
subtitle: "Universidad de Morón · Ingeniería Informática — Trabajo de Campo (PC1)"
author:
  - "Francisco Luciano"
  - "Nahuel Viniegra"
  - "Paloma Patiño"
date: "2.º cuatrimestre 2026 · Entrega: 02/10/26"
---

# Introducción

**Rumbo** es un CRM a medida para agencias de turismo PyME. Digitaliza el circuito completo del negocio —de la consulta a la venta— que hoy se lleva con papel, carpetas físicas y planillas: registro de clientes y su historial, oportunidades y cotizaciones, viajes con su control económico (venta, costo, comisión y cuotas), alertas y vencimientos, catálogo de hoteles con reseñas, contenido de redes, y dashboard con reportes.

Este documento presenta la **especificación de los casos de uso** del sistema para la primera prueba de concepto (PC1). Se compone de:

- El **diagrama de casos de uso** general y sus **actores**.
- La especificación detallada de cada caso de uso: descripción, actores, precondiciones, flujo principal, flujos alternativos, postcondiciones, reglas de negocio y entidades del dominio involucradas.

Los casos de uso se agrupan por módulo: Clientes, Oportunidades y cotización, Viajes, Economía y pagos, Alertas, Catálogo de hoteles, Redes, Dashboard, Calendario y Usuarios/Seguridad.

## Convenciones

- El documento usa el **lenguaje ubicuo** del dominio: *Cliente*, *Oportunidad*, *Cotización*, *Viaje*, *Pago*, *Alerta*, *Hotel*, *Reseña*, *Usuario*, *Destino* y *ContenidoRed*.
- Los importes se expresan en **pesos argentinos (ARS)** y las fechas de negocio en formato **dd/mm/aa**.
- Los roles del sistema (*Empleado*, *Admin*, *Dueño*) siguen el modelo de visibilidad definido para el proyecto: lectura global de la información de la agencia y propiedad por asesor para la gestión.

\newpage
