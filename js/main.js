'use strict';

/* ================================================
   LUFFY-GOTCHI — Lógica Principal
   ================================================ */

/* ──────────────────────────────────────────────
   CONSTANTES (cero magic numbers)
────────────────────────────────────────────── */
const STAT_MAX            = 100;
const STAT_MIN            = 0;
const STAT_INITIAL        = 80;

// Decaimiento por tick del game loop
const DECAY_HUNGER        = 3;
const DECAY_ENERGY        = 2;
const DECAY_HAPPINESS     = 2;

// Ganancias y costos por acción
const GAIN_HUNGER_FEED       = 25;
const GAIN_HAPPINESS_FEED    = 5;
const COST_ENERGY_FEED       = 2;

const GAIN_HAPPINESS_PLAY    = 20;
const COST_ENERGY_PLAY       = 15;
const COST_HUNGER_PLAY       = 8;

const GAIN_ENERGY_SLEEP      = 35;
const COST_HAPPINESS_SLEEP   = 5;

// Bonificaciones del minijuego
const MINIGAME_WIN_HAPPINESS = 15;
const MINIGAME_WIN_ENERGY    = 10;
const MINIGAME_LOSE_HAPPINESS = 5;

// Umbrales para cambiar el sprite de Luffy
const THRESHOLD_CRITICAL  = 20;   // stat ≤ esto → estado crítico
const THRESHOLD_HAPPY     = 70;   // stat ≥ esto → contento
const THRESHOLD_FULL      = 85;   // hambre ≥ esto → saciado

// Temporización
const LOOP_INTERVAL_MS       = 4000; // tick cada 4 segundos
const BUBBLE_DURATION_MS     = 2500; // burbuja visible 2.5s
const BUTTON_COOLDOWN_MS     = 1000; // evita spam de botones
const MS_POR_TICK_OFFLINE    = LOOP_INTERVAL_MS; // equivalencia offline/online

// Persistencia
const STORAGE_KEY            = 'luffy_gotchi_save';
const STORAGE_KEY_TIMESTAMP  = 'luffy_gotchi_timestamp';

/* ──────────────────────────────────────────────
   FRASES POR SITUACIÓN
────────────────────────────────────────────── */
const FRASES = {
  feed:    ['¡CARNE! 🍖', '¡Itadakimasu!', '¡Esto está buenísimo!', '¡Soy el Rey Pirata!'],
  play:    ['¡Gomu Gomu no Pistol!', '¡Voy a ser el mejor!', '¡YOHOHOHO!', '¡A luchar!'],
  sleep:   ['Zzz... carne...', '¡Déjame dormir!', 'Zzz...', 'Buenas noches nakama...'],
  hungry:  ['¡Quiero carne!', '¡Tengo hambre!', '¡Me voy a morir!', '¡Nami, dame comida!'],
  tired:   ['Estoy agotado...', 'Necesito dormir...', '¡Zzz...!'],
  happy:   ['¡JA JA JA!', '¡SOY LUFFY!', '¡Nakama!', '¡Vamos a ser piratas!'],
  full:    ['¡Estoy lleno!', '¡Delicioso!', '¡Barriga llena!'],
  toofull: ['¡Ya no puedo más!', '¡Estoy a punto de explotar!'],
  tired_play: ['¡Estoy muy cansado para luchar!', '¡Déjame descansar primero!'],
  already_max_energy: ['¡Estoy lleno de energía!', '¡No tengo sueño!'],
};

/* ──────────────────────────────────────────────
   SPRITES SVG — Expresiones de Luffy
────────────────────────────────────────────── */

// Partes comunes reutilizadas en cada sprite
const SPRITE_HAT = `
  <ellipse cx="50" cy="28" rx="48" ry="11" fill="#B8861A"/>
  <path d="M16,27 Q14,4 50,4 Q86,4 84,27Z" fill="#DBA820"/>
  <ellipse cx="50" cy="28" rx="48" ry="11" fill="none" stroke="#8B6010" stroke-width="1.5"/>
  <rect x="12" y="24" width="76" height="8" rx="3" fill="#CC1111"/>
  <rect x="12" y="24" width="76" height="3" rx="2" fill="#EE2222" opacity="0.5"/>`;

const SPRITE_HAIR = `
  <path d="M20,52 Q16,36 22,28 Q28,22 36,25" fill="#0D0D0D"/>
  <path d="M80,52 Q84,36 78,28 Q72,22 64,25" fill="#0D0D0D"/>
  <path d="M36,25 Q39,12 44,24 Q47,10 50,24 Q53,10 56,24 Q61,12 64,25 Q50,20 36,25Z" fill="#0D0D0D"/>`;

const SPRITE_FACE = `
  <ellipse cx="50" cy="72" rx="28" ry="30" fill="#F5B887"/>
  <ellipse cx="23" cy="71" rx="5" ry="7" fill="#F5B887"/>
  <ellipse cx="77" cy="71" rx="5" ry="7" fill="#F5B887"/>
  <ellipse cx="23" cy="71" rx="3" ry="5" fill="#F0A878" opacity="0.4"/>
  <ellipse cx="77" cy="71" rx="3" ry="5" fill="#F0A878" opacity="0.4"/>`;

const SPRITE_SCAR = `
  <line x1="33" y1="76" x2="38" y2="82" stroke="#CC3333" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="38" y1="76" x2="33" y2="82" stroke="#CC3333" stroke-width="2.5" stroke-linecap="round"/>`;

const SPRITE_BODY = `
  <path d="M27,102 L21,132 L79,132 L73,102 Q61,94 50,97 Q39,94 27,102Z" fill="#CC1111"/>
  <path d="M42,102 Q50,97 58,102 L56,132 L44,132Z" fill="#111"/>
  <ellipse cx="30" cy="108" rx="4" ry="3" fill="#AA0E0E" opacity="0.6"/>
  <ellipse cx="70" cy="108" rx="4" ry="3" fill="#AA0E0E" opacity="0.6"/>`;

