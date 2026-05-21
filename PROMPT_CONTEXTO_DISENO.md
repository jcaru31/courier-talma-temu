# Prompt de contexto — Tablero de tracking courier (Talma · Temu)

> Copia todo lo que sigue y pégalo en la otra IA. Va acompañado de capturas del
> desarrollo actual (ver la lista de imágenes sugeridas al final).

---

## 🎯 Lo que necesito de ti

Eres un **diseñador de producto senior especializado en UI/UX para dashboards
operativos / logísticos**. Quiero que me ayudes a **repensar y reestructurar el
diseño visual y de interacción** de un tablero de tracking de importaciones
aéreas. El feedback principal de los usuarios es que **las pantallas se sienten
sobrecargadas** (demasiada densidad de información a la vez).

Necesito:
1. Un **diagnóstico** de los problemas de UI/UX a partir del contexto y las
   imágenes adjuntas.
2. **Propuestas concretas de rediseño** (layouts, jerarquía visual, patrones de
   interacción, sistema de componentes) que reduzcan la carga cognitiva sin
   perder la información crítica que el operador necesita.
3. Recomendaciones de **arquitectura de información** (qué mostrar en cada
   nivel, qué ocultar tras progressive disclosure, cómo agrupar).
4. Si aplica, referencias a **patrones de diseño** y mejores prácticas
   (design systems, data-density, master-detail, etc.).

Razona con criterio de producto: prioriza tareas del operador, no solo estética.

---

## 🏢 Contexto del negocio

- **Talma** es un operador de terminal de carga aérea en el aeropuerto de Lima,
  Perú. Recibe, almacena y despacha carga importada.
- El tablero da **visibilidad del tracking de importaciones courier a nivel de
  guía aérea master (AWB master)** para sus clientes.
- **Cliente principal: Temu** (razón social del consignatario: PERU BOX S.A.C.).
  También hay otros consignatarios en la data (SERHAFEN PERU S.A.C., FEDEX
  EXPRESS PERU S.A.C.).
- Un **vuelo** trae muchas **guías** (AWBs). Cada guía pertenece a un
  consignatario y atraviesa un proceso operativo-aduanero.
- Usuario objetivo: **operador/coordinador de operaciones** que necesita saber
  de un vistazo qué vuelos llegan, en qué etapa está cada guía, y qué guías
  tienen problemas (alertas) que frenan su liberación.

### Proceso operativo — los 5 hitos (en orden cronológico)

1. **Trasmisión Aerolínea** — la aerolínea numera el manifiesto e incorpora las
   guías antes del vuelo (subeventos: Numeración del Manifiesto, Incorporación
   de guías).
2. **Recepción** — la carga llega al almacén (subeventos: Llegada al almacén,
   Término de Tarja).
3. **Trasmisión Almacén** — transmisiones a aduanas (subeventos: Descarga de
   Mercancía, Envío de Volante).
4. **Facturación** — pagos previos a liberar (subeventos: Pago Handling, Pago
   Traslado Postal).
5. **Despacho** — salida física (subeventos: Generación de VCT, Llegada del
   Camión, Entrega de Carga).

### Conceptos clave del modelo

- **Estado de la guía = "hito en curso"**: el primer hito que aún no termina.
  Etiquetas: `MANIFESTADO` (gris) → `TRASMISIÓN ALMACÉN` (azul) → `FACTURACIÓN`
  (ámbar) → `DESPACHO` (índigo) → `ENTREGADA` (verde, estado terminal distinto
  de "en Despacho").
- **Bultos rec/man**: recibidos vs. manifestados (esperados).
- **Alertas por guía** (cada una con icono y color propios, reutilizados como
  filtros y como marca al inicio de la fila):
  - **Faltante** (violeta, signo de interrogación): guía manifestada que no
    arribó. *Si es faltante NO cuenta como parcial.*
  - **Parcial** (ámbar, círculo medio): arribó con menos bultos de los
    esperados; el resto puede venir en un vuelo posterior.
  - **Inmovilización** (naranja, candado): canal rojo de aduanas sin levante.
  - **Mal estado** (rojo, triángulo): bultos dañados → genera un **Acta de
    mercancía en mal estado** (ACM) con fotos + PDF oficial.
  - **Bloqueo** (slate, círculo barrado): bloqueo documentario/comercial.
- **Verificación Aduanera**: si la guía tiene levante (`con_levante`), se marca
  "Verificado" con hora y documento de salida (DAM).
- **Handling**: se paga **por guía** (no por consignatario). Las guías sin pago
  de handling se marcan con un símbolo $ fucsia (color distinto de las alertas).
- **Aviso de llegada / Volante**: transmisión a aduanas; tiene su propio PDF
  (volante) accesible desde la tabla de guías.

---

## 🖥️ Las vistas del tablero

### Vista 1 — Avance de vuelos (lista)
Lista de vuelos del rango de fechas. Por vuelo se muestra: código de vuelo,
ruta (origen→destino) y arribo (con cuenta regresiva "Llega en 6h 20m" si está
en vuelo), nº de guías manifestadas, una **mini-trazabilidad de los 5 hitos**
(con conteo X/Y de guías por hito), y **alertas agregadas** (chips con icono +
conteo: faltantes, inmovilizadas, mal estado, bloqueo, parciales). Filtros por
fecha (hoy / mañana / anteriores 7 días), aerolínea, tipo de alerta; buscador
por vuelo/manifiesto/aerolínea o por **últimos 4 dígitos de la guía**.

