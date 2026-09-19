---
tipo: referencia
estado: formalizado
responsable: Nahuel
pc: pc1
actualizado: 18/09/26
---
# Entregable de Casos de uso — estado y cómo regenerar

> Nota operativa del entregable **DOCX de Casos de uso**. Contexto en [[Estado del proyecto]] y [[Bitácora de sesiones]]; parámetros en [[Entregables — índice]].

## Estado (18/09) — completo, 31 CU
- **31 CU** especificados (se sumó [[CU-31 Gestionar operadores|CU-31]] el 18/09); el DOCX se genera con `07-Entregables/build/build-casos-de-uso.sh` (filtra la cocina interna, arma portada + diagrama + actores + los CU presentes en `02-Analisis/Casos de uso/` y compila con pandoc; toma todos los `CU-*.md` de la carpeta, sin lista fija).
- **Diagrama:** nodo CU-31 agregado (módulo *Economía y pagos*, actor `admin`) y renombrados 4 casos de uso para que empiecen con verbo y sin detalles de implementación: *Propuesta con IA* → *Generar propuesta con IA*, *Reportes y estadísticas* → *Generar reportes y estadísticas*, *Recordatorios por destino* → *Generar recordatorios por destinos*, *Configurar % comisión* → *Configurar comisión*. Ver [[DGM — Casos de uso]].
- **Diagrama de casos de uso rehecho** ([[DGM — Casos de uso]]): motor **ELK** (líneas ordenadas), óvalos por caso de uso, color por módulo, generalización de roles (`Admin`/`Dueño`/`Freelance` *es-un* `Empleado`, actor `freelance` sumado el 18/09) y `Pasajero/Cliente` como actor externo a la derecha. Incluye el módulo **Configuración / Catálogos** (CU-13/15/26/31). PNG en `07-Entregables/Casos de uso/img/DGM-casos-de-uso.png`.
- **Filtro del build (18/09):** se agregaron reglas al `sed` de `build-casos-de-uso.sh` para limpiar artefactos de paréntesis (`,)`, `(,)`, `—)`, `;)`) que quedaban al quitar las referencias `DEC-` inline. Verificado **0 fugas** y **0 artefactos** en el DOCX.
- **Bug de incrustación resuelto:** la imagen se referencia por nombre y se resuelve con `--resource-path` (antes fallaba por los espacios de la ruta). La imagen queda **incrustada** en el DOCX.
- **Estética académica:** plantilla `07-Entregables/build/reference.docx` generada por `make-reference.ps1` (PowerShell, sin dependencias): Cambria justificado 11pt/1.15, títulos navy jerarquizados con filete, A4 con márgenes 2,5 cm y numeración de páginas al pie.
- **Contenido saneado (entregable para profesores):** el DOCX **no** incluye decisiones internas (`DEC-####`), secciones `Revisión`/`Diagramas`/`Decisiones asociadas`, `tags::`, notas meta ni hashtags de acción. Ver el detalle del filtro en [[Entregables — índice]].

## Cómo regenerar
Requiere **pandoc** (autodetectado en PATH o `%LOCALAPPDATA%\Pandoc`) y **Node** para el diagrama.

**DOCX completo** (desde la raíz del repo):
```bash
bash "07-Entregables/build/build-casos-de-uso.sh"
```
Compilación de prueba a un temporal (no toca el docx del vault):
```bash
OUT_OVERRIDE=/ruta/prueba.docx bash "07-Entregables/build/build-casos-de-uso.sh"
```
> ⚠️ Cerrar el `.docx` en Word antes de regenerar (si está abierto, no se puede sobrescribir).

**Imagen del diagrama** desde el Mermaid de [[DGM — Casos de uso]] (motor ELK, alta resolución):
```bash
# extraer el bloque mermaid a diagrama.mmd y renderizar
npx -y @mermaid-js/mermaid-cli -i diagrama.mmd -o "07-Entregables/Casos de uso/img/DGM-casos-de-uso.png" -b white -s 2
```

**Plantilla estética** (si se cambian estilos):
```bash
powershell -ExecutionPolicy Bypass -File "07-Entregables/build/make-reference.ps1"
```

## Siguientes entregables PC1
Ver checklist en [[Estado del proyecto]]: diagrama de clases + ER, actividad/secuencia/estado, arquitectura, prototipo UI (Figma) y matriz de trazabilidad.
