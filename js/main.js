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
const LOOP_INTERVAL_MS    = 4000; // tick cada 4 segundos
const BUBBLE_DURATION_MS  = 2500; // burbuja visible 2.5s
const BUTTON_COOLDOWN_MS  = 1000; // evita spam de botones

// Persistencia
const STORAGE_KEY         = 'luffy_gotchi_save';

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
  <ellipse cx="50" cy="26" rx="46" ry="9" fill="#C8971E"/>
  <path d="M18,26 Q16,6 50,6 Q84,6 82,26Z" fill="#DBA820"/>
  <rect x="14" y="23" width="72" height="6" rx="2" fill="#CC1111"/>`;

const SPRITE_HAIR = `
  <path d="M22,50 Q18,36 24,30 Q30,26 38,28" fill="#111111"/>
  <path d="M78,50 Q82,36 76,30 Q70,26 62,28" fill="#111111"/>
  <path d="M38,28 Q41,17 46,26 Q48,13 50,26 Q52,13 54,26 Q59,17 62,28 Q50,23 38,28Z" fill="#111111"/>`;

const SPRITE_FACE = `
  <ellipse cx="50" cy="73" rx="27" ry="28" fill="#F5B887"/>
  <ellipse cx="24" cy="72" rx="4" ry="6"  fill="#F5B887"/>
  <ellipse cx="76" cy="72" rx="4" ry="6"  fill="#F5B887"/>`;

const SPRITE_SCAR = `
  <line x1="34" y1="76" x2="38" y2="80" stroke="#E55555" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="38" y1="76" x2="34" y2="80" stroke="#E55555" stroke-width="2.5" stroke-linecap="round"/>`;

const SPRITE_BODY = `
  <path d="M29,101 L24,130 L76,130 L71,101 Q60,95 50,97 Q40,95 29,101Z" fill="#CC1111"/>
  <path d="M43,101 Q50,97 57,101 L55,130 L45,130Z" fill="#1a1a1a"/>`;

// Ojos estándar (abiertos, contentos)
const EYES_NORMAL = `
  <circle cx="38" cy="67" r="7"   fill="white"/>
  <circle cx="62" cy="67" r="7"   fill="white"/>
  <circle cx="39" cy="68" r="4.5" fill="#111"/>
  <circle cx="63" cy="68" r="4.5" fill="#111"/>
  <circle cx="40" cy="66" r="1.5" fill="white"/>
  <circle cx="64" cy="66" r="1.5" fill="white"/>`;

function buildSprite(innerContent) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 135">
    ${SPRITE_HAT}
    ${SPRITE_HAIR}
    ${SPRITE_FACE}
    ${innerContent}
    ${SPRITE_BODY}
  </svg>`;
}

/* Expresión: IDLE — sonrisa tranquila */
function generarSpriteIdle() {
  return buildSprite(`
    ${EYES_NORMAL}
    ${SPRITE_SCAR}
    <path d="M31,83 Q50,100 69,83" fill="#B80000" stroke="#111" stroke-width="1.5"/>
    <path d="M37,83 L37,88 Q50,93 63,88 L63,83" fill="white"/>
  `);
}

/* Expresión: HUNGRY — triste con lágrimas */
function generarSpriteHungry() {
  return buildSprite(`
    <circle cx="38" cy="67" r="7"   fill="white"/>
    <circle cx="62" cy="67" r="7"   fill="white"/>
    <ellipse cx="38" cy="69" rx="4.5" ry="3.5" fill="#111"/>
    <ellipse cx="62" cy="69" rx="4.5" ry="3.5" fill="#111"/>
    ${SPRITE_SCAR}
    <!-- Lágrimas -->
    <ellipse cx="32" cy="76" rx="2.5" ry="4" fill="#88CCFF" opacity="0.9"/>
    <ellipse cx="68" cy="76" rx="2.5" ry="4" fill="#88CCFF" opacity="0.9"/>
    <!-- Boca triste -->
    <path d="M33,88 Q50,80 67,88" stroke="#111" stroke-width="2" fill="none" stroke-linecap="round"/>
    <!-- Texto hambre -->
    <text x="50" y="110" text-anchor="middle" font-size="5" fill="#FF6B35" font-family="sans-serif">¡CARNE!</text>
  `);
}

/* Expresión: FULL — megacontento tras comer */
function generarSpriteFull() {
  return buildSprite(`
    <!-- Ojos estrella / felices -->
    <circle cx="38" cy="67" r="7"   fill="white"/>
    <circle cx="62" cy="67" r="7"   fill="white"/>
    <!-- Estrellas en los ojos -->
    <text x="38" y="71" text-anchor="middle" font-size="9" fill="#FFD700">★</text>
    <text x="62" y="71" text-anchor="middle" font-size="9" fill="#FFD700">★</text>
    ${SPRITE_SCAR}
    <!-- Sonrisa enorme -->
    <path d="M26,82 Q50,106 74,82" fill="#B80000" stroke="#111" stroke-width="1.5"/>
    <path d="M32,82 L32,90 Q50,97 68,90 L68,82" fill="white"/>
    <!-- Rubor en mejillas -->
    <ellipse cx="22" cy="78" rx="6" ry="4" fill="#FF9999" opacity="0.5"/>
    <ellipse cx="78" cy="78" rx="6" ry="4" fill="#FF9999" opacity="0.5"/>
  `);
}

