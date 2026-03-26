## Description

### Overview

Este PR entrega la base funcional del challenge como un workflow editorial asistido por AI sobre `FastAPI + Next.js + PostgreSQL + SSE`, con soporte Docker para levantar el entorno completo.

El flujo principal quedó centrado en:

- crear campañas
- crear content pieces
- editar el canonical text
- generar drafts con AI
- aceptar o rechazar drafts
- traducir/localizar contenido
- extraer metadata editorial desde el canonical text
- seguir el historial de actividad AI y del workflow

Para facilitar la revisión, el stack Docker carga automáticamente una campaña demo y deja el sistema navegable sin depender de credenciales AI reales.

### Architecture

La implementación usa una separación ligera por capas:

- `api/`: rutas HTTP, schemas y manejo de errores de transporte
- `application/`: casos de uso, coordinación del workflow y serialización de respuestas
- `domain/`: enums y reglas de negocio chicas
- `infrastructure/`: persistencia, providers AI, cifrado y event bus

La intención no fue montar una Clean Architecture pesada, sino desacoplar responsabilidades lo suficiente para mantener el código legible, testeable y fácil de extender sin sobrediseñar el challenge.

### AI Integration

La integración con LLM está encapsulada detrás de una abstracción de provider compartida. La lógica AI vive en servicios de aplicación, no en controllers ni en componentes frontend.

- `Gemini` fue el provider usado y validado end-to-end durante el desarrollo, incluyendo prompts, parseo de respuestas y ajustes del flujo real.
- `OpenAI` está implementado detrás del mismo contrato, pero no quedó validado exhaustivamente en corridas locales reales porque no tuve credenciales funcionales para probarlo de punta a punta.
- La abstracción actual permite agregar otros providers más adelante, pero en esta entrega no estoy afirmando soporte validado más allá de Gemini y la integración base de OpenAI.

Decidí no incorporar `LangChain` o `LangSmith` en el core para mantener el sistema autocontenido, con menos dependencias y con mayor control sobre prompts, parseo y persistencia.

### Workflow Design

La unidad principal del sistema es `ContentPiece`.

- El `canonical text` es la fuente de verdad del contenido.
- Los drafts AI se modelan como propuestas separadas.
- `accept` aplica el draft aceptado sobre el canonical text.
- `reject` conserva el draft en historial, en lugar de descartarlo silenciosamente.
- El `review_state` del content piece es manual y no cambia automáticamente por aceptar o rechazar un draft AI.

Esto fue intencional: quise mantener explícita la diferencia entre estado editorial y decisiones sobre propuestas generadas por AI. El eje del flujo es human-in-the-loop, no auto-publicación basada en triggers.

La extracción de metadata quedó implementada como una capacidad complementaria derivada del canonical text. Aporta valor para explorar el contenido, pero no fue tratada como el centro del workflow.

### Scope Decisions

Para mantener foco en el core del challenge, dejé fuera de alcance varias líneas posibles de expansión:

- autenticación y multi-user permissions
- versionado complejo de contenido
- comparación entre múltiples modelos sobre la misma pieza
- orquestación más pesada de pipelines AI
- hardening de producción y concerns operativos avanzados

La intención fue priorizar un flujo editorial completo, claro y demostrable, antes que abrir demasiados frentes parciales.

### Frontend Notes

En frontend usé Stitch como apoyo para iterar rápido la estructura visual y bajar incertidumbre sobre layout y navegación.

- Hubo iteraciones iniciales más exploratorias para encontrar una dirección útil.
- Después convergí sobre las pantallas V2 que mejor representaban el flujo principal del producto.

También quedaron algunos componentes relativamente grandes, especialmente en la pantalla de edición. Fue una decisión pragmática para priorizar la cobertura del flujo end-to-end dentro del tiempo del challenge. En un entorno de producción los modularizaría más fino.

### AI Observability

Implementé observabilidad propia para las corridas AI sin depender de herramientas externas.

- Cada llamada AI relevante queda persistida con input, output, provider, model, status y timestamp.
- En el editor, `?lab=1` expone el historial completo de interacciones del LLM para esa pieza.
- Esto permite revisar prompts efectivos, inputs reales y respuestas generadas durante la evolución del contenido.

La decisión de no usar LangSmith fue deliberada: para esta entrega preferí un sistema autocontenido, visible desde el producto y alineado con el dominio del challenge.

### Development Approach

El desarrollo fue incremental y con commits chicos, buscando diffs reviewables y separación clara entre:

- features
- fixes
- refactors
- documentación

También prioricé mantener el seed demo, los tests y el flujo Docker en estado utilizable mientras el producto iba cambiando, para no terminar con una demo difícil de correr o verificar.

### Tradeoffs

Los tradeoffs principales de esta entrega fueron:

- simplicidad sobre extensibilidad total
- cobertura funcional del flujo sobre perfección visual en todos los detalles
- control explícito del sistema sobre dependencia de tooling externo más pesado

También hay un tradeoff explícito en provider settings:

- las API keys quedan cifradas at-rest y nunca vuelven por la API
- la UI nunca rehidrata una key guardada
- pero, si el usuario decide cargar la key desde la UI web, esa key necesariamente viaja una vez en el body del request de guardado

Preferí dejar ese boundary documentado de forma honesta, en vez de prometer una garantía imposible para una aplicación web.

### How to Test

Flujo recomendado para revisar el sistema:

1. Levantar el entorno:
   - `docker compose --env-file .env.docker.example up --build`
2. Abrir `http://localhost:3000`
3. Entrar a la campaña demo `ACME Media | Creator Launch Demo`
4. Abrir una content piece
5. Editar el canonical text
6. Generar un draft con AI
7. Aceptar o rechazar el draft
8. Probar traducción/localización
9. Probar extracción de metadata
10. Agregar `?lab=1` a la URL del editor para inspeccionar el historial completo de llamadas AI

### Notes / Future Improvements

- Stitch reference: `TODO: agregar link real del proyecto / iteraciones`
- Validar OpenAI con credenciales reales en una corrida end-to-end
- Seguir modularizando componentes grandes del frontend
- Extender la capa de providers si el producto realmente necesita más de un backend AI en producción
- Profundizar versionado y revisión editorial solo si el problema de negocio realmente lo justifica

Fixes # (issue)

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [x] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [x] Documentation update

## How Has This Been Tested?

Please describe the tests that you ran to verify your changes. Provide instructions so we can reproduce.

- [x] `cd backend && uv run pytest`
- [x] `cd frontend && bunx tsc --noEmit`
- [x] `cd frontend && bun run test`
- [x] `docker compose --env-file .env.docker.example up --build`
- [x] Verificación manual del flujo demo:
  - dashboard con listado de campañas
  - campaign content list
  - editor de content piece
  - edición de canonical text
  - generación de draft
  - accept / reject sobre drafts
  - traducción/localización
  - extracción de metadata
  - inspección de historial AI con `?lab=1`

## Checklist

- [x] My code follows the style guidelines of this project
- [x] I have performed a self-review of my code
- [x] I have commented my code, particularly in hard-to-understand areas
- [x] I have made corresponding changes to the documentation
- [x] My changes generate no new warnings
- [x] Any dependent changes have been merged and published in downstream modules
- [x] I have checked my code and corrected any misspellings
