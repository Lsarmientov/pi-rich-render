# Pi Rich Renderer

**Pi Rich Renderer** es una extensión modular en TypeScript para **Pi Coding Agent 1.0** (utilizado dentro de Gentle Shell 4.0.0 en Windows). Permite leer, seleccionar, copiar y exportar bloques estructurados de código, tablas, diffs, JSON/YAML/XML, listas, diagramas Mermaid y fórmulas LaTeX dentro de la TUI, sin contaminar el portapapeles con decoraciones ni bordes de la terminal.

---

## 🎯 Principio rector

> **La fuente original siempre se conserva separada de la presentación.**
> Nunca se copia texto dibujado desde la pantalla. Los delimitadores Markdown (fences), números de línea, colores ANSI y bordes de la terminal quedan excluidos de la copia, manteniendo la indentación exacta, líneas vacías y caracteres Unicode.

---

## 🚀 Instalación y Carga

### Modo desarrollo / prueba rápida (usando `jiti` nativo de Pi):
```bash
pi --extension c:/Daniel/Proyectos/pi-rich-render/src/extension-entrypoint.ts
```

### Instalación permanente a nivel de usuario:
Copia la carpeta de la extensión o crea un symlink en el directorio de extensiones de Pi:
```powershell
New-Item -ItemType SymbolicLink -Path "$HOME\.pi\agent\extensions\pi-rich-renderer" -Target "c:\Daniel\Proyectos\pi-rich-render"
```

### Instalación por proyecto:
Agrega la extensión dentro de la carpeta `.pi/extensions/` de tu repositorio:
```powershell
Copy-Item -Recurse "c:\Daniel\Proyectos\pi-rich-render" ".pi\extensions\pi-rich-renderer"
```

---

## ⌨️ Comandos disponibles

| Comando | Acción |
|---|---|
| `/rich` | Muestra la ayuda interactiva y lista de subcomandos. |
| `/rich copy` | Abre el selector interactivo (`ctx.ui.select`) para elegir un bloque y copiarlo limpiamente al portapapeles. Si es una tabla, permite elegir entre Markdown, TSV o JSON. |
| `/rich last` | Copia de inmediato el último bloque compatible del contexto activo sin ambigüedades. |
| `/rich list` | Enumera todos los bloques detectados con tipo, lenguaje y conteo de líneas, permitiendo copiar o abrir preview directamente. |
| `/rich view` | Abre una vista temporal ampliada en overlay dentro de la TUI (`{ overlay: true }`) con scroll vertical u horizontal y navegación por teclado. |

### Portapapeles

Windows usa PowerShell `Set-Clipboard` y recurre a `clip` si no está disponible; macOS usa `pbcopy`; Linux usa `wl-copy` o `xclip`. Si no se encuentra una herramienta, la copia falla con un error claro. Como alternativa cuando no se encuentra una herramienta local, OSC 52 se usa si `PI_CLIPBOARD_OSC52=1` o si la sesión se ejecuta por SSH. OSC 52 depende de que la terminal lo permita; algunas terminales lo desactivan. El texto copiado sigue siendo texto plano: sin fences, ANSI ni bordes.

---

## 📊 Capacidades por Tipo de Bloque

- **Código fuente (SQL, TypeScript, Python, Bash, C#, etc.)**:
  - Copia sin fences, sin bordes y conservando indentación.
  - Preview con numeración de líneas y scroll (`↑/↓` o `j/k`).
- **Tablas Markdown**:
  - Detección precisa de encabezados y alineaciones (`left`, `center`, `right`).
  - **Exportación TSV**: Formato delimitado por tabulaciones ideal para pegar en Excel o Google Sheets.
  - **Exportación JSON**: Conversión segura a array de objetos (se bloquea si hay encabezados duplicados o vacíos para evitar inventar propiedades).
  - Preview interactivo con bordes limpios y scroll horizontal/vertical (`h/j/k/l`).
- **Diffs**:
  - Resaltado de adiciones (`+`) y eliminaciones (`-`) en el visor.
  - La copia preserva el diff puro original sin códigos de escape ANSI.
- **JSON / YAML / XML**:
  - Tecla `f` en el visor para alternar entre la fuente cruda y formato indentado legible.
  - La copia por defecto preserva la fuente original intacta.
- **Mermaid y LaTeX**:
  - Visor textual con advertencia de fidelidad.
  - Copia directa de la fuente sintáctica completa sin requerir preview visual externo.

---

## 🧪 Pruebas Automatizadas

El proyecto cuenta con una suite completa de pruebas unitarias con **Vitest**:
```bash
npm test
```
*Cubre: fences con y sin lenguaje, delimitadores de tildes `~~~`, Unicode y emojis, bloques múltiples, tablas con pipes escapados `\|`, exportaciones TSV/JSON condicionales y selección de comandos del portapapeles por sistema operativo (Windows, macOS y Linux), además de la codificación y el fallback OSC 52.*

---

## 📋 Guía de Pruebas Manuales en la TUI

1. **Verificación de carga**:
   - Ejecuta `pi --extension ./src/extension-entrypoint.ts`.
   - Verifica que aparezca la notificación: `pi-rich-renderer ready (... history entries)`.
2. **Copia limpia de código**:
   - Pídele al agente: *"Escribe una función TypeScript con comentarios e indentación"*.
   - Ejecuta `/rich copy` o `/rich last`.
   - Pega en un editor externo (VS Code o Notepad) y confirma que no haya fences ` ``` `, números de línea ni bordes.
3. **Exportación de tabla**:
   - Pídele al agente: *"Muestra una tabla con columnas ID, Nombre y Rol"*.
   - Ejecuta `/rich copy`. Selecciona la opción `2. TSV (Spreadsheets / Excel)`.
   - Pega en Excel y verifica que cada dato quede en su celda correspondiente.
4. **Vista interactiva en overlay**:
   - Ejecuta `/rich view` y selecciona la tabla o un bloque de código largo.
   - Navega con las flechas del teclado o `j/k`. Presiona `Esc` o `q` para cerrar el overlay.
5. **Listado de contexto**:
   - Ejecuta `/rich list`.
   - Confirma que liste los bloques encontrados con sus metadatos y permita copiarlos o abrirlos.

---

## ⚠️ Limitaciones Conocidas

1. **Preview gráfico de diagramas (Mermaid/LaTeX)**: La terminal interactiva (TUI) estándar no renderiza gráficos rasterizados/SVG de diagramas. La extensión muestra la sintaxis fuente estructurada y permite copiarla sin alteraciones para su uso en visores dedicados.
2. **Alcance del contexto**: La extensión utiliza exclusivamente las APIs públicas documentadas (`ctx.sessionManager.getBranch()`). Solo analiza los mensajes pertenecientes a la rama activa actual de la conversación, respetando la privacidad y el aislamiento del núcleo de Pi.
