---
tipo: diagrama
estado: formalizado
modulo: []
responsable: equipo
pc: pc1
actualizado: 29/09/26
fecha_aprobacion: 29/09/26
---
# DGM — Casos de uso

tags:: #tipo/diagrama #estado/formalizado #pc/pc1

> Diagrama de casos de uso de Rumbo (salida del [[MOC — Casos de uso]]). Actores según [[Actores]] y [[DEC-0005 Autenticación y modelo de roles]]. Un editor por vez.
>
> **Render del entregable:** la imagen del DOCX se genera con `mermaid-cli` usando el motor **ELK** (routing ortogonal, líneas ordenadas). Comando en [[CONTINUAR — entregable Casos de uso]]. ⚠️ Si Obsidian no soporta `layout: elk`, la vista previa del vault puede fallar; la fuente de verdad del render es el PNG en `07-Entregables/Casos de uso/img/`.

```mermaid
%%{init: {'layout':'elk','elk':{'mergeEdges':true,'nodePlacementStrategy':'LINEAR_SEGMENTS','considerModelOrder':'NODES_AND_EDGES'},'theme':'base','themeVariables':{'fontFamily':'Segoe UI, Arial, sans-serif','fontSize':'15px','lineColor':'#94a3b8'},'flowchart':{'curve':'linear','padding':10}}}%%
flowchart LR
  EMP["<b>Empleado</b>"]:::actor
  ADM["<b>Admin</b>"]:::actor
  DUE["<b>Dueño</b>"]:::actor
  FRE["<b>Freelance</b>"]:::actor

  subgraph SYS[" Sistema Rumbo "]
    direction TB
    subgraph M10[Usuarios y seguridad]
      CU24([Iniciar sesión]):::m10
      CU25([Gestionar usuarios y roles]):::m10
    end
    subgraph M9[Calendario]
      CU23([Ver calendario]):::m9
    end
    subgraph M8[Dashboard]
      CU21([Ver dashboard y embudo]):::m8
      CU22([Generar reportes y estadísticas]):::m8
    end
    subgraph M7[Redes]
      CU19([Planificar contenido]):::m7
      CU20([Generar propuesta con IA]):::m7
    end
    subgraph M6[Catálogo de hoteles]
      CU16([Gestionar hotel]):::m6
      CU17([Registrar reseña]):::m6
      CU18([Buscar y recomendar]):::m6
      CU29([Eliminar reseña]):::m6
    end
    subgraph M11[Configuración / Catálogos]
      CU13([Configurar comisión]):::m11
      CU15([Generar recordatorios por destinos]):::m11
      CU26([Gestionar destinos]):::m11
      CU31([Gestionar operadores]):::m11
    end
    subgraph M5[Alertas]
      CU14([Atender alertas]):::m5
      CU28([Crear recordatorio manual]):::m5
    end
    subgraph M4[Economía y pagos]
      CU10([Registrar economía]):::m4
      CU11([Definir cuotas]):::m4
      CU12([Registrar cobro]):::m4
    end
    subgraph M3[Viajes]
      CU07([Confirmar reserva]):::m3
      CU08([Gestionar estado]):::m3
      CU09([Armar itinerario]):::m3
      CU27([Cancelar viaje]):::m3
    end
    subgraph M2[Oportunidades y cotización]
      CU04([Registrar consulta]):::m2
      CU05([Seguir oportunidad]):::m2
      CU06([Emitir cotización]):::m2
      CU30([Sugerir recontacto]):::m2
    end
    subgraph M1[Clientes]
      CU02([Registrar cliente]):::m1
      CU03([Gestionar ficha]):::m1
    end
  end

  CLI["<b>Pasajero / Cliente</b><br/><i>actor externo</i>"]:::ext

  %% Generalización: Admin, Dueño y Freelance heredan los casos operativos del Empleado
  ADM -. "es-un" .-> EMP
  DUE -. "es-un" .-> EMP
  FRE -. "es-un" .-> EMP

  %% Empleado: casos operativos
  EMP --- CU02 & CU03
  EMP --- CU04 & CU05 & CU06 & CU30
  EMP --- CU07 & CU08 & CU09 & CU27
  EMP --- CU10 & CU11 & CU12
  EMP --- CU14 & CU28
  EMP --- CU16 & CU17 & CU18
  EMP --- CU19 & CU20
  EMP --- CU23
  EMP --- CU24

  %% Admin: casos exclusivos (configuración, catálogos y moderación)
  ADM --- CU13 & CU15 & CU25 & CU26 & CU29 & CU31

  %% Dueño: dashboard y reportes
  DUE --- CU21 & CU22

  %% Cliente externo (a la derecha): su rol queda explícito
  CU06 -. "recibe cotización" .-> CLI
  CU17 -. "aporta reseña" .-> CLI

  classDef actor fill:#1e3a5f,stroke:#0f2942,stroke-width:2px,color:#ffffff;
  classDef ext fill:#fff4e6,stroke:#e8890c,stroke-width:2px,color:#7a3f00;
  classDef m1 fill:#e8f0fe,stroke:#4285f4,color:#1a3a6b;
  classDef m2 fill:#fce8f3,stroke:#d81b8c,color:#7a1050;
  classDef m3 fill:#e6f4ea,stroke:#34a853,color:#14532d;
  classDef m4 fill:#fef7e0,stroke:#f9ab00,color:#7a5900;
  classDef m5 fill:#fde8e8,stroke:#ea4335,color:#7a1c15;
  classDef m6 fill:#e8eaf6,stroke:#5c6bc0,color:#26327a;
  classDef m7 fill:#f3e8fd,stroke:#a142f4,color:#5a1a8a;
  classDef m8 fill:#e0f2f1,stroke:#009688,color:#004d40;
  classDef m9 fill:#fff3e0,stroke:#fb8c00,color:#7a3f00;
  classDef m10 fill:#eceff1,stroke:#607d8b,color:#263238;
  classDef m11 fill:#e0f7fa,stroke:#00838f,color:#004d52;
  style SYS fill:#fafafa,stroke:#cbd5e1,stroke-width:2px;
```

