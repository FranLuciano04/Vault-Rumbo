---
tipo: caso-uso
estado: en-revision
modulo: [dashboard]
responsable: Francisco
pc: pc1
actualizado: 17/09/26
---
# CU-22 Generar reportes y estadísticas

tags:: #tipo/caso-uso #estado/en-revision #pc/pc1 #accion/revisar

## Descripción
El dueño (o admin) genera **reportes del período** (mensuales) con las estadísticas del negocio —ventas, comisiones, cobranzas, destinos y clientes— para analizar y exportar. A diferencia del [[CU-21 Ver dashboard y embudo|dashboard]] (foto en vivo), acá el resultado es un **reporte consolidado y exportable**.

## Actor principal
[[Actores|dueño]] (también `admin`)

## Actores secundarios
-

## Precondiciones
- El [[Usuario]] inició sesión con rol `admin` o `dueño` ([[CU-24 Iniciar sesión]], [[DEC-0005 Autenticación y modelo de roles]]).

## Flujo principal
1. El dueño abre **Reportes** y elige el **tipo** y el **período** (por defecto, el mes). Catálogo definido por la agencia ([[Relevamiento — respuestas de la agencia (17-09)]], bloque 3):
   - Ventas totales del mes · **Ganancia/rentabilidad** ([[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]]).
   - **Cobrado vs. pendiente de cobro** · Pagos realizados y **pendientes a operadores**.
   - Ventas **por destino** · **por operador/proveedor** · **por vendedor/freelancer y sus comisiones**.
   - **Cantidad de pasajeros** · **formas de pago** utilizadas · **comparación con meses anteriores**.
2. El sistema procesa los datos del período y arma el reporte con sus métricas y comparativas.
3. El dueño **visualiza** el reporte (tablas y gráficos).
4. **Exporta** el reporte: **Excel** como formato principal (para trabajar los datos) y **PDF resumido** para visualizar o compartir.

## Flujos alternativos
- **A1 — Reporte mensual recurrente:** el dueño consulta el **reporte del mes** como cierre de período (requisito del relevamiento: "reportes mensuales").
- **A2 — Comparar períodos:** el dueño contrasta dos períodos (p. ej. mes actual vs. anterior).
- **A3 — Período sin datos:** no hay actividad → el reporte se genera vacío o avisa que no hay datos.

## Postcondiciones
- Queda generado (y opcionalmente exportado) un reporte del período; **no se modifican datos** del negocio (solo lectura).

## Reglas de negocio aplicadas
- Métricas derivadas de [[Viaje]], [[Pago]], [[Oportunidad]], [[Cliente]] y [[Destino]]; se calculan sobre el período, no se almacenan.
- Comisiones según [[RN-01 Comisión automática]].

## Entidades del dominio involucradas
- [[Viaje]] · [[Pago]] · [[Oportunidad]] · [[Cliente]] · [[Destino]] · [[Usuario]] (vendedor/freelance para ventas y comisiones)

## Diagramas
- [[DGM — Casos de uso]] · (pendiente) diagrama de actividad de la generación de reportes.

## Decisiones asociadas
- [[DEC-0005 Autenticación y modelo de roles]]

## 🔎 Revisión
> [!question] Francisco (11/09): especificado. **A validar con la agencia:** el **catálogo de reportes** que realmente necesitan (¿solo mensual de ventas?, ¿por empleado?, ¿por destino?) y el **formato de exportación** (PDF vs. planilla) para PC1.
> [!success] Paloma (17/09): **catálogo y formato resueltos por la agencia** (bloque 3): incorporados al flujo. Formato = **Excel principal + PDF resumido**. "Ganancia/rentabilidad", "ventas por operador" y "ventas por vendedor y comisiones" salen de [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]]; **Operador/Proveedor confirmado como entidad** ([[DEC-0009 Operador-Proveedor como entidad de catálogo]]). **Ratificado en la sync 17/09.**
