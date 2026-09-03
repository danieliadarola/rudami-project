---
name: teach
description: Escribe un documento didáctico en docs/ que explique, con el código real del repositorio, una parte de FisioApp que se acaba de construir. Úsala cuando se cierra un bloque grande (una fase, un subsistema, un cambio estructural), cuando el usuario pide "explícame esto", "hazme el documento" o "quiero entender lo que hemos programado", y también por iniciativa propia al terminar algo que el usuario tendrá que mantener él solo dentro de seis meses.
---

# teach — documentar para que Daniel lo entienda dentro de seis meses

Daniel es el único desarrollador de RuDaMi. Todo lo que construyamos lo va a
mantener él, solo, sin nadie a quien preguntar. Estos documentos son el relevo.

## Cuándo se escribe uno

**Sí:** al cerrar una fase; al terminar un subsistema completo (identidad,
sesión guiada, animaciones, cobros); tras un cambio estructural (una migración
que cambia el modelo de seguridad, un renombrado de convención de Next);
cuando algo salió mal y la solución no es obvia.

**No:** por cada commit, por cada componente suelto, por un arreglo de CSS.
Un documento por bloque cerrado. Si dudas, no lo escribas todavía: acumula.

## Dónde

`docs/NN-tema.md`, numerado por orden de escritura. Índice en `docs/README.md`,
una línea por documento. En castellano, siempre.

## Cómo se escribe

**El código se cita, no se recuerda.** Abre el archivo, copia el fragmento real,
y pon la referencia `archivo.tsx:línea`. Un fragmento inventado que casi coincide
es peor que ninguno: manda a Daniel a buscar algo que no existe.

**Fragmentos cortos.** 5-15 líneas, lo justo para el punto que se explica. Si un
bloque necesita 40 líneas para entenderse, el problema es el bloque.

**Dibuja antes de explicar.** Un diagrama ASCII del flujo al principio de cada
sección. Quién llama a quién, qué dato viaja, dónde está la frontera de
seguridad. Se entiende un mapa en diez segundos y un párrafo en dos minutos.

**Explica el porqué, no el qué.** El código ya dice qué hace. El documento existe
para lo que el código no puede decir: qué alternativa se descartó y por qué,
qué pasa si se toca esto, qué error se cometió antes de llegar aquí.

**Nombra las trampas.** Todo lo que sorprendió durante la construcción va al
documento, con su síntoma: "si ves X, es que Y". Eso es lo que ahorra tardes.

## Estructura

1. **El problema** — qué no se podía hacer antes. Dos párrafos.
2. **El mapa** — diagrama del flujo completo.
3. **El recorrido** — sección por pieza, con el fragmento real y el porqué.
4. **Las decisiones** — tabla: decisión / alternativa descartada / motivo.
5. **Las trampas** — síntoma → causa → arreglo.
6. **Compruébalo tú** — comandos y URLs concretas para verlo funcionar con
   sus propios ojos. Nunca "debería funcionar": dale el comando.

## Tono

Se le escribe a un desarrollador competente que no conoce *esta* parte, no a un
principiante. Nada de "como sabrás". Nada de rellenar. Si una sección no tiene
nada que enseñar, se borra.