### Vista 2 — Detalle de vuelo + guías asociadas (se expande inline desde Vista 1)
Franja "Resumen del vuelo" (bultos/kilos rec/man, chip de guías sin pago
handling, conteo de guías entregadas) + **tabla de Guías asociadas**. La tabla
es **densa** (~10 columnas): icono de alerta principal, consignatario, Nº guía
(con símbolo $ si falta handling), bultos rec/man, peso rec/man, bultos en mal
estado, parciales, aviso de llegada, verificación aduanera, estado (badge del
hito en curso). Tiene cabecera con grupos "Manifestado" vs "Real". Orden: las
guías más rezagadas (hito más atrasado) arriba.

### Vista 3 — Detalle de guía (panel lateral derecho / modal)
Se abre al seleccionar una guía. Cabecera ágil con: datos de la guía (shipper,
fecha emisión, tipo almacenamiento, volante, agente de carga, RUC del
consignatario), carga (bultos/kilos rec/man, chip "Pago Handling pendiente"),
y **etiquetas de alertas activas** (solo el tipo, sin código ni fecha).
Debajo: **timeline horizontal de los 5 hitos** con iconos, y **columnas de
subeventos** detallados por hito (con estado completado/en curso/pendiente).
Modales: Acta de mal estado (datos estructurados + carrusel de 6 fotos + botón
descargar PDF) y Volante (PDF del aviso de llegada).

### Vista de Inventario (guías en almacén)
Tabla de guías físicamente en almacén. Columnas: icono de retención
(inmovilizada/bloqueo) al inicio, Nº guía, vuelo/manifiesto, origen, ingreso
almacén, **días en almacén** (con leyenda de rangos: 0-1 día verde, 2 días
ámbar "próximo al cobro", ≥3 días rojo "cobro como carga general"), bultos
rec/man, peso rec/man, bultos mal estado (clickeable → abre acta), parciales.
Filtros por motivo de retención. Ordenado por días desc (más críticos arriba).

---

## 🧱 Stack y arquitectura técnica

- **Frontend**: React + Vite + Tailwind CSS. Componentes funcionales con hooks.
- **Backend**: Node + Express. Persistencia **file-based en JSON** (demo).
- **Datos**: un único `courier_data.json` (vuelos, guías AWB master, alertas,
  clientes). Las fechas están ancladas a un día del snapshot y el backend las
  **desplaza dinámicamente al día actual** en cada arranque (zona horaria
  Lima), manteniendo las horas fijas para que los countdowns sean estables.
- **Patrón actual**: la vista de vuelos ya tiene una **capa de datos compartida
  (hooks `useVuelos` / `useVueloDetail`) + variantes de presentación**
  intercambiables con un selector segmentado.

### Paleta y estilo actual
- Azul marino (`navy #0D2B6B`) como color primario/institucional.
- Verde para OK/completo, ámbar para en proceso/advertencia, rojo para
  peligro, slate para neutral/pendiente.
- Tipografía con números tabulares para datos. Badges/chips por estado.
- Densidad alta de información (de ahí el feedback de "sobrecargado").

---

## 🔬 Lo que YA exploré (3 variantes de la Vista 1, intercambiables en vivo)

Construí un selector que alterna 4 versiones de la lista de vuelos:

1. **Clásica** — la tabla densa original (punto de partida; la "sobrecargada").
2. **Minimal / Progressive disclosure** — lista vertical muy aireada; fila
   colapsada solo muestra vuelo, ruta, una barra de avance y alertas como
   puntos; el detalle pesado se revela al expandir (uno a la vez).
3. **Split / Master-detail** — lista compacta seleccionable a la izquierda +
   panel de detalle fijo a la derecha; sin acordeón ni modales.
4. **Agenda / Timeline cronológico** — vuelos agrupados por Hoy/Mañana y
   ordenados por hora de arribo sobre un rail temporal.

Todas comparten los mismos datos y reutilizan el componente de detalle.

---

## ❓ Preguntas concretas para ti

1. ¿Cuál de las direcciones exploradas (o qué combinación) es más adecuada para
   el perfil de operador logístico y por qué? ¿Qué afinarías de cada una?
2. ¿Cómo reducirías la densidad de la **tabla de guías asociadas** (Vista 2) sin
   perder trazabilidad? ¿Vale la pena un patrón de columnas configurables,
   agrupación, o vista resumida + detalle?
3. ¿Cómo comunicar mejor el **modelo de "hito en curso" + alertas** de un
   vistazo? (semáforos, pipeline, badges, etc.)
4. ¿Qué **sistema de diseño / tokens / primitivos** recomendarías para que el
   tablero escale de forma sostenible?
5. Ideas para la **jerarquía de los 3 niveles** (vuelo → guía → subeventos):
   ¿qué información pertenece a cada nivel y qué debería esconderse tras
   interacción?

---

## 📎 Imágenes que acompañan este prompt (descríbelas al pegarlas)

- Vista 1 (lista de vuelos) — versión Clásica, Minimal, Split y Agenda.
- Vista 2 (detalle de vuelo + tabla densa de guías asociadas).
- Vista 3 (panel de detalle de guía con timeline + subeventos).
- Modal de Acta de mal estado (datos + carrusel de fotos).
- Vista de Inventario (guías en almacén con rangos de días).

> Nota: el tablero está en **español (Perú)** y debe mantenerse así. Es un
> prototipo de demo; prioriza claridad y experiencia del operador.
