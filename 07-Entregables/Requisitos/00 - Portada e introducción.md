---
title: "Rumbo — Especificación de Requisitos"
subtitle: "Universidad de Morón · Ingeniería Informática — Trabajo de Campo (PC1)"
author:
  - "Francisco Luciano"
  - "Nahuel Viniegra"
  - "Paloma Patiño"
date: "2.º cuatrimestre 2026 · Entrega: 02/10/26"
---

# Introducción

**Rumbo** es un CRM a medida para agencias de turismo PyME. Digitaliza el circuito completo del negocio que hoy se lleva con papel, carpetas físicas y planillas: registro de clientes y su historial, oportunidades y cotizaciones, viajes con su control económico (venta, costo, comisión y cuotas), alertas y vencimientos, catálogo de hoteles con reseñas, contenido de redes, y dashboard con reportes.

Este documento presenta la **especificación de requisitos** del sistema. Es la base del análisis: enuncia *qué debe hacer* el sistema y *cómo debe comportarse* al hacerlo. Los **casos de uso**, especificados en el documento que lo acompaña, son la **realización** de estos requisitos: describen cómo cada uno se concreta en la interacción entre los actores y el sistema.

Se compone de:

- **155 requisitos funcionales**, agrupados en los once módulos del sistema.
- **16 requisitos no funcionales**, organizados por atributo de calidad y justificados en las necesidades del negocio.
- La **matriz de trazabilidad** entre requisitos y casos de uso.

El **alcance del sistema** —los módulos que cubre, lo que queda fuera de esta etapa y lo previsto para una segunda— está definido en el **documento de relevamiento** y no se repite aquí: este documento especifica los requisitos dentro de ese alcance.

## Elaboración de los requisitos

Los **requisitos funcionales** surgen de las necesidades relevadas con la agencia. El negocio se lleva hoy con papel, carpetas físicas y planillas, y de ese relevamiento se desprenden las capacidades que el sistema debe ofrecer: registrar y conservar la memoria del cliente; ordenar el circuito comercial desde la consulta hasta el cierre de la venta; controlar la economía de cada viaje, sus cobros y sus vencimientos; sostener los recordatorios que hoy se pierden; mantener el catálogo de hoteles con sus reseñas; planificar el contenido de redes; y dar visibilidad del negocio para decidir con datos.

Cada requisito se enunció de forma **atómica y verificable**, con un identificador propio, el actor que lo ejercita, las entidades del dominio que involucra y su prioridad. A partir de ellos se especificaron los casos de uso, que los agrupan según la tarea concreta que resuelve cada actor; la correspondencia entre unos y otros se detalla en la matriz de trazabilidad. Cuando una misma capacidad interviene en más de una tarea, se enunció **un solo requisito**, referenciado desde todos los casos de uso que la realizan.

Los **requisitos no funcionales** no describen funciones sino atributos de calidad, y se organizan por categoría: seguridad, fiabilidad y robustez, rendimiento, usabilidad, disponibilidad, portabilidad y compatibilidad, mantenibilidad, y localización y privacidad. Cada uno se acompaña de la **justificación** que lo hace necesario en este negocio en particular y del **criterio de verificación** con el que se comprueba su cumplimiento.

## Convenciones

- **Identificación:** `RF-###` para los requisitos funcionales, numerados de forma correlativa y agrupados por módulo; `RNF-##` para los no funcionales.
- **Prioridad:** **alta** si el sistema no cumple su objetivo sin ese requisito; **media** si mejora la operación o cubre una situación de excepción; **baja** si es una conveniencia que puede posponerse sin afectar la operación.
- **Tipo:** alta, baja, modificación, consulta, validación, cálculo, automático (lo ejecuta el sistema sin intervención de una persona) o seguridad.
- El documento usa el **lenguaje ubicuo** del dominio: *Cliente*, *Oportunidad*, *Cotización*, *Viaje*, *Pago*, *Alerta*, *Hotel*, *Reseña*, *Usuario*, *Destino*, *Operador* y *ContenidoRed*.
- Los importes se expresan en **pesos argentinos (ARS)** y **dólares (USD)** según la moneda de cada operación; las fechas de negocio, en formato **dd/mm/aa**.

\newpage
