import { $ } from "../dom.js";

/**
 * Chuva de números binários no fundo do site, sutil e contínua.
 * Fica forte no topo e some aos poucos a partir da metade da página (pela rolagem).
 * Um único <canvas> do tamanho da tela, a 30 quadros por segundo, que para de desenhar
 * quando está invisível, com a aba em segundo plano ou para quem pediu menos movimento.
 */

const FONT_SIZE = 14;
const LINE_HEIGHT = 18;
const COLUMN_GAP = 26;
const FPS = 30;
const MIN_SPEED = 35; // px por segundo
const MAX_SPEED = 95;
const MIN_LENGTH = 6; // dígitos por coluna
const MAX_LENGTH = 18;
const HEAD_ALPHA = 0.34; // primeiro dígito, o "mais aceso"
const TAIL_ALPHA = 0.16; // o rastro vai apagando até zero
const FLIP_CHANCE = 0.03; // chance por quadro de um dígito trocar entre 0 e 1
const FADE_START = 0.5; // fração da rolagem em que começa a sumir
const FADE_END = 0.85; // fração da rolagem em que some de vez
const MAX_PIXEL_RATIO = 2;

const randomBit = () => (Math.random() < 0.5 ? "0" : "1");
const randomBetween = (min, max) => min + Math.random() * (max - min);
const clamp01 = (value) => Math.min(1, Math.max(0, value));

export function initBinaryRain() {
    const canvas = $("#binaryRain");
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        canvas.remove();
        return;
    }

    const context = canvas.getContext("2d");
    const root = document.documentElement;
    let columns = [];
    let width = 0;
    let height = 0;
    let color = "";
    let strength = 1;
    let frame = 0;
    let lastTime = 0;

    // Cor e intensidade vêm do CSS (--rain-rgb e --rain-strength), então seguem o tema
    function readTheme() {
        const styles = getComputedStyle(root);
        color = `rgb(${styles.getPropertyValue("--rain-rgb").trim()})`;
        strength = Number(styles.getPropertyValue("--rain-strength")) || 1;
    }

    function createColumn(x, spreadOverScreen) {
        const length = Math.round(randomBetween(MIN_LENGTH, MAX_LENGTH));
        return {
            x,
            // Na primeira pintura as colunas já aparecem espalhadas; depois nascem acima da tela
            y: spreadOverScreen ? randomBetween(0, height + length * LINE_HEIGHT) : -randomBetween(0, height * 0.6),
            speed: randomBetween(MIN_SPEED, MAX_SPEED),
            digits: Array.from({ length }, randomBit),
        };
    }

    function resize() {
        const widthChanged = window.innerWidth !== width;
        const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.round(width * pixelRatio);
        canvas.height = Math.round(height * pixelRatio);
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        context.font = `${FONT_SIZE}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
        context.textAlign = "center";

        // No celular a altura muda quando a barra do navegador aparece: só recria as colunas se a largura mudar
        if (widthChanged) {
            const count = Math.ceil(width / COLUMN_GAP);
            columns = Array.from({ length: count }, (_, i) => createColumn(i * COLUMN_GAP + COLUMN_GAP / 2, true));
        }
    }

    function drawColumn(column, deltaSeconds) {
        column.y += column.speed * deltaSeconds;
        if (Math.random() < FLIP_CHANCE) {
            column.digits[Math.floor(Math.random() * column.digits.length)] = randomBit();
        }

        column.digits.forEach((digit, index) => {
            const y = column.y - index * LINE_HEIGHT;
            if (y < -LINE_HEIGHT || y > height + LINE_HEIGHT) return;
            const alpha = index === 0 ? HEAD_ALPHA : TAIL_ALPHA * (1 - index / column.digits.length);
            context.globalAlpha = alpha * strength;
            context.fillText(digit, column.x, y);
        });

        // Saiu inteira pela parte de baixo: renasce acima da tela com novo tamanho e velocidade
        if (column.y - column.digits.length * LINE_HEIGHT > height) {
            Object.assign(column, createColumn(column.x, false));
        }
    }

    function tick(now) {
        frame = requestAnimationFrame(tick);
        if (now - lastTime < 1000 / FPS) return;
        const deltaSeconds = lastTime ? Math.min((now - lastTime) / 1000, 0.1) : 0;
        lastTime = now;

        context.clearRect(0, 0, width, height);
        context.fillStyle = color;
        columns.forEach((column) => drawColumn(column, deltaSeconds));
    }

    function start() {
        if (frame) return;
        lastTime = 0;
        frame = requestAnimationFrame(tick);
    }

    function stop() {
        cancelAnimationFrame(frame);
        frame = 0;
    }

    // Some aos poucos entre FADE_START e FADE_END da rolagem; invisível, não gasta processamento
    function updateVisibility() {
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
        const opacity = 1 - clamp01((progress - FADE_START) / (FADE_END - FADE_START));
        canvas.style.opacity = String(opacity);
        if (opacity > 0) start();
        else stop();
    }

    readTheme();
    resize();
    updateVisibility();

    window.addEventListener("resize", () => {
        resize();
        updateVisibility();
    });
    window.addEventListener("scroll", updateVisibility, { passive: true });
    new MutationObserver(readTheme).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
}
