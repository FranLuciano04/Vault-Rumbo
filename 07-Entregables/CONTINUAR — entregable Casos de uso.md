---
tipo: referencia
estado: en-proceso
responsable: Nahuel
pc: pc1
actualizado: 11/09/26
---
# CONTINUAR — entregable de Casos de uso (traspaso a Nahuel)

> Nota de traspaso dejada por Francisco (sesión 11/09) para retomar la generación del **DOCX de Casos de uso**. Contexto general en [[Estado del proyecto]] y [[Bitácora de sesiones]]; parámetros en [[Entregables — índice]].

## Estado actual (qué está hecho)
- Los **30 CU** están especificados y las **notas internas ya fueron removidas** del cuerpo (no se filtran al entregable).
- Script reproducible: **`07-Entregables/build/build-casos-de-uso.sh`** (filtra frontmatter, `tags::`, secciones `Diagramas` y `Revisión`, convierte wikilinks a texto, arma portada + diagrama + actores + 30 CU y compila con pandoc).
- **Plantilla** `07-Entregables/build/reference.docx` (generada con `make-reference.py`): salto de página por CU + interlineado 1.15.
- **Diagrama** renderizado en `07-Entregables/Casos de uso/img/DGM-casos-de-uso.png`.
- DOCX generado en `07-Entregables/Casos de uso/Rumbo — Casos de uso.docx`.

## ⚠️ Lo único que falta (bug conocido)
El **diagrama no se incrusta** en el DOCX: pandoc falla al resolver la imagen porque la ruta tiene **espacios** (`Trabajo de campo`, `Casos de uso` → `%20`). Aparece el warning: *"Could not fetch resource ... replacing image with description"*.

### Cómo arreglarlo (recomendado)
En `build-casos-de-uso.sh`, hacer que pandoc use `--resource-path` y referenciar la imagen **solo por nombre**:
1. En la sección del diagrama, generar el md con la imagen por nombre relativo:
   ```bash
   printf '# Diagrama de casos de uso\n\n![Diagrama de casos de uso de Rumbo](DGM-casos-de-uso.png)\n' > "$BUILD/05-diagrama.md"
   ```
2. Agregar al comando pandoc:
   ```bash
   --resource-path="$ROOT/07-Entregables/Casos de uso/img"
   ```
3. Regenerar y verificar que la imagen aparece en el Word.

*(Alternativa rápida: copiar la imagen y el md a una carpeta temporal sin espacios, compilar desde ahí.)*

## Cómo regenerar el DOCX (cualquiera de los tres)
Requiere **pandoc** (en la PC de Francisco está en `~/AppData/Local/Pandoc/pandoc.exe`; el script lo autodetecta) y, para re-renderizar el diagrama, **Node** (`npx @mermaid-js/mermaid-cli`).
```bash
bash "07-Entregables/build/build-casos-de-uso.sh"
```
Regenerar el diagrama desde el Mermaid de [[DGM — Casos de uso]]:
```bash
# extraer el bloque mermaid y renderizar
npx -y @mermaid-js/mermaid-cli -i diagrama.mmd -o "07-Entregables/Casos de uso/img/DGM-casos-de-uso.png" -b white -w 1800
```
Regenerar la plantilla:
```bash
pandoc --print-default-data-file reference.docx > default.docx
python "07-Entregables/build/make-reference.py" default.docx "07-Entregables/build/reference.docx"
```

## Después del docx (siguientes entregables PC1)
Ver checklist en [[Estado del proyecto]]: diagrama de clases + ER (refinar con atributos nuevos), actividad/secuencia/estado, arquitectura, prototipo UI (Figma), matriz de trazabilidad.

## Aparte (no bloquea el docx)
- **Preguntas para la agencia** (las lleva Francisco a Valentina): comisión vs. margen, KPIs del dashboard, catálogo de reportes, criterio del CRM, WhatsApp API.
- **Técnicos:** mecanismo de autenticación e infraestructura.
