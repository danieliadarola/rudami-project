# 02 · La pantalla de progreso

*Fase 3 · Escrito el 11/09/2026*

---

## 1. El problema

La portada de `/mi` responde a una pregunta: **"¿qué hago hoy?"**. Está bien
para el día a día, pero no responde a la que un paciente se hace a las tres
semanas: **"¿esto está sirviendo de algo?"**. Y esa es, además, la pantalla que
un fisio puede girar hacia el paciente en consulta para justificar el
tratamiento — el momento comercial de la app.

La dificultad no es dibujar gráficas. Es **de dónde salen los datos**. Hasta
ahora el paciente solo veía cosas que él mismo generaba (su dolor diario, sus
ejercicios marcados). El progreso de verdad está en otra tabla: `sesiones`,
donde el fisio puntúa en cada consulta el dolor, la movilidad, la fuerza, la
rigidez, la fatiga, el sueño y la adherencia. Abrir esa tabla al paciente es
cruzar una frontera nueva, y `sesiones` está llena de campos que **jamás** debe
ver: la anamnesis, la exploración, las notas, el diagnóstico de la IA, las red
flags.

---

## 2. El mapa

```
        /mi (Hoy)                    /mi/progreso (Progreso)
            |                                |
       mi_resumen()                     mi_progreso()   <- RPC nueva
       mi_plan()                             |
            |                    +-----------+-----------+
            |                    | lista blanca: SOLO    |
            |                    | numeros y fechas       |
            |                    +-----------+-----------+
            |                                |
            |          +---------------------+---------------------+
            |          v                     v                     v
            |     sesiones               guia_checkins        guia_checks
            |   (del episodio)          (dolor diario)      (ejercicios/dia)
            |   dolor,movilidad,          del paciente         del paciente
            |   fuerza,rigidez...          180 dias             180 dias
            |          |                     |                     |
            |          v                     v                     v
            |     AntesAhora            GraficaDolor        AdherenciaSemanal
            |     (antes->ahora)      (dos series, 1 eje)   (6 barras)
            |
            +---- barra inferior: Hoy | Progreso (BarraMi) ----+
```

Lo que hay que retener: **la RPC nueva mezcla dos orígenes con dos alcances
distintos a propósito.** Las métricas clínicas se acotan al *episodio activo*
(es "cómo va esta lesión"). El dolor diario y la constancia son del *paciente
entero* con ventana de 180 días (su hábito no entiende de episodios).

---

## 3. El recorrido

### 3.1 · La lista blanca más delicada de todas

Es el mismo patrón de la fase 1 (enumerar columnas a mano, nunca restarlas),
pero aquí el coste de equivocarse es mayor, porque `sesiones` es la historia
clínica del profesional:

```sql
-- supabase/migrations/20260911100000_mi_progreso.sql
-- Métricas de sesión del episodio: SOLO números y la fecha.
'sesiones', coalesce((
  select jsonb_agg(jsonb_build_object(
    'fecha',      s.fecha,
    'dolor',      s.dolor_eva,
    'movilidad',  s.movilidad,
    'fuerza',     s.fuerza,
    'rigidez',    s.rigidez,
    'fatiga',     s.fatiga,
    'sueno',      s.sueno,
    'adherencia', s.adherencia) order by s.fecha)
  from sesiones s, yo, episodio e
  where s.paciente_id = yo.id and s.episodio_id = e.id), '[]'::jsonb),
```

Fíjate en lo que **no** está, y que la cabecera del archivo enumera para que
nadie lo añada por descuido: `anamnesis`, `exploracion_fisica`, `notas`,
`diagnostico_ia`, `plan_tratamiento_ia`, `red_flags`, `tests_ortopedicos`,
`hipotesis_principal`, `derivacion`, `contexto_biopsicosocial`,
`antecedentes_*`. De una sesión salen ocho cosas: la fecha y siete números del
0 al 10. Nada de texto, nunca.

> Hay incluso respaldo legal: la Ley 41/2002 (art. 18.3) deja las anotaciones
> subjetivas del profesional fuera del derecho de acceso del paciente. La lista
> blanca no es solo higiene técnica, es la línea correcta también en lo legal.

### 3.2 · El tipo es el espejo del SQL