/* Expresión: TIRED — cansado, dormido */
function generarSpriteTired() {
  return buildSprite(`
    <!-- Ojos cerrados curva -->
    <path d="M31,67 Q38,60 45,67" stroke="#111" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M55,67 Q62,60 69,67" stroke="#111" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <!-- Boca entreabierta -->
    <ellipse cx="50" cy="86" rx="8" ry="5" fill="#B80000"/>
    <ellipse cx="50" cy="85" rx="7" ry="3" fill="#FF9999"/>
    <!-- ZZZ -->
    <text x="74" y="52" font-size="7" fill="#88AAFF" font-family="sans-serif" font-weight="bold">z</text>
    <text x="80" y="44" font-size="9" fill="#88AAFF" font-family="sans-serif" font-weight="bold">z</text>
    <text x="87" y="35" font-size="11" fill="#88AAFF" font-family="sans-serif" font-weight="bold">Z</text>
  `);
}

/* Expresión: HAPPY — carcajada */
function generarSpriteHappy() {
  return buildSprite(`
    <!-- Ojos cerrados riendo -->
    <path d="M31,66 Q38,72 45,66" stroke="#111" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M55,66 Q62,72 69,66" stroke="#111" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    ${SPRITE_SCAR}
    <!-- Boca abierta riendo -->
    <path d="M26,80 Q50,105 74,80" fill="#B80000" stroke="#111" stroke-width="1.5"/>
    <path d="M32,80 L32,90 Q50,97 68,90 L68,80" fill="white"/>
    <!-- Líneas de energía -->
    <line x1="15" y1="55" x2="22" y2="60" stroke="#FFD700" stroke-width="2" stroke-linecap="round"/>
    <line x1="12" y1="65" x2="20" y2="67" stroke="#FFD700" stroke-width="2" stroke-linecap="round"/>
    <line x1="85" y1="55" x2="78" y2="60" stroke="#FFD700" stroke-width="2" stroke-linecap="round"/>
    <line x1="88" y1="65" x2="80" y2="67" stroke="#FFD700" stroke-width="2" stroke-linecap="round"/>
  `);
}

/* Expresión: DEAD — KO, ojos en espiral */
function generarSpriteDead() {
  return buildSprite(`
    <!-- Ojos en espiral (KO) -->
    <circle cx="38" cy="67" r="7" fill="white"/>
    <circle cx="62" cy="67" r="7" fill="white"/>
    <path d="M38,67 m-4,0 a4,4 0 1,0 8,0 a2,2 0 1,1 -4,0" stroke="#111" stroke-width="1.5" fill="none"/>
    <path d="M62,67 m-4,0 a4,4 0 1,0 8,0 a2,2 0 1,1 -4,0" stroke="#111" stroke-width="1.5" fill="none"/>
    <!-- Boca triste -->
    <path d="M35,88 Q50,82 65,88" stroke="#111" stroke-width="2" fill="none" stroke-linecap="round"/>
    <!-- Estrellas KO alrededor -->
    <text x="18" y="50" font-size="10" opacity="0.8">⭐</text>
    <text x="72" y="45" font-size="10" opacity="0.8">⭐</text>
    <text x="12" y="75" font-size="8"  opacity="0.6">✦</text>
    <text x="80" y="70" font-size="8"  opacity="0.6">✦</text>
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

  resultadoMinijuego.classList.add('hidden');
  mostrarPantalla(screenMinijuego);
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
  [screenAdopcion, screenPrincipal, screenMinijuego, screenGameOver].forEach(
    (s) => s.classList.add('hidden')
  );
  pantalla.classList.remove('hidden');
}

function iniciarPartida() {
  actualizarDOM();
  mostrarPantalla(screenPrincipal);
  iniciarGameLoop();
}

function mostrarGameOver() {
  actualizarSpriteDOM(spriteGameOver);
  mensajeGameOver.textContent =
    `¡${mascota.nombre} se ha quedado sin fuerzas! Los sueños piratas se posponen...`;
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
}

function cargarDeStorage() {
  const datos = localStorage.getItem(STORAGE_KEY);
  if (!datos) return false;

  try {
    mascota = JSON.parse(datos);
    return true;
  } catch {
    return false;
  }
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

  botonesMinijuego.forEach((btn) => {
    btn.addEventListener('click', () => resolverMinijuego(btn.dataset.choice));
  });

  btnVolverMinijuego.addEventListener('click', () => {
    actualizarDOM();
    mostrarPantalla(screenPrincipal);
  });
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
