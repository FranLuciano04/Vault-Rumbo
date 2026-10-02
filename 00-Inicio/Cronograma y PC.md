---
tipo: referencia
estado: formalizado
responsable: equipo
actualizado: 02/10/26
---
# 🗓️ Cronograma y Puntos de Control

tags:: #tipo/referencia #estado/formalizado

Trabajo de Campo 2026 — 2° cuatrimestre. Fechas `dd/mm/aa`.

Fuentes: [[Rumbo — cronograma.docx|cronograma completado]] · [[Modelo institucional — cronograma de actividades.docx|modelo institucional]]. Esta nota contiene las fechas vigentes y corrige las semanas 14 a 16 del DOCX.

| Semana | Fecha | Hito |
|---|---|---|
| 4 | 18/09/26 | — |
| 5 | 25/09/26 | — |
| **6** | **02/10/26** | **🎯 PC1 — modelo UML completo** `#pc/pc1` · entrega y exposición oral a las 20 hs (adelantado desde el 23/10/26) |
| 7 | 09/10/26 | — |
| 8 | 16/10/26 | — |
| 9 | 23/10/26 | — (fecha original del PC1) |
| **10** | **30/10/26** | **🎯 PC2 — código** `#pc/pc2` |
| 11 | 06/11/26 | — |
| **12** | **13/11/26** | **🎯 PC3 — testing / documentación** `#pc/pc3` |
| 13 | 20/11/26 | — |
| 14 | 27/11/26 | — |
| 15 | 04/12/26 | — |
| 16 | 11/12/26 | Cierre / Defensa — fecha a confirmar |

## Qué se exige en cada PC
- **PC1 — Análisis, diseño y planificación** (adelantado a la semana 6: vie 02/10/26, 20 hs, con exposición oral). **Entrega: un documento con el MVC.** Según las láminas de la cátedra (29/09):
  - **Contenido:** definición del problema; alcances y límites; modelo conceptual de frontend, backend (negocio) y base de datos; modelo de flujo con gráficos UML y **C4 Model**; **modelo de datos SQL**; comunicación Vista–Controlador con **OpenAPI (formato JSON)**; selección de modelos de IA (chat) y agentes, con sus **prompts**. Modelado en Mermaid.
  - **Documentación obligatoria:** presentación general (objetivos, **antecedentes**, justificación, alcances y límites) · modelos de IA utilizados y justificación · agentes IA implementados · modelo de datos y relaciones · modelo de desarrollo utilizado con interfaces gráficas · arquitectura de la solución · presentación de la documentación.
  - Checklist y plan (frentes A a H) en [[Estado del proyecto]].
- **PC2:** código funcional de los módulos núcleo. Se activa `06-Desarrollo/`.
- **PC3:** testing y documentación. Diseño congelado salvo `DEC-` de supersesión.

> Al cerrar cada PC: `git tag pc1` / `pc2` / `pc3` para dejar snapshot del vault.