`app/lib/paciente/tipos.ts` copia la forma exacta de la RPC. Si algún día
apareciera aquí un campo de texto, es que algo se rompió en la migración:

```ts
// app/lib/paciente/tipos.ts
/** Una sesión clínica vista por el paciente: la fecha y SIETE números.
 *  Espejo exacto de la lista blanca de mi_progreso() — si aquí apareciera
 *  un campo de texto, algo se ha roto en la migración, no aquí. */
export interface SesionProgreso {
  fecha: string
  dolor: number | null
  movilidad: number | null
  // ...cinco números más, todos number | null
}
```

### 3.3 · Dos series, un solo eje

La regla de oro de las gráficas: **nunca dos ejes verticales distintos**. Aquí
es fácil respetarla porque las dos series miden lo mismo — dolor de 0 a 10 —
solo que una la cuenta el paciente en casa y otra la mide el fisio en consulta:

```tsx
// components/paciente/GraficaDolor.tsx
// Identidad de las series por color Y forma (círculos de tinta frente a
// rombos dorados con borde --gold-d): nadie depende solo del color.
```

El detalle no evidente es **por qué el rombo lleva borde dorado oscuro**. El
dorado de la marca (`--gold`, #c8952a) sobre blanco da 2,7:1 de contraste —
suspende. Un rombo relleno de dorado a secas se pierde sobre el papel. El borde
`--gold-d` (#8a6414) lo rodea con un tono que sí cumple contraste en los dos
temas. Es la diferencia entre "se ve bonito en mi pantalla" y "se ve".

Y la identidad **nunca depende solo del color**: la serie del paciente son
círculos con línea continua; la del fisio, rombos con línea de puntos. Un
daltónico los distingue por la forma. Eso también sale de validar la paleta con
el script de dataviz en vez de fiarse del ojo — el par dorado/tinta pasa de
sobra en separación, pero el dorado suelto fallaba en contraste, y eso solo lo
ves midiéndolo.

### 3.4 · La semana en curso no miente

En las barras de adherencia hay una trampa de cálculo que estropearía el dato:

```tsx
// components/paciente/AdherenciaSemanal.tsx
// La semana en curso solo cuenta los días ya transcurridos: pedirle a un
// martes el 100% de la semana pintaría de flojera lo que es calendario.
const dias = i === SEMANAS - 1 ? ((h.getDay() + 6) % 7) + 1 : 7
const pct = Math.min(100, Math.round((hechos / (ejerciciosDia * dias)) * 100))
```

Si hoy es martes y el denominador fueran los 7 días de la semana, un paciente
que lo ha hecho todo saldría al 29%. El denominador de la semana actual son solo
los días que ya han pasado. Las semanas cerradas sí usan los 7.

(El `(h.getDay() + 6) % 7` convierte el domingo=0 de JavaScript en un lunes=0,
porque aquí la semana empieza en lunes.)

### 3.5 · El tono: informar, no juzgar

Esta es una decisión de producto escrita en código. El dolor puede empeorar, y
la app **no puede diagnosticar**:

```tsx
// components/paciente/AntesAhora.tsx
// El tono es deliberado (decisión de fase 3): la mejora se celebra en verde;
// el empeoramiento se muestra en NEUTRO, sin rojo y sin juicio — "ha subido"
// es información, "vas mal" es un diagnóstico que no nos toca hacer. Si algo
// va mal de verdad, quien lo cuenta es el fisio.
```

Cada métrica sabe en qué dirección es buena (subir fuerza = bien; subir dolor =
mal). Cuando va a mejor, se pinta verde y dice "mejora". Cuando va a peor, se
pinta en gris neutro y dice "ha subido" / "ha bajado" — un hecho, no una alarma.
Meter un rojo de "¡vas mal!" en la pantalla de alguien con dolor sería a la vez
cruel y clínicamente irresponsable.

### 3.6 · Coste en el cliente: cero

Toda la pantalla es Server Component, gráficas incluidas:

```tsx
// app/mi/progreso/page.tsx
// Server Component de punta a punta, gráficas incluidas: SVG y HTML sin un
// solo estado. Esta pantalla añade CERO JavaScript al cliente — solo pesan
// los bytes del HTML que ya viene pintado.
```

No hay `recharts` ni librería de gráficas (habrían sido ~100 KB para tres formas
simples). No hay `'use client'` en ninguna de las cuatro piezas nuevas. El único
JS que toca esta ruta es el que ya carga toda la app. Un SVG dibujado a mano y
seis `<div>` con altura en porcentaje hacen el trabajo.

### 3.7 · La barra que nace pequeña para crecer

```tsx
// components/paciente/BarraMi.tsx
// Server Component a propósito: la pestaña activa llega por prop desde cada
// página en vez de leerse con usePathname(), que obligaría a 'use client' y
// a hidratar una barra que no tiene ni un solo estado. Cero JS.
```

Dos pestañas hoy (Hoy / Progreso). La fase 4 (citas y bonos) traerá la tercera.
Se ha hecho ya la barra en vez de esperar, porque introducir navegación después
obliga a rediseñar ambas pantallas; naciendo con ella, añadir una pestaña es una
línea en un array.

---

## 4. Decisiones, en una tabla

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Pantalla propia `/mi/progreso` | Alargar la portada | La portada es acción; el progreso es reflexión. Y la fase 4 necesita navegación igual |
| Abrir métricas del fisio | Solo datos del paciente | Es el diferenciador: "así has mejorado según tu fisio". Con ~3 sesiones/episodio ya hay línea |
| Lista blanca de 8 campos | `to_jsonb(s) - 'notas' - ...` | La resta publicaría sola cualquier columna clínica futura de `sesiones` |
| Episodio activo, sin selector | Historial completo | 1,2 episodios por paciente: un selector para una lista de 1 es ruido |
| SVG propio, 0 KB | recharts / Chart.js | ~100 KB para tres formas simples viola la regla del bundle |
| Textos deterministas | Que la IA comente el progreso | Riesgo clínico + gasto de cuota para algo que reglas simples hacen mejor |
| Empeoramiento en neutro | Rojo de alarma | La app informa, no diagnostica |

---

## 5. Trampas

**La semana actual sale con adherencia bajísima.** El denominador está contando
los 7 días en vez de los transcurridos. Ver `AdherenciaSemanal.tsx`.

**Un rombo dorado se pierde sobre el fondo.** Le falta el borde `--gold-d`. El
dorado puro no tiene contraste suficiente (2,7:1) sobre blanco.

**Aparece un campo de texto en el progreso.** Alguien añadió una columna a la
lista blanca de `mi_progreso()` que no debía. Solo fecha y números salen de
`sesiones`.

**La gráfica del dolor no se dibuja.** Necesita al menos 2 fechas distintas
entre las dos series juntas. Con un solo punto no hay evolución que enseñar (es
el mismo criterio que `SparkDolor`).

**El progreso está vacío en la demo.** El paciente vinculado no tiene sesiones
en su episodio activo. Recuerda que `mi_progreso()` filtra por `episodio_id`: si
las sesiones de la demo no cuelgan del episodio activo, no salen.

---

## 6. Compruébalo tú

**Que anon no puede pedir progreso.** `POST /rest/v1/rpc/mi_progreso` con la
clave publishable → `42501`, permission denied. Verificado.

**Que solo salen números.** Impersonando a un paciente vinculado, las claves de
cada sesión son exactamente: `fecha, dolor, movilidad, fuerza, rigidez, fatiga,
sueno, adherencia`. Ni una más. Verificado el 11/09/2026.

**Que la ruta existe y está protegida.** Sin sesión, `GET /mi/progreso` →
HTTP 307 a `/mi/entrar?redirect=%2Fmi%2Fprogreso`. Verificado.

**Que no añade JavaScript.** `npm run build`: `/mi/progreso` compila como ruta
dinámica (ƒ) y ninguna de las cuatro piezas nuevas es `'use client'`.

---

## Archivos de este bloque

```
supabase/migrations/
  20260911100000_mi_progreso.sql     RPC con lista blanca de sesiones

app/mi/progreso/page.tsx             la pantalla (Server Component)

components/paciente/
  BarraMi.tsx            navegacion inferior Hoy | Progreso
  GraficaDolor.tsx       dos series (paciente + fisio), un eje
  AdherenciaSemanal.tsx  seis barras de constancia
  AntesAhora.tsx         primera sesion -> ultima, por metrica

app/lib/paciente/tipos.ts   + SesionProgreso, ProgresoPaciente
```
