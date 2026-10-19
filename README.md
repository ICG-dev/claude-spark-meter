# spark-meter

Mod para Claude Code que dibuja una franja encima del prompt con **Clawd**, el muñeco de Claude, y los datos de la sesión: modelo, effort, contexto, límite de 5 horas, límite semanal, costo y estado del turno.

```
   ♪ ♫
 ▐▛▀█▀▜▌ °oO   claude-sonnet-5-5  effort ●●●○○ high  ◐ Bash ⏱ 42s  ⎇ main ✎3  ◈ 2 agentes
▝▜█████▛▘      ctx ███░░░░░░░ 31%  5h █████░░░░░ 52% ↻1h20m  sem ██░░░░░░░░ 18% ↻3d4h  12.3k tok
  ▘▘ ▝▝
```

## Qué muestra

| Elemento | Qué es |
|---|---|
| Nombre del modelo | Se actualiza solo al usar `/model` (revisa cada 400 ms). |
| `effort ●●●○○` | Nivel de effort, con color: gris (low), verde (medium), amarillo (high), naranja (xhigh), rojo (max). |
| `ctx` | Porcentaje del contexto de la sesión usado. |
| `5h` / `sem` | Porcentaje usado del límite de 5 horas y del semanal, con el tiempo que falta para el reseteo (`↻1h20m`). |
| Costo | Tokens o dólares de la sesión (ver [Configuración](#configuración)). |
| `◐ pensando` / `○ esperando` | Si Claude está trabajando o esperando tu mensaje. Al trabajar muestra la herramienta en curso (`Bash +1` si hay varias) y un cronómetro `⏱`; al terminar, la duración del último turno. |
| `◈ N agentes` | Subagentes corriendo. Solo aparece si hay alguno. |
| `⎇ main ✎3 ↑1` | Rama de git, archivos con cambios sin guardar y commits sin subir. Fuera de un repo no aparece. |
| `✦ nombre-skill` | Skill en uso, ya sea con `/nombre` o llamada por Claude. |
| `✖ 3 errores seguidos` | Aparece tras 3 llamadas de herramientas fallidas seguidas. |

## Clawd

Clawd cambia según lo que pasa:

- **Animación:** parpadea, saluda y mueve los pies. Cada 30 s toma café (sorbos con los ojos cerrados). Mientras Claude trabaja no toma café: mueve los pies sin parar.
- **Sombrero por modelo:** Opus corona dorada, Sonnet notas musicales azules, Haiku flores rosas, Fable destellos verdes, Mythos estrellas moradas, GPT llaves `{·}`, Gemini gemelos azules. Un modelo desconocido no lleva sombrero.
- **Lentes:** Sonnet usa lentes azules (`▀█▀`).
- **Burbujas de pensamiento:** crecen con el effort, de `z` (low) a `°oO✻` (max).
- **Skill en uso:** Clawd se pone morado y su sombrero cambia según la familia de la skill (rocas para caveman, `</>` para codex y ejecutar, lupas para review y audit, ideas para brainstorm y plan, llaves para plugin y config, estrellas para el resto).
- **Gota de sudor:** aparece mientras contexto, 5h o semanal pasen de 85 %.
- **Ojos caídos:** con 3 errores de herramientas seguidos (también quita los lentes).

## Avisos

Cuando contexto, límite de 5 h o semanal suben de **85 %** o de **95 %** sale un aviso (toast). Cada aviso sale una sola vez por nivel; si el valor baja, se vuelve a activar. El aviso de contexto sugiere `/compact`.

## Modo compacto

La franja quita elementos según el ancho de la terminal en vez de cortar la línea:

| Ancho | Se quita |
|---|---|
| 120 columnas o más | nada |
| 100–119 | tiempos de reseteo `↻` |
| 80–99 | además costo y git; barras más cortas |
| menos de 80 | además el medidor de effort |

## Instalación

Requisitos: Claude Code con soporte de mods. El mod no tiene dependencias.

### Desde GitHub (recomendado)

En una sesión de Claude Code:

```
/plugin install spark-meter --marketplace ICG-dev/claude-spark-meter
```

O desde la terminal:

```
claude plugin install spark-meter --marketplace ICG-dev/claude-spark-meter
```

Claude Code pregunta si agregar el marketplace (responde `y`) y en qué alcance instalarlo. Queda activo en esa sesión y en las nuevas.

### Desde una carpeta local

1. Clona el repositorio:

   ```
   git clone https://github.com/ICG-dev/claude-spark-meter.git ~/.claude/mods/spark-meter
   ```

2. Valida que cargue:

   ```
   claude plugin validate ~/.claude/mods/spark-meter
   ```

3. Cárgalo de una de estas formas.

   **Para una sesión** (sirve para probarlo):

   ```
   claude --plugin-dir ~/.claude/mods/spark-meter
   ```

   **Siempre** (todas las sesiones nuevas): en `~/.claude/settings.json` agrega al bloque `env`:

   ```json
   {
     "env": {
       "CLAUDE_CODE_PLUGIN_DIRS": "~/.claude/mods/spark-meter"
     }
   }
   ```

   Si ya tienes la variable con otras carpetas, sepáralas con `:`.

Con la carga desde carpeta, el mod se vigila: al guardar cambios en sus archivos, se recarga solo al terminar el turno.

## Configuración

El mod tiene una opción, visible como fila en `/config`:

| Opción | Valores | Por defecto | Qué hace |
|---|---|---|---|
| `costUnit` | `tokens`, `dollars` | `tokens` | Muestra el costo de la sesión en tokens (`12.3k tok`) o en dólares (`$1.24`). |

También se puede fijar en `settings.json`, bajo `pluginConfigs`, con la clave del mod (`spark-meter`).

Notas sobre el costo:

- **Tokens:** suma entrada, salida y escritura de caché de todos los turnos, subagentes incluidos. No cuenta las lecturas de caché. Solo suma lo que pasa mientras el mod está cargado.
- **Dólares:** es el cálculo de la sesión (como `/cost`). Con una suscripción puede no coincidir con lo que te cobran.

## Estructura

```
claude-spark-meter/
├── .claude-plugin/
│   ├── plugin.json              manifiesto y opción costUnit
│   └── marketplace.json         permite instalarlo desde GitHub
├── hooks/
│   ├── hooks.json               apunta al módulo
│   ├── register.tsx             todo el mod: animación, datos y dibujo
│   └── bar.test.ts              pruebas de las funciones puras
└── types/index.d.ts             tipos del estado que guarda el mod
```

Eventos del motor que usa: `session.start`, `session.measure`, `turn.start`, `turn.step`, `turn.complete`, `tool.call`, `skill.prompt`, `command.run` (solo `/effort`) y `ui.render` (franja sobre el prompt). Llamadas: `$.session.usage`, `$.session.model`, `$.agent.list`, `$.process.run` (solo `git status`), `$.clock`, `$.ui.toast` y `$.state`.

## Desarrollo

Pruebas y validación:

```
claude plugin test .
claude plugin validate .
```

Las pruebas cubren las funciones puras: barras, reseteos, etiquetas de tokens y git, modo compacto, sombreros y ancho fijo de los cuadros de Clawd.

Para cambiar la frecuencia del café, edita `COFFEE_EVERY` en `hooks/register.tsx` (cada unidad son 400 ms; 75 equivale a 30 s). Para cambiar el nivel de los avisos, edita `alertLevel`.

## Limitaciones

- **Effort:** Claude Code no deja a los mods leerlo directamente. El mod lo toma de la respuesta del comando `/effort` y de cada pedido al modelo, así que puede tardar hasta el siguiente mensaje en reflejar un cambio hecho desde el menú.
- **Herramientas esperando aprobación:** se muestran como si ya estuvieran corriendo.
- **Skills con `/`:** el nombre aparece mientras dura el turno.
- **Sombreros de modelos poco comunes** (Mythos, GPT, Gemini): se detectan por el nombre del modelo y no se probaron con sesiones reales.
- **Límites 5 h y semanal:** solo hay datos con suscripción y después de la primera respuesta de la API; antes se muestra `—`.
- **Emojis y fuentes:** el mod usa solo caracteres de bloque y símbolos comunes. Si tu fuente dibuja alguno con otro ancho, la franja puede verse desalineada.

## Licencia

[MIT](LICENSE)
