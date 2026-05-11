# FADE Test

App estática y gratuita para estudiar FADE con preguntas tipo test, preguntas escritas, progreso y repaso de falladas.

No usa OpenAI API, no tiene backend, no necesita base de datos y se puede publicar gratis en GitHub Pages.

## Enlaces

- Repositorio: <https://github.com/mateoesdel2007-coder/fade-quiz>
- App publicada: <https://mateoesdel2007-coder.github.io/fade-quiz/>

## Abrir en ordenador

Opción sencilla:

1. Abre `index.html` con doble clic.
2. Si el navegador bloquea alguna función PWA, usa la opción con servidor local.

Opción con servidor local:

```powershell
cd "C:\Users\mateo\Documents\New project"
python -m http.server 8000
```

Si `python` no funciona en tu ordenador, usa el Python que trae Codex:

```powershell
cd "C:\Users\mateo\Documents\New project"
& "C:\Users\mateo\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" -m http.server 8000
```

Luego abre:

```txt
http://localhost:8000
```

## Subir a GitHub Pages

Este proyecto ya está preparado para GitHub Pages.

1. Crea un repositorio nuevo en GitHub.
2. Sube estos archivos y carpetas:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `manifest.json`
   - `sw.js`
   - `assets/`
   - `data/`
   - `README.md`
3. En GitHub, entra en `Settings`.
4. Abre `Pages`.
5. En `Build and deployment`, elige:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
6. Guarda.
7. GitHub te dará una URL parecida a:

```txt
https://tu-usuario.github.io/nombre-del-repo/
```

## Abrir desde el móvil

1. Publica la app con GitHub Pages.
2. Abre la URL desde el navegador del móvil.
3. Usa la app normal desde esa página.

## Instalar como PWA

En Android/Chrome:

1. Abre la URL de GitHub Pages.
2. Toca el menú de Chrome.
3. Pulsa `Añadir a pantalla de inicio` o `Instalar app`.

En iPhone/Safari:

1. Abre la URL de GitHub Pages.
2. Pulsa compartir.
3. Pulsa `Añadir a pantalla de inicio`.

## Exportar progreso del ordenador al móvil

1. En el ordenador, entra en `Importar/exportar progreso`.
2. Pulsa `Descargar progreso_fade.json` o `Copiar texto`.
3. Pásate el archivo o el texto al móvil.
4. En el móvil, entra en `Importar/exportar progreso`.
5. Importa el archivo JSON o pega el texto.

## Exportar progreso del móvil al ordenador

1. En el móvil, entra en `Importar/exportar progreso`.
2. Descarga o copia el progreso.
3. En el ordenador, abre la app.
4. Importa el archivo o pega el texto.

## Cómo funciona el repaso de falladas

- Si fallas una pregunta, entra en falladas de su tema.
- También aparece en falladas globales.
- Para salir de falladas debes acertarla 2 veces seguidas.
- Si la has fallado muchas veces, puede pedir 3 aciertos seguidos.
- Si la vuelves a fallar, el contador vuelve a cero.

## Añadir más preguntas a mano

Edita `data/questions.json` y `data/questions.js`.

Formato tipo test:

```json
{
  "id": "T1_TEST_EXTRA_001",
  "tema": "Tema 1",
  "bloque": "Empresa",
  "tipo": "test",
  "dificultad": "basica",
  "pregunta": "Texto de la pregunta",
  "opciones": {
    "A": "Opción A",
    "B": "Opción B",
    "C": "Opción C",
    "D": "Opción D"
  },
  "respuesta_correcta": "B",
  "explicacion": "Explicación breve.",
  "fuente": "Resumen / Tema 1"
}
```

Formato escrito:

```json
{
  "id": "T1_DEF_EXTRA_001",
  "tema": "Tema 1",
  "bloque": "Empresa",
  "tipo": "definicion",
  "dificultad": "alta",
  "pregunta": "Define brevemente...",
  "respuesta_modelo": "Respuesta modelo.",
  "puntos_clave": ["Punto 1", "Punto 2", "Punto 3"],
  "explicacion": "Explicación breve.",
  "fuente": "Resumen / Tema 1"
}
```

Importante: `data/questions.js` debe contener lo mismo que `questions.json`, pero asignado a `window.FADE_QUESTION_BANK`. Esto permite abrir la app también como archivo local.

## Regenerar o ampliar el banco

Los materiales de FADE se leen desde:

```txt
C:\Users\mateo\Desktop\1o_carrera\2o_cuatri\FADE
```

Primero extrae el texto:

```powershell
& "C:\Users\mateo\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" tools\extract_fade_materials.py
```

Después regenera el banco:

```powershell
& "C:\Users\mateo\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" tools\build_questions.py
```

La app excluye Tema 2 y Tema 4. El banco actual incluye Tema 1, 3, 5, 6, 7, 8, 9 y 10.

## Archivos principales

- `index.html`: entrada de la app.
- `styles.css`: diseño visual.
- `app.js`: lógica de tests, falladas, progreso e import/export.
- `data/questions.json`: banco de preguntas.
- `data/questions.js`: banco cargable abriendo el HTML localmente.
- `manifest.json`: instalación PWA.
- `sw.js`: funcionamiento offline cuando se publica o se sirve por HTTP.

## Archivos publicados

Solo se publica lo necesario para que funcione la app:

- `.gitignore`
- `README.md`
- `index.html`
- `styles.css`
- `app.js`
- `manifest.json`
- `sw.js`
- `assets/icon.svg`
- `data/questions.json`
- `data/questions.js`

## Archivos no publicados por privacidad

No se publican:

- PDFs originales.
- Apuntes completos.
- Documentos Word, PowerPoint o Excel originales.
- `.env` ni claves API.
- `materials/`.
- Cachés como `__pycache__/`.
- Textos extraídos en `tools/output/`.
- Scripts internos de extracción/generación en `tools/`.
- Metadatos locales de materiales como `data/materials.json`.