const EYES_NORMAL = `
  <circle cx="37" cy="66" r="8"   fill="white"/>
  <circle cx="63" cy="66" r="8"   fill="white"/>
  <circle cx="38" cy="67" r="5"   fill="#111"/>
  <circle cx="64" cy="67" r="5"   fill="#111"/>
  <circle cx="36" cy="64" r="2"   fill="white"/>
  <circle cx="62" cy="64" r="2"   fill="white"/>`;

function buildSprite(innerContent) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 135">
    ${SPRITE_HAT}
    ${SPRITE_HAIR}
    ${SPRITE_FACE}
    ${innerContent}
    ${SPRITE_BODY}
  </svg>`;
}

/* Expresión: IDLE — sonrisa confiada de Luffy */
function generarSpriteIdle() {
  return buildSprite(`
    ${EYES_NORMAL}
    ${SPRITE_SCAR}
    <path d="M30,84 Q50,102 70,84" fill="#AA0000" stroke="#111" stroke-width="1.5"/>
    <path d="M36,84 L36,90 Q50,96 64,90 L64,84" fill="white"/>
    <line x1="36" y1="87" x2="44" y2="87" stroke="#DDD" stroke-width="1"/>
    <line x1="46" y1="87" x2="54" y2="87" stroke="#DDD" stroke-width="1"/>
    <line x1="56" y1="87" x2="64" y2="87" stroke="#DDD" stroke-width="1"/>
  `);
}

/* Expresión: HUNGRY — llorando pidiendo carne */
function generarSpriteHungry() {
  return buildSprite(`
    <circle cx="37" cy="66" r="8" fill="white"/>
    <circle cx="63" cy="66" r="8" fill="white"/>
    <ellipse cx="37" cy="68" rx="5" ry="4" fill="#111"/>
    <ellipse cx="63" cy="68" rx="5" ry="4" fill="#111"/>
    ${SPRITE_SCAR}
    <path d="M31,76 Q33,84 30,90" stroke="#55AAFF" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M69,76 Q67,84 70,90" stroke="#55AAFF" stroke-width="3" fill="none" stroke-linecap="round"/>
    <ellipse cx="30" cy="91" rx="3" ry="4" fill="#55AAFF" opacity="0.8"/>
    <ellipse cx="70" cy="91" rx="3" ry="4" fill="#55AAFF" opacity="0.8"/>
    <path d="M35,88 Q50,80 65,88" stroke="#111" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <text x="50" y="116" text-anchor="middle" font-size="5.5" fill="#FF6600" font-family="sans-serif" font-weight="bold">¡CARNE!</text>
  `);
}

/* Expresión: FULL — eufórico con estrellas en los ojos */
function generarSpriteFull() {
  return buildSprite(`
    <circle cx="37" cy="66" r="8" fill="white"/>
    <circle cx="63" cy="66" r="8" fill="white"/>
    <text x="37" y="70" text-anchor="middle" font-size="11" fill="#FFD700">★</text>
    <text x="63" y="70" text-anchor="middle" font-size="11" fill="#FFD700">★</text>
    ${SPRITE_SCAR}
    <path d="M24,83 Q50,110 76,83" fill="#AA0000" stroke="#111" stroke-width="1.5"/>
    <path d="M30,83 L30,93 Q50,100 70,93 L70,83" fill="white"/>
    <ellipse cx="21" cy="78" rx="7" ry="5" fill="#FF8888" opacity="0.55"/>
    <ellipse cx="79" cy="78" rx="7" ry="5" fill="#FF8888" opacity="0.55"/>
    <text x="10" y="55" font-size="8">✨</text>
    <text x="80" y="50" font-size="8">✨</text>
  `);
}

/* Expresión: TIRED — dormido con ZZZ */
function generarSpriteTired() {
  return buildSprite(`
    <path d="M29,66 Q37,57 45,66" stroke="#111" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M55,66 Q63,57 71,66" stroke="#111" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M29,66 Q37,74 45,66" stroke="#111" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.3"/>
    <path d="M55,66 Q63,74 71,66" stroke="#111" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.3"/>
    <ellipse cx="50" cy="87" rx="9" ry="6" fill="#AA0000"/>
    <ellipse cx="50" cy="86" rx="8" ry="4" fill="#FFAAAA"/>
    <text x="72" y="56" font-size="8"  fill="#AABBFF" font-family="sans-serif" font-weight="bold">z</text>
    <text x="79" y="46" font-size="10" fill="#AABBFF" font-family="sans-serif" font-weight="bold">z</text>
    <text x="87" y="34" font-size="13" fill="#AABBFF" font-family="sans-serif" font-weight="bold">Z</text>
  `);
}

/* Expresión: HAPPY — carcajada con ojos en U */
function generarSpriteHappy() {
  return buildSprite(`
    <path d="M29,65 Q37,75 45,65" stroke="#111" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M55,65 Q63,75 71,65" stroke="#111" stroke-width="3" fill="none" stroke-linecap="round"/>
    ${SPRITE_SCAR}
    <path d="M24,82 Q50,110 76,82" fill="#AA0000" stroke="#111" stroke-width="1.5"/>
    <path d="M30,82 L30,93 Q50,100 70,93 L70,82" fill="white"/>
    <line x1="30" y1="88" x2="40" y2="88" stroke="#DDD" stroke-width="1"/>
    <line x1="42" y1="88" x2="58" y2="88" stroke="#DDD" stroke-width="1"/>
    <line x1="60" y1="88" x2="70" y2="88" stroke="#DDD" stroke-width="1"/>
    <line x1="13" y1="54" x2="21" y2="60" stroke="#FFD700" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="10" y1="65" x2="19" y2="67" stroke="#FFD700" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="87" y1="54" x2="79" y2="60" stroke="#FFD700" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="90" y1="65" x2="81" y2="67" stroke="#FFD700" stroke-width="2.5" stroke-linecap="round"/>
  `);
}

/* Expresión: DEAD — ojos en espiral, KO */
function generarSpriteDead() {
  return buildSprite(`
    <circle cx="37" cy="66" r="8" fill="white"/>
    <circle cx="63" cy="66" r="8" fill="white"/>
    <circle cx="37" cy="66" r="6" fill="none" stroke="#333" stroke-width="1.5"/>
    <circle cx="37" cy="66" r="3.5" fill="none" stroke="#333" stroke-width="1.5"/>
    <circle cx="37" cy="66" r="1.5" fill="#333"/>
    <circle cx="63" cy="66" r="6" fill="none" stroke="#333" stroke-width="1.5"/>
    <circle cx="63" cy="66" r="3.5" fill="none" stroke="#333" stroke-width="1.5"/>
    <circle cx="63" cy="66" r="1.5" fill="#333"/>
    <path d="M36,88 Q50,82 64,88" stroke="#111" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <text x="12" y="50" font-size="11" opacity="0.9">💫</text>
    <text x="74" y="46" font-size="11" opacity="0.9">💫</text>
    <text x="8"  y="72" font-size="9"  opacity="0.7">⭐</text>
    <text x="80" y="68" font-size="9"  opacity="0.7">⭐</text>
  `);
}

const SPRITES = {
  idle:    generarSpriteIdle(),
  hungry:  generarSpriteHungry(),
  full:    generarSpriteFull(),
  tired:   generarSpriteTired(),
  happy:   generarSpriteHappy(),
  dead:    generarSpriteDead(),
};

/* ──────────────────────────────────────────────
   ESTADO DE LA MASCOTA
────────────────────────────────────────────── */
let mascota = {
  nombre:           '',
  hambre:           STAT_INITIAL,
  energia:          STAT_INITIAL,
  felicidad:        STAT_INITIAL,
  viva:             true,
  diaNacimiento:    null,
};

let gameLoopId        = null;
let bubbleTimeoutId   = null;
let buttonCooldownId  = null;
let botonesEnCooldown = false;

/* ──────────────────────────────────────────────
   REFERENCIAS AL DOM
────────────────────────────────────────────── */
const screenAdopcion   = document.getElementById('screen-adoption');
const screenPrincipal  = document.getElementById('screen-main');
const screenMinijuego  = document.getElementById('screen-minigame');
const screenGameOver   = document.getElementById('screen-gameover');

const formAdopcion     = document.getElementById('form-adoption');
const inputNombre      = document.getElementById('input-pirate-name');
const errorAdopcion    = document.getElementById('adoption-error');
const btnAdoptar       = document.getElementById('btn-adopt');

const displayNombre    = document.getElementById('display-pet-name');
const displayDia       = document.getElementById('display-day');

const barHambre        = document.getElementById('bar-hunger');
const barEnergia       = document.getElementById('bar-energy');
const barFelicidad     = document.getElementById('bar-happiness');

const textoHambre      = document.getElementById('text-hunger');
const textoEnergia     = document.getElementById('text-energy');
const textoFelicidad   = document.getElementById('text-happiness');

const luffySprite      = document.getElementById('luffy-sprite');
const spriteAdopcion   = document.getElementById('sprite-adoption');
const spriteGameOver   = document.getElementById('sprite-gameover');
const burbujaDialogo   = document.getElementById('speech-bubble');

const btnAlimentar     = document.getElementById('btn-feed');
const btnJugar         = document.getElementById('btn-play');
const btnDormir        = document.getElementById('btn-sleep');
const btnReiniciar     = document.getElementById('btn-restart');

const botonesMinijuego = document.querySelectorAll('.minigame-btn');
const resultadoMinijuego      = document.getElementById('minigame-result');
const textoResultadoMinijuego = document.getElementById('minigame-result-text');
const btnVolverMinijuego      = document.getElementById('btn-minigame-back');

const mensajeGameOver  = document.getElementById('gameover-message');

/* ──────────────────────────────────────────────
   UTILIDADES
────────────────────────────────────────────── */

/** Devuelve 'valor' acotado entre min y max */
function clamp(valor, min, max) {
  return Math.max(min, Math.min(max, valor));
}

/** Devuelve una frase aleatoria del tipo indicado */
function obtenerFraseAleatoria(tipo) {
  const lista = FRASES[tipo];
  return lista[Math.floor(Math.random() * lista.length)];
}

/** Calcula cuántos días lleva viva la mascota */
function calcularDiasDeVida() {
  if (!mascota.diaNacimiento) return 1;
  const msPorDia = 1000 * 60 * 60 * 24;
  return Math.max(1, Math.floor((Date.now() - mascota.diaNacimiento) / msPorDia) + 1);
}

/* ──────────────────────────────────────────────
   SISTEMA DE SPRITES
────────────────────────────────────────────── */

/** Determina qué expresión mostrar según el estado actual */
function calcularEstadoSprite() {
  if (!mascota.viva)                                              return 'dead';
  if (mascota.energia  <= THRESHOLD_CRITICAL)                    return 'tired';
  if (mascota.hambre   <= THRESHOLD_CRITICAL)                    return 'hungry';
  if (mascota.hambre   >= THRESHOLD_FULL && mascota.felicidad >= THRESHOLD_HAPPY) return 'full';
  if (mascota.felicidad >= THRESHOLD_HAPPY)                      return 'happy';
  return 'idle';
}

/** Inyecta el SVG correcto en el contenedor de sprite */
function actualizarSpriteDOM(contenedor = luffySprite) {
  const estado = contenedor === luffySprite ? calcularEstadoSprite() : contenedor.dataset.state;
  contenedor.dataset.state = estado;
  contenedor.innerHTML = SPRITES[estado];
}

/* ──────────────────────────────────────────────
   BURBUJA DE DIÁLOGO
────────────────────────────────────────────── */

function mostrarBurbuja(mensaje) {
  if (bubbleTimeoutId) clearTimeout(bubbleTimeoutId);
  burbujaDialogo.textContent = mensaje;
  burbujaDialogo.classList.remove('hidden');
  bubbleTimeoutId = setTimeout(() => burbujaDialogo.classList.add('hidden'), BUBBLE_DURATION_MS);
}

/* ──────────────────────────────────────────────
   ACTUALIZACIÓN DEL DOM
────────────────────────────────────────────── */

function actualizarBarrasDOM() {
  barHambre.value    = mascota.hambre;
  barEnergia.value   = mascota.energia;
  barFelicidad.value = mascota.felicidad;

  textoHambre.textContent    = `${Math.round(mascota.hambre)}%`;
  textoEnergia.textContent   = `${Math.round(mascota.energia)}%`;
  textoFelicidad.textContent = `${Math.round(mascota.felicidad)}%`;

  aplicarColorCritico(barHambre,    textoHambre,    mascota.hambre);
  aplicarColorCritico(barEnergia,   textoEnergia,   mascota.energia);
  aplicarColorCritico(barFelicidad, textoFelicidad, mascota.felicidad);
}

/** Aplica clase CSS 'critico' o 'advertencia' según el valor de la stat */
function aplicarColorCritico(barra, texto, valor) {
  barra.classList.remove('critico', 'advertencia');
  texto.classList.remove('critico', 'advertencia');

  if (valor <= THRESHOLD_CRITICAL) {
    barra.classList.add('critico');
    texto.classList.add('critico');
  } else if (valor <= THRESHOLD_HAPPY) {
    barra.classList.add('advertencia');
    texto.classList.add('advertencia');
  }
}

function actualizarCabeceraDOM() {
  displayNombre.textContent = mascota.nombre;
  displayDia.textContent    = `DÍA ${calcularDiasDeVida()}`;
}

function actualizarDOM() {
  actualizarBarrasDOM();
  actualizarSpriteDOM();
  actualizarCabeceraDOM();
}

/* ──────────────────────────────────────────────
   MODIFICACIÓN DE STATS
────────────────────────────────────────────── */

/**
 * Aplica un delta a una stat de la mascota respetando los límites.
 * Devuelve el nuevo valor.
 */
function modificarStat(stat, delta) {
  mascota[stat] = clamp(mascota[stat] + delta, STAT_MIN, STAT_MAX);
  return mascota[stat];
}

/* ──────────────────────────────────────────────
   ACCIONES DEL JUGADOR
────────────────────────────────────────────── */

function activarCooldownBotones() {
  botonesEnCooldown = true;
  [btnAlimentar, btnJugar, btnDormir].forEach(btn => btn.classList.add('btn-cooldown'));
  if (buttonCooldownId) clearTimeout(buttonCooldownId);
  buttonCooldownId = setTimeout(() => {
    botonesEnCooldown = false;
    [btnAlimentar, btnJugar, btnDormir].forEach(btn => btn.classList.remove('btn-cooldown'));
  }, BUTTON_COOLDOWN_MS);
}

function alimentar() {
  if (!mascota.viva || botonesEnCooldown) return;

  if (mascota.hambre >= STAT_MAX) {
    mostrarBurbuja(obtenerFraseAleatoria('toofull'));
    return;
  }

  modificarStat('hambre',    GAIN_HUNGER_FEED);
  modificarStat('felicidad', GAIN_HAPPINESS_FEED);
  modificarStat('energia',   -COST_ENERGY_FEED);

  activarCooldownBotones();
  mostrarBurbuja(obtenerFraseAleatoria('feed'));
  actualizarDOM();
  guardarEnStorage();
}

function abrirMinijuego() {
  if (!mascota.viva || botonesEnCooldown) return;
  if (mascota.energia <= THRESHOLD_CRITICAL) {
    mostrarBurbuja(obtenerFraseAleatoria('tired_play'));
    return;
  }
  mostrarPantalla(document.getElementById('screen-minigame-select'));
}

function lanzarMinijuego(tipo) {
  if (tipo === 'ppt') {
    resultadoMinijuego.classList.add('hidden');
    mostrarPantalla(screenMinijuego);
  } else if (tipo === 'tormenta') {
    mostrarPantalla(screenTormenta);
    iniciarTormenta();
  } else if (tipo === 'sniper') {
    mostrarPantalla(screenSniper);
    iniciarSniper();
  } else if (tipo === 'tesoro') {
    mostrarPantalla(screenTesoro);
    iniciarTesoro();
  }
}

function dormir() {
  if (!mascota.viva || botonesEnCooldown) return;

  if (mascota.energia >= STAT_MAX) {
    mostrarBurbuja(obtenerFraseAleatoria('already_max_energy'));
    return;
  }

  modificarStat('energia',   GAIN_ENERGY_SLEEP);
  modificarStat('felicidad', -COST_HAPPINESS_SLEEP);

  activarCooldownBotones();
  mostrarBurbuja(obtenerFraseAleatoria('sleep'));
  actualizarDOM();
  guardarEnStorage();
}

/* ──────────────────────────────────────────────
   MINIJUEGO — Piedra, Papel, Tijeras
────────────────────────────────────────────── */

const OPCIONES_MINIJUEGO  = ['piedra', 'papel', 'tijeras'];

const TABLA_GANADORA = {
  piedra:  'tijeras',
  papel:   'piedra',
  tijeras: 'papel',
};

const EMOJIS_OPCIONES = {
  piedra:  '✊',
  papel:   '✋',
  tijeras: '✌️',
};

function resolverMinijuego(eleccionJugador) {
  const eleccionLuffy = OPCIONES_MINIJUEGO[Math.floor(Math.random() * OPCIONES_MINIJUEGO.length)];
  const jugadorGana   = TABLA_GANADORA[eleccionJugador] === eleccionLuffy;
  const empate        = eleccionJugador === eleccionLuffy;

  aplicarResultadoMinijuego(jugadorGana, empate);
  mostrarResultadoMinijuego(eleccionJugador, eleccionLuffy, jugadorGana, empate);
}

function aplicarResultadoMinijuego(jugadorGana, empate) {
  modificarStat('energia',   -COST_ENERGY_PLAY);
  modificarStat('hambre',    -COST_HUNGER_PLAY);

  if (jugadorGana) {
    modificarStat('felicidad', MINIGAME_WIN_HAPPINESS);
    modificarStat('energia',   MINIGAME_WIN_ENERGY);
  } else if (!empate) {
    modificarStat('felicidad', -MINIGAME_LOSE_HAPPINESS);
  }

  guardarEnStorage();
}

function mostrarResultadoMinijuego(eleccionJugador, eleccionLuffy, jugadorGana, empate) {
  const emojiJugador = EMOJIS_OPCIONES[eleccionJugador];
  const emojiLuffy   = EMOJIS_OPCIONES[eleccionLuffy];

  let resultado;
  if (empate)       resultado = '¡EMPATE! 🤝';
  else if (jugadorGana) resultado = '¡GANASTE! 🏆 +Felicidad +Energía';
  else              resultado = '¡PERDISTE! 😤 -Felicidad';

  textoResultadoMinijuego.innerHTML =
    `Tú: ${emojiJugador} vs Luffy: ${emojiLuffy}<br>${resultado}`;

  resultadoMinijuego.classList.remove('hidden');
}

/* ──────────────────────────────────────────────
   GAME LOOP
────────────────────────────────────────────── */

function tick() {
  modificarStat('hambre',    -DECAY_HUNGER);
  modificarStat('energia',   -DECAY_ENERGY);
  modificarStat('felicidad', -DECAY_HAPPINESS);

  verificarMuerte();

  if (mascota.viva) {
    actualizarDOM();
    guardarEnStorage();
    emitirAlertas();
  }
}

function emitirAlertas() {
  if (mascota.hambre   <= THRESHOLD_CRITICAL) mostrarBurbuja(obtenerFraseAleatoria('hungry'));
  else if (mascota.energia   <= THRESHOLD_CRITICAL) mostrarBurbuja(obtenerFraseAleatoria('tired'));
}

function verificarMuerte() {
  const sinVida = mascota.hambre   <= STAT_MIN
               && mascota.energia  <= STAT_MIN
               && mascota.felicidad <= STAT_MIN;

  if (sinVida) {
    mascota.viva = false;
    detenerGameLoop();
    guardarEnStorage();
    mostrarGameOver();
  }
}

function iniciarGameLoop() {
  if (gameLoopId) clearInterval(gameLoopId);
  gameLoopId = setInterval(tick, LOOP_INTERVAL_MS);
}

function detenerGameLoop() {
  clearInterval(gameLoopId);
  gameLoopId = null;
}

/* ──────────────────────────────────────────────
   GESTIÓN DE PANTALLAS
────────────────────────────────────────────── */

function mostrarPantalla(pantalla) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  pantalla.classList.remove('hidden');
}

function iniciarPartida() {
  actualizarDOM();
  mostrarPantalla(screenPrincipal);
  iniciarGameLoop();
}

function calcularCausaMuerte() {
  if (mascota.hambre <= STAT_MIN)    return 'murió de hambre... ¡sin carne! 🍖';
  if (mascota.energia <= STAT_MIN)   return 'se quedó sin energía... ¡necesitaba dormir! 💤';
  if (mascota.felicidad <= STAT_MIN) return 'perdió la ilusión de ser Rey Pirata... 💔';
  return 'no pudo aguantar más...';
}

function mostrarGameOver() {
  actualizarSpriteDOM(spriteGameOver);
  mensajeGameOver.textContent =
    `¡${mascota.nombre} ${calcularCausaMuerte()} Los sueños piratas se posponen...`;
  mostrarPantalla(screenGameOver);
}

/* ──────────────────────────────────────────────
   ADOPCIÓN
────────────────────────────────────────────── */

function manejarAdopcion(evento) {
  evento.preventDefault();
  const nombre = inputNombre.value.trim();

  if (!nombre) {
    errorAdopcion.classList.remove('hidden');
    inputNombre.focus();
    return;
  }

  errorAdopcion.classList.add('hidden');
  inicializarMascota(nombre);
  guardarEnStorage();
  iniciarPartida();
}

function inicializarMascota(nombre) {
  mascota = {
    nombre,
    hambre:        STAT_INITIAL,
    energia:       STAT_INITIAL,
    felicidad:     STAT_INITIAL,
    viva:          true,
    diaNacimiento: Date.now(),
  };
}

/* ──────────────────────────────────────────────
   REINICIO
────────────────────────────────────────────── */

function reiniciarPartida() {
  detenerGameLoop();
  localStorage.removeItem(STORAGE_KEY);
  inputNombre.value = '';
  errorAdopcion.classList.add('hidden');
  mostrarPantalla(screenAdopcion);
}

/* ──────────────────────────────────────────────
   PERSISTENCIA — localStorage
────────────────────────────────────────────── */

function guardarEnStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mascota));
  localStorage.setItem(STORAGE_KEY_TIMESTAMP, Date.now().toString());
}

function cargarDeStorage() {
  const datos = localStorage.getItem(STORAGE_KEY);
  if (!datos) return false;

  try {
    mascota = JSON.parse(datos);
    aplicarDecayOffline();
    return true;
  } catch {
    return false;
  }
}

/** Calcula cuántos ticks pasaron mientras el juego estaba cerrado y aplica el decay */
function aplicarDecayOffline() {
  const timestampGuardado = parseInt(localStorage.getItem(STORAGE_KEY_TIMESTAMP), 10);
  if (!timestampGuardado || !mascota.viva) return;

  const msPasados    = Date.now() - timestampGuardado;
  const ticksPasados = Math.floor(msPasados / MS_POR_TICK_OFFLINE);

  if (ticksPasados <= 0) return;

  mascota.hambre    = clamp(mascota.hambre    - DECAY_HUNGER    * ticksPasados, STAT_MIN, STAT_MAX);
  mascota.energia   = clamp(mascota.energia   - DECAY_ENERGY    * ticksPasados, STAT_MIN, STAT_MAX);
  mascota.felicidad = clamp(mascota.felicidad - DECAY_HAPPINESS * ticksPasados, STAT_MIN, STAT_MAX);

  verificarMuerte();
}

/* ══════════════════════════════════════════════
   MINIJUEGO: ESQUIVA LA TORMENTA
══════════════════════════════════════════════ */
const TORMENTA_DURACION_MS         = 15000;
const TORMENTA_VIDAS_INICIAL       = 3;
const TORMENTA_INTERVALO_OBS_MS    = 1100;
const TORMENTA_VELOCIDAD_PX        = 2.5;
const TORMENTA_GANANCIA_HAMBRE     = 15;
const TORMENTA_GANANCIA_FELICIDAD  = 20;
const TORMENTA_GANANCIA_ENERGIA    = 10;
const TORMENTA_PENALIZACION        = 8;

const screenTormenta       = document.getElementById('screen-tormenta');
const tormentaArea         = document.getElementById('tormenta-area');
const tormentaBarco        = document.getElementById('tormenta-barco');
const tormentaVidasEl      = document.getElementById('tormenta-vidas');
const tormentaTimerEl      = document.getElementById('tormenta-timer');
const tormentaResultado    = document.getElementById('tormenta-resultado');
const tormentaResultadoTxt = document.getElementById('tormenta-resultado-texto');
const btnTormentaBack      = document.getElementById('btn-tormenta-back');

let tormentaVidas        = TORMENTA_VIDAS_INICIAL;
let tormentaAnimId       = null;
let tormentaTimerId      = null;
let tormentaObsId        = null;
let tormentaObstaculos   = [];
let tormentaBarcoY       = 90;
let tormentaSegundos     = TORMENTA_DURACION_MS / 1000;
let tormentaActiva       = false;

function iniciarTormenta() {
  tormentaVidas      = TORMENTA_VIDAS_INICIAL;
  tormentaObstaculos = [];
  tormentaBarcoY     = 90;
  tormentaSegundos   = TORMENTA_DURACION_MS / 1000;
  tormentaActiva     = true;

  tormentaArea.querySelectorAll('.tormenta-obstaculo').forEach(o => o.remove());
  tormentaResultado.classList.add('hidden');
  tormentaBarco.style.top = `${tormentaBarcoY}px`;
  actualizarVidasTormenta();
  actualizarTimerTormenta();

  tormentaArea.addEventListener('mousemove', moverBarcoPorMouse);

  tormentaObsId = setInterval(crearObstaculo, TORMENTA_INTERVALO_OBS_MS);
  tormentaTimerId = setInterval(() => {
    tormentaSegundos--;
    actualizarTimerTormenta();
    if (tormentaSegundos <= 0) terminarTormenta(true);
  }, 1000);

  tormentaAnimId = requestAnimationFrame(tickTormenta);
}

function moverBarcoPorMouse(evento) {
  const rect = tormentaArea.getBoundingClientRect();
  const yRelativa = evento.clientY - rect.top - 20;
  tormentaBarcoY  = Math.max(0, Math.min(rect.height - 40, yRelativa));
  tormentaBarco.style.top = `${tormentaBarcoY}px`;
}

function crearObstaculo() {
  if (!tormentaActiva) return;
  const emojis   = ['🌊', '🪨', '🌪️', '⚡'];
  const emoji    = emojis[Math.floor(Math.random() * emojis.length)];
  const alturaMax = tormentaArea.clientHeight - 40;
  const yPos     = Math.floor(Math.random() * alturaMax);

  const div = document.createElement('div');
  div.className   = 'tormenta-obstaculo';
  div.textContent = emoji;
  div.style.left  = `${tormentaArea.clientWidth}px`;
  div.style.top   = `${yPos}px`;
  tormentaArea.appendChild(div);
  tormentaObstaculos.push(div);
}

function tickTormenta() {
  if (!tormentaActiva) return;

  tormentaObstaculos = tormentaObstaculos.filter(obs => {
    const xActual = parseFloat(obs.style.left);
    const xNuevo  = xActual - TORMENTA_VELOCIDAD_PX;
    obs.style.left = `${xNuevo}px`;

    if (detectarColision(tormentaBarco, obs)) {
      obs.remove();
      registrarGolpeTormenta();
      return false;
    }
    if (xNuevo < -50) { obs.remove(); return false; }
    return true;
  });

  tormentaAnimId = requestAnimationFrame(tickTormenta);
}

function detectarColision(a, b) {
  const ra = a.getBoundingClientRect();
  const rb = b.getBoundingClientRect();
  const margen = 10;
  return !(ra.right  - margen < rb.left  + margen ||
           ra.left   + margen > rb.right - margen ||
           ra.bottom - margen < rb.top   + margen ||
           ra.top    + margen > rb.bottom - margen);
}

function registrarGolpeTormenta() {
  tormentaVidas--;
  actualizarVidasTormenta();
  tormentaBarco.style.filter = 'brightness(3)';
  setTimeout(() => { tormentaBarco.style.filter = ''; }, 300);
  if (tormentaVidas <= 0) terminarTormenta(false);
}

function actualizarVidasTormenta() {
  const corazones = '❤️'.repeat(tormentaVidas) + '🖤'.repeat(TORMENTA_VIDAS_INICIAL - tormentaVidas);
  tormentaVidasEl.textContent = corazones;
}

function actualizarTimerTormenta() {
  tormentaTimerEl.textContent = `${tormentaSegundos}s`;
}

function terminarTormenta(gano) {
  tormentaActiva = false;
  cancelAnimationFrame(tormentaAnimId);
  clearInterval(tormentaTimerId);
  clearInterval(tormentaObsId);
  tormentaArea.removeEventListener('mousemove', moverBarcoPorMouse);

  if (gano) {
    modificarStat('hambre',    TORMENTA_GANANCIA_HAMBRE);
    modificarStat('felicidad', TORMENTA_GANANCIA_FELICIDAD);
    modificarStat('energia',   TORMENTA_GANANCIA_ENERGIA);
    tormentaResultadoTxt.textContent = '¡SOBREVIVISTE! 🏆 +Hambre +Felicidad +Energía';
  } else {
    modificarStat('felicidad', -TORMENTA_PENALIZACION);
    tormentaResultadoTxt.textContent = '¡El mar te venció! 🌊 -Felicidad';
  }
  guardarEnStorage();
  tormentaResultado.classList.remove('hidden');
}

/* ══════════════════════════════════════════════
   MINIJUEGO: GOMU GOMU SNIPER
══════════════════════════════════════════════ */
const SNIPER_DISPAROS_TOTAL    = 3;
const SNIPER_VELOCIDAD_MS      = 12;
const SNIPER_PUNTOS_BUENO      = 10;
const SNIPER_PUNTOS_BIEN       = 20;
const SNIPER_PUNTOS_GOMU       = 50;
const SNIPER_CONVERSION_STAT   = 0.3;

const screenSniper         = document.getElementById('screen-sniper');
const sniperAguja          = document.getElementById('sniper-aguja');
const sniperPuntosEl       = document.getElementById('sniper-puntos');
const sniperDisparosEl     = document.getElementById('sniper-disparos');
const btnSniperDisparar    = document.getElementById('btn-sniper-disparar');
const sniperResultado      = document.getElementById('sniper-resultado');
const sniperResultadoTxt   = document.getElementById('sniper-resultado-texto');
const btnSniperBack        = document.getElementById('btn-sniper-back');

let sniperPosicion     = 0;
let sniperDireccion    = 1;
let sniperAnimId       = null;
let sniperDisparos     = SNIPER_DISPAROS_TOTAL;
let sniperPuntosTotales = 0;
let sniperActiva       = false;

function iniciarSniper() {
  sniperPosicion      = 0;
  sniperDireccion     = 1;
  sniperDisparos      = SNIPER_DISPAROS_TOTAL;
  sniperPuntosTotales = 0;
  sniperActiva        = true;

  sniperResultado.classList.add('hidden');
  btnSniperDisparar.disabled = false;
  actualizarInfoSniper();
  animarAgujaSniper();
}

function animarAgujaSniper() {
  sniperPosicion += sniperDireccion * 1.2;
  if (sniperPosicion >= 100) { sniperPosicion = 100; sniperDireccion = -1; }
  if (sniperPosicion <= 0)   { sniperPosicion = 0;   sniperDireccion =  1; }
  sniperAguja.style.left = `${sniperPosicion}%`;
  if (sniperActiva) sniperAnimId = setTimeout(animarAgujaSniper, SNIPER_VELOCIDAD_MS);
}

function dispararSniper() {
  if (!sniperActiva || sniperDisparos <= 0) return;

  const pos    = sniperPosicion;
  let puntos   = 0;

  // Zonas: miss 0-20%, bueno 20-45%, bien 45-75%, gomu 75-100%
  if      (pos >= 75) puntos = SNIPER_PUNTOS_GOMU;
  else if (pos >= 45) puntos = SNIPER_PUNTOS_BIEN;
  else if (pos >= 20) puntos = SNIPER_PUNTOS_BUENO;

  sniperPuntosTotales += puntos;
  sniperDisparos--;
  actualizarInfoSniper();

  if (sniperDisparos <= 0) terminarSniper();
}

function actualizarInfoSniper() {
  sniperPuntosEl.textContent   = `Puntos: ${sniperPuntosTotales}`;
  sniperDisparosEl.textContent = `Disparos: ${'●'.repeat(sniperDisparos)}${'○'.repeat(SNIPER_DISPAROS_TOTAL - sniperDisparos)}`;
}

function terminarSniper() {
  sniperActiva = false;
  clearTimeout(sniperAnimId);
  btnSniperDisparar.disabled = true;

  const gananciaFelicidad = Math.round(sniperPuntosTotales * SNIPER_CONVERSION_STAT);
  const gananciaEnergia   = Math.round(gananciaFelicidad / 2);

  modificarStat('felicidad', gananciaFelicidad);
  modificarStat('energia',   gananciaEnergia);
  guardarEnStorage();

  let emoji = sniperPuntosTotales >= 100 ? '🏆' : sniperPuntosTotales >= 50 ? '⭐' : '👊';
  sniperResultadoTxt.textContent =
    `${emoji} ${sniperPuntosTotales} puntos → +${gananciaFelicidad} Felicidad +${gananciaEnergia} Energía`;
  sniperResultado.classList.remove('hidden');
}

/* ══════════════════════════════════════════════
   MINIJUEGO: MAPA DEL TESORO
══════════════════════════════════════════════ */
const TESORO_FILAS             = 4;
const TESORO_COLUMNAS          = 4;
const TESORO_INTENTOS_MAX      = 5;
const TESORO_GANANCIA_STATS    = 30;
const TESORO_PENALIZACION      = 10;

const screenTesoro         = document.getElementById('screen-tesoro');
const teseroGrid           = document.getElementById('tesoro-grid');
const tesoroPista          = document.getElementById('tesoro-pista');
const teseroIntentosEl     = document.getElementById('tesoro-intentos');
const teseroResultado      = document.getElementById('tesoro-resultado');
const teseroResultadoTxt   = document.getElementById('tesoro-resultado-texto');
const btnTesoroBack        = document.getElementById('btn-tesoro-back');

let teseroPosTesoro   = 0;
let teseroIntentos    = TESORO_INTENTOS_MAX;
let teseroTerminado   = false;

function iniciarTesoro() {
  teseroPosTesoro = Math.floor(Math.random() * (TESORO_FILAS * TESORO_COLUMNAS));
  teseroIntentos  = TESORO_INTENTOS_MAX;
  teseroTerminado = false;

  tesoroPista.textContent = '¡Encuentra la Fruta del Diablo! 🍎';
  teseroResultado.classList.add('hidden');
  actualizarIntentosTesoro();
  renderizarGridTesoro();
}

function renderizarGridTesoro() {
  teseroGrid.innerHTML = '';
  const total = TESORO_FILAS * TESORO_COLUMNAS;
  for (let i = 0; i < total; i++) {
    const celda = document.createElement('button');
    celda.className = 'tesoro-celda';
    celda.textContent = '📦';
    celda.setAttribute('aria-label', `Cofre ${i + 1}`);
    celda.addEventListener('click', () => excavarTesoro(i, celda));
    teseroGrid.appendChild(celda);
  }
}

function excavarTesoro(indice, celda) {
  if (teseroTerminado || celda.classList.contains('tesoro-celda--abierta')) return;

  celda.classList.add('tesoro-celda--abierta');
  teseroIntentos--;
  actualizarIntentosTesoro();

  if (indice === teseroPosTesoro) {
    celda.textContent = '🍎';
    celda.classList.add('tesoro-celda--ganadora');
    terminarTesoro(true);
    return;
  }

  celda.textContent = '💨';
  const pista = calcularPistaTesoro(indice);
  tesoroPista.textContent = pista;

  if (teseroIntentos <= 0) terminarTesoro(false);
}

function calcularPistaTesoro(indice) {
  const filaTesoro  = Math.floor(teseroPosTesoro / TESORO_COLUMNAS);
  const colTesoro   = teseroPosTesoro % TESORO_COLUMNAS;
  const filaActual  = Math.floor(indice / TESORO_COLUMNAS);
  const colActual   = indice % TESORO_COLUMNAS;
  const distancia   = Math.abs(filaTesoro - filaActual) + Math.abs(colTesoro - colActual);

  if (distancia === 0) return '🍎 ¡LA FRUTA DEL DIABLO!';
  if (distancia === 1) return '🔥 ¡ARDIENDO! ¡Muy cerca!';
  if (distancia === 2) return '♨️ ¡Caliente!';
  if (distancia === 3) return '🌡️ Tibio...';
  if (distancia <= 5)  return '❄️ Frío';
  return '🧊 ¡Congelado! Muy lejos';
}

function actualizarIntentosTesoro() {
  teseroIntentosEl.textContent =
    `Intentos: ${'●'.repeat(teseroIntentos)}${'○'.repeat(TESORO_INTENTOS_MAX - teseroIntentos)}`;
}

function terminarTesoro(gano) {
  teseroTerminado = true;

  if (gano) {
    modificarStat('hambre',    TESORO_GANANCIA_STATS);
    modificarStat('felicidad', TESORO_GANANCIA_STATS);
    modificarStat('energia',   TESORO_GANANCIA_STATS);
    teseroResultadoTxt.textContent = '¡ENCONTRASTE LA FRUTA! 🍎🏆 +Todo al máximo!';
  } else {
    modificarStat('felicidad', -TESORO_PENALIZACION);
    const celdas = teseroGrid.querySelectorAll('.tesoro-celda');
    celdas[teseroPosTesoro].textContent = '🍎';
    celdas[teseroPosTesoro].classList.add('tesoro-celda--ganadora');
    teseroResultadoTxt.textContent = '¡Se acabaron los intentos! 😢 -Felicidad';
  }

  guardarEnStorage();
  teseroResultado.classList.remove('hidden');
}

/* ──────────────────────────────────────────────
   INICIALIZACIÓN — Event Listeners y arranque
────────────────────────────────────────────── */

function registrarEventos() {
  formAdopcion.addEventListener('submit', manejarAdopcion);

  btnAlimentar.addEventListener('click', alimentar);
  btnJugar.addEventListener('click', abrirMinijuego);
  btnDormir.addEventListener('click', dormir);
  btnReiniciar.addEventListener('click', reiniciarPartida);

  // Selección de minijuego
  const screenMinijuegoSelect = document.getElementById('screen-minigame-select');
  document.querySelectorAll('.mg-select-btn').forEach(btn => {
    btn.addEventListener('click', () => lanzarMinijuego(btn.dataset.game));
  });
  document.getElementById('btn-select-back').addEventListener('click', () => {
    actualizarDOM();
    mostrarPantalla(screenPrincipal);
  });

  // PPT
  botonesMinijuego.forEach((btn) => {
    btn.addEventListener('click', () => resolverMinijuego(btn.dataset.choice));
  });
  btnVolverMinijuego.addEventListener('click', () => {
    actualizarDOM();
    mostrarPantalla(screenPrincipal);
  });

  // Tormenta
  btnTormentaBack.addEventListener('click', () => {
    terminarTormentaForzado();
    actualizarDOM();
    mostrarPantalla(screenPrincipal);
  });

  // Sniper
  btnSniperDisparar.addEventListener('click', dispararSniper);
  btnSniperBack.addEventListener('click', () => {
    sniperActiva = false;
    clearTimeout(sniperAnimId);
    actualizarDOM();
    mostrarPantalla(screenPrincipal);
  });

  // Tesoro
  btnTesoroBack.addEventListener('click', () => {
    actualizarDOM();
    mostrarPantalla(screenPrincipal);
  });
}

function terminarTormentaForzado() {
  tormentaActiva = false;
  cancelAnimationFrame(tormentaAnimId);
  clearInterval(tormentaTimerId);
  clearInterval(tormentaObsId);
  tormentaArea.removeEventListener('mousemove', moverBarcoPorMouse);
}

function init() {
  // Renderiza sprite en pantalla de adopción
  spriteAdopcion.dataset.state = 'idle';
  spriteAdopcion.innerHTML = SPRITES.idle;

  registrarEventos();

  const haySaveGuardado = cargarDeStorage();

  if (haySaveGuardado) {
    if (mascota.viva) {
      iniciarPartida();
    } else {
      mostrarGameOver();
    }
  }
  // Si no hay save: la pantalla de adopción ya está activa por defecto (class="screen active")
}

init();