> **Notas de lectura:**
> - **Generalización de roles:** `Admin`, `Dueño` y `Freelance` son *especializaciones* del `Empleado` (flechas `es-un`): heredan sus casos operativos y solo se dibujan aparte los casos exclusivos (`Admin`: el módulo **Configuración/Catálogos** —configurar comisión, recordatorios por destino, destinos y operadores— más gestionar usuarios y moderar reseñas; `Dueño`: dashboard y reportes). Esto refleja el modelo de visibilidad de [[DEC-0005 Autenticación y modelo de roles]].
> - **`Freelance` (vendedor externo):** hace los **mismos casos operativos** que el `Empleado`, **salvo gestionar hoteles (CU-16) y registrar reseñas (CU-17)** (decidido en la sync del 30/09/26), y con **visibilidad restringida a lo suyo** (excepción al *lectura global*, [[DEC-0008 Autenticación propia y rol de vendedor freelance]]). Esa restricción es de **alcance de datos**, no de casos de uso, por eso el diagrama lo modela como especialización del `Empleado`; el detalle de visibilidad va en las DEC.
> - **Actor externo `Pasajero / Cliente`:** no opera el sistema; solo interactúa con dos casos: **recibe** la cotización (CU-06) y **aporta** la reseña que el empleado registra (CU-17). Por eso va a la derecha, con asociaciones etiquetadas.

## Pendiente
- Refinar relaciones `<<include>>` / `<<extend>>` (p. ej. CU-10 economía incluida al confirmar reserva CU-07).
- ⚠️ **Regenerar el entregable:** se sumó el actor **`Freelance`** (18/09, Q5) a la fuente Mermaid; falta **regenerar el PNG (mermaid-cli, ELK) y el DOCX** de `07-Entregables/Casos de uso/` para que reflejen el nuevo actor. Comando en [[CONTINUAR — entregable Casos de uso]].
