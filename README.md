# Luffy-gotchi 🏴‍☠️

Tamagotchi temático de **Luffy (One Piece)** desarrollado como proyecto final del módulo de Desarrollo de Aplicaciones Web.

## Tecnologías

- HTML5 semántico
- CSS3 (variables, animaciones, diseño retro pixel-art)
- Vanilla JavaScript

## Cómo jugar

1. Abre el juego en el navegador
2. Escribe el nombre de tu tripulante y pulsa **¡Zarpar!**
3. Mantén a Luffy vivo cuidando sus 3 estadísticas:
   - 🍖 **Hambre** — dale de comer antes de que llegue a 0
   - ⚡ **Energía** — hazle dormir cuando esté agotado
   - 😄 **Felicidad** — hazle jugar para subirle el ánimo
4. Si las 3 llegan a 0 → Game Over

## Mecánicas

| Acción | Efecto |
| --- | --- |
| 🍖 Comer | +Hambre, +Felicidad, -Energía |
| 🎮 Jugar | Abre selección de minijuego. Ganar: +Felicidad +Energía |
| 💤 Dormir | +Energía, -Felicidad |

## Expresiones de Luffy

| Estado | Cuando ocurre |
| --- | --- |
| Normal | Estado estándar |
| Hambriento | Hambre ≤ 20% |
| Saciado | Hambre ≥ 85% y Felicidad ≥ 70% |
| Cansado | Energía ≤ 20% |
| Feliz | Felicidad ≥ 70% |
| Muerto | Las 3 stats a 0 |

## Ampliaciones implementadas (Sprint 4)

- **Minijuego Batalla**: Piedra-Papel-Tijeras contra la CPU
- **Minijuego Esquiva la Tormenta**: mueve el barco con el ratón para esquivar obstáculos durante 15 segundos
- **Minijuego Gomu Gomu Sniper**: para la aguja en movimiento en la zona correcta para sumar puntos
- **Minijuego Mapa del Tesoro**: encuentra la Fruta del Diablo en una cuadrícula 4x4 con pistas de caliente/frío
- Animaciones CSS por estado (rebote, temblor de hambre, salto alegre, respiración cansada)
- Sprites SVG con 6 expresiones faciales distintas
- Persistencia automática con localStorage (la partida se guarda en cada cambio)
- Rediseño visual tema **Nakama Rojo** (rojo, negro y dorado)

## Estructura del proyecto

```
luffy-gotchi/
├── index.html          # Estructura HTML (7 pantallas)
├── css/
│   └── styles.css      # Estilos retro + tema One Piece
└── js/
    └── main.js         # Lógica, game loop, sprites, localStorage
```

## Planificación (Sprints)

| Sprint | Horas | Objetivo |
| --- | --- | --- |
| Sprint 1 | 10h | Setup, HTML semántico, estructura de pantallas |
| Sprint 2 | 10h | CSS retro, variables, animaciones |
| Sprint 3 | 10h | Lógica JS, game loop, muerte, localStorage |
| Sprint 4 | 10h | Minijuegos, refactor visual, despliegue |

## Despliegue

[Ver en producción](https://adiaram4.github.io/Tamagochi_Vegeta/)
