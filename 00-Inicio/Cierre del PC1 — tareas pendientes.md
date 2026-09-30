---
tipo: referencia
estado: formalizado
responsable: Francisco
pc: pc1
actualizado: 30/09/26
---
# Cierre del PC1 — tareas pendientes

tags:: #tipo/referencia #estado/formalizado #pc/pc1

> Nota de traspaso escrita por Francisco al cierre del 30/09/26, para que **cada integrante complete lo suyo en su propia sesión**. Si sos Claude y entraste en contexto con la identidad de Nahuel o de Paloma, **avisale a la persona cuáles de estas tareas son suyas** antes de empezar otra cosa. Al terminar una tarea, tildala acá, registrala en la [[Bitácora de sesiones]] y subí el commit.

## Dónde estamos
Al 30/09/26 a la noche el PC1 está **prácticamente completo**:
- **Documento principal** (`07-Entregables/PC1/Rumbo — PC1.docx`, 57 páginas): sigue el contenido del «Documento con el MVC» de la lámina. Lo arma `build-pc1.sh` desde las notas y los textos de `07-Entregables/PC1/*.md`.
- **Deck** (`07-Entregables/PC1/Rumbo — PC1 (presentación).pptx` y `.pdf`, 27 slides): el de Paloma, reordenado con la misma estructura. Lo arma `build-deck.js`.
- **Carpeta de entrega para el Drive** (`07-Entregables/PC1/Rumbo — Entrega PC1/`, fuera de Git): documento, presentación, 5 anexos, 34 diagramas, 59 pantallas, `openapi.json`, `rumbo.sql`, `CLAUDE.md` y la skill. La arma `armar-entrega.sh`.
- Todo lo del PC1 está **formalizado salvo una nota**: [[ARQ — MVC y modelo conceptual por capa]] (G2 y G3), que revisa Nahuel.
- Decisiones del 30/09 que hay que tener presentes: el `freelance` no gestiona hoteles, no registra reseñas y no usa redes; la `dueño` tiene todo lo del `admin`; los enums de la capa técnica van en ASCII; los prompts de la entrega son los usados para **construir** el producto (el de CU-20 quedó para PC2). Detalle en la [[Bitácora de sesiones]] del 30/09.

## Nahuel
- [ ] **Revisar [[ARQ — MVC y modelo conceptual por capa]] (G2 y G3).** Lo más importante:
  1. Que los **servicios de negocio** estén en el **Modelo** y no en el Controlador (se eligió la lectura clásica de MVC, con controlador delgado; ver la Revisión de la nota).
  2. Que la tabla de **módulos por capa** y la de **tablas por módulo** coincidan con [[ARQ — Vista general]] y el [[DGM-ER]] (`destino` y `operador` quedaron en «Configuración y catálogos»).
  3. Que el **diagrama de secuencia de CU-12** (Vista → Controlador → Modelo) respete la vista lógica.
  - **Si está bien:** pasar la nota a `formalizado` (`estado`, `fecha_aprobacion` y la etiqueta `#estado/`), tildar **G2** y **G3** y la línea «Modelo C4 y sección MVC» del checklist de [[Estado del proyecto]], y regenerar todo (ver *Cómo regenerar*).
  - **Si hay que cambiar algo:** editar la nota (no el `.docx`), volver a renderizar sus diagramas con `bash "07-Entregables/build/render-diagramas-diseno.sh"` y regenerar.
- [ ] **Revisar tus partes del documento y del deck:** secciones **4** (flujo UML y C4), **5** (modelo de datos SQL) y **6** (comunicación Vista–Controlador), y sus slides.

## Paloma
- [ ] **Configuración de la dueña en el prototipo.** Desde el 30/09 la dueña también gestiona **usuarios (CU-25), comisiones (CU-13) y la moderación de reseñas (CU-29)**. Hoy la pantalla **51** muestra solo Destinos y Operadores. Hay que sumarle esas secciones (se pueden reusar las pantallas 30, 31 y 24 del admin), reexportar el PNG con el **mismo nombre** en `07-Entregables/Prototipo/img/` y cerrar el ⏳ correspondiente en [[Prototipo UI]] y en el paso **B5** de [[Estado del proyecto]].
- [ ] *(Opcional)* **Menú en las pantallas compartidas:** al navegar desde la vista del admin o de la dueña a una sección común se ve el menú del empleado. Si no da el tiempo, se aclara en la exposición.
- [ ] **Revisar tus partes del documento y del deck:** la sección **3** (modelo conceptual e interfaces principales) y las slides de interfaces. Ojo: **Francisco reordenó `build-deck.js`** el 30/09 (agenda de 8 puntos, secciones renumeradas y tres slides nuevas). Trabajá siempre sobre la versión de `main`, no sobre una copia anterior.

## Los tres
- [ ] **Revisar el documento principal completo** (57 páginas). Cualquier cambio se hace en la **nota fuente** o en los textos de `07-Entregables/PC1/*.md`, **nunca en el `.docx`**, y después se regenera.
- [ ] **Decidir la duración de la exposición** y si el prototipo se muestra **en vivo** (Figma, con internet) **o con capturas**.
- [ ] **Subir la carpeta de entrega al Drive** y pegar el link en `07-Entregables/PC1/90 - Material complementario.md` (y, si se quiere, en la portada, `00 - Portada.md`). Después, regenerar.
- [ ] **Ensayo:** viernes 02/10 a las 17 hs a más tardar, con el deck y las notas del orador (cada slide dice quién expone).

## Cierre del viernes 02/10
- [ ] **D1.** Que no quede ninguna nota del PC1 sin formalizar. Control rápido desde la raíz:
  `grep -rlZ --include=*.md "#pc/pc1" . | xargs -0 grep -lE "^estado: (borrador|en-revision)" | grep -v _plantillas`
- [ ] **D2.** Regenerar todo con `bash "07-Entregables/build/armar-entrega.sh"`, revisar el PDF del documento y volver a subir la carpeta al Drive.
- [ ] **D3.** Commit final, `git tag pc1` y `git push origin main --tags`.
- [ ] **Entrega a las 20 hs:** el documento principal (Word o PDF, según pida la cátedra) y el link a la carpeta del Drive.

## Cómo regenerar
Desde la raíz del repositorio, con los documentos **cerrados en Word y PowerPoint**:

| Qué | Comando |
|---|---|
| Todo (anexos, documento principal, PDF y carpeta de entrega) | `bash "07-Entregables/build/armar-entrega.sh"` |
| Solo el documento principal | `bash "07-Entregables/build/build-pc1.sh"` |
| El deck | `node "07-Entregables/build/build-deck.js"` (requiere `pptxgenjs`; ver [[Skills compartidas]]). El PDF se exporta desde PowerPoint. |
| Diagramas de diseño (ARQ, MVC, IA y desarrollo) | `bash "07-Entregables/build/render-diagramas-diseno.sh"` |

**Cuidados:**
- **No editar los `.docx` a mano:** se pisan al regenerar. Si alguien corrige en Word, hay que pasar el cambio a la nota fuente.
- **Si Word vuelve a guardar un `.docx` al abrirlo** y aparece como modificado en Git sin que nadie lo haya tocado, descartarlo con `git checkout -- <archivo>` y regenerar.
- **Si un `git pull --rebase` falla con «could not detach HEAD»**, casi seguro hay un `.docx` o `.pptx` abierto: cerrarlo y reintentar.
- En las tablas de las notas, los enlaces con alias van escapados: `[[nota\|alias]]`.
