const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');

// Load assets
const heroImg = new Image();
heroImg.src = 'hero.png';
const enemyImg = new Image();
enemyImg.src = 'enemy.png';
const powerupImg = new Image();
powerupImg.src = 'powerup.jpg';
const backgroundImg = new Image();
backgroundImg.src = 'background.jpg';
const hurtSound = new Audio('catsound.wav');
const bgMusic = new Audio('game.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.2;

// Game variables
let hero = { x: 180, y: 460, width: 40, height: 40, speed: 5, hp: 10, lastHitPlatform: null, lastTopHit: false };
let platforms = [];
let gameOver = false;
let gameStarted = false;
let level = 1;
let totalDistance = 0;
const gravity = 0.3;
let velocityY = 0;
let isGrounded = false;

// Touch variables
let touchX = null;

function spawnPlatform() {
    const type = level < 5 ? 'powerup' : Math.random() < 0.3 + (level * 0.005) ? 'enemy' : 'powerup';
    const x = Math.random() * (canvas.width - 100);
    let y = canvas.height;
    let tooClose = false;
    platforms.forEach(p => {
        if (Math.abs(p.y - y) < 100) tooClose = true;
    });
    if (!tooClose) platforms.push({ x, y, width: 100, height: 20, type });
}

function update() {
    if (!gameStarted) {
        ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);
        return;
    }

    if (gameOver) {
        restartButton.style.display = 'block';
        return;
    }

    // Background music
    bgMusic.play();

    // Hero movement (Keyboard)
    if (keys['ArrowLeft'] && hero.x > 0) hero.x -= hero.speed;
    if (keys['ArrowRight'] && hero.x < canvas.width - hero.width) hero.x += hero.speed;

    // Hero movement (Touch)
    if (touchX !== null) {
        if (touchX < canvas.width / 2 && hero.x > 0) hero.x -= hero.speed; // Left half moves left
        if (touchX > canvas.width / 2 && hero.x < canvas.width - hero.width) hero.x += hero.speed; // Right half moves right
    }

    // Gravity and falling
    velocityY += gravity;
    hero.y += velocityY;

    // Top obstacle
    if (hero.y < 0 && !hero.lastTopHit) {
        hero.hp--;
        hurtSound.play();
        hero.lastTopHit = true;
        velocityY = 2;
        hero.y = findNextPlatformBelow(hero.y);
        if (hero.hp <= 0) {
            gameOver = true;
            bgMusic.pause();
        }
    } else if (hero.y >= 0) {
        hero.lastTopHit = false;
    }

    // Bottom boundary
    if (hero.y > canvas.height) {
        gameOver = true;
        bgMusic.pause();
    }

    // Platforms
    isGrounded = false;
    const scrollSpeed = 2 + (level * 0.02);
    platforms.forEach(p => {
        p.y -= scrollSpeed;
        totalDistance += scrollSpeed;

        // Collision detection (only below)
        if (hero.y + hero.height > p.y && hero.y < p.y + p.height &&
            hero.x + hero.width > p.x && hero.x < p.x + p.width && velocityY > 0) {
            if (p.type === 'enemy' && p !== hero.lastHitPlatform) {
                hero.hp--;
                hurtSound.play();
                hero.lastHitPlatform = p;
            }
            velocityY = 0;
            hero.y = p.y - hero.height;
            isGrounded = true;
            if (hero.hp <= 0) {
                gameOver = true;
                bgMusic.pause();
            }
        }
    });

    // Prevent accessing stairs above
    platforms.forEach(p => {
        if (hero.y < p.y + p.height && hero.y + hero.height > p.y &&
            hero.x + hero.width > p.x && hero.x < p.x + p.width && velocityY <= 0) {
            velocityY = gravity;
            hero.y = p.y + p.height;
        }
    });

    // Level up every 8 pages (4800 pixels)
    if (totalDistance >= 4800) {
        totalDistance -= 4800;
        levelUp();
    }

    // Remove off-screen platforms and spawn new ones
    platforms = platforms.filter(p => p.y + p.height > 0);
    if (platforms.length < 5 + Math.floor(level / 20) && Math.random() < 0.05 + (level * 0.001)) spawnPlatform();

    // Draw
    ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);
    
    platforms.forEach(p => {
        ctx.drawImage(p.type === 'enemy' ? enemyImg : powerupImg, p.x, p.y, p.width, p.height);
    });
    
    ctx.drawImage(heroImg, hero.x, hero.y, hero.width, hero.height);
    
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.fillText(`HP: ${hero.hp}`, 10, 30);
    ctx.fillText(`Level: ${level}`, 10, 60);
}

function levelUp() {
    level++;
    if (hero.hp < 10) hero.hp++;
    if (level > 100) level = 100;
}

function findNextPlatformBelow(currentY) {
    let nextY = canvas.height;
    platforms.forEach(p => {
        if (p.y > currentY && p.y < nextY) nextY = p.y;
    });
    return nextY === canvas.height ? canvas.height - 100 : nextY - hero.height;
}

function resetGame() {
    hero = { x: 180, y: 460, width: 40, height: 40, speed: 5, hp: 10, lastHitPlatform: null, lastTopHit: false };
    platforms = [
        { x: 150, y: 500, width: 100, height: 20, type: 'powerup' },
        { x: 100, y: 350, width: 100, height: 20, type: 'powerup' },
        { x: 200, y: 200, width: 100, height: 20, type: 'powerup' },
        { x: 150, y: 50, width: 100, height: 20, type: 'powerup' }
    ];
    gameOver = false;
    level = 1;
    totalDistance = 0;
    restartButton.style.display = 'none';
    velocityY = 0;
    isGrounded = true;
    bgMusic.currentTime = 0;
    bgMusic.play();
}

// Input handling (Keyboard)
let keys = {};
window.addEventListener('keydown', e => keys[e.key] = true);
window.addEventListener('keyup', e => keys[e.key] = false);

// Touch controls
canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    touchX = e.touches[0].clientX - canvas.offsetLeft; // Get touch position relative to canvas
});
canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    touchX = e.touches[0].clientX - canvas.offsetLeft; // Update touch position
});
canvas.addEventListener('touchend', e => {
    e.preventDefault();
    touchX = null; // Stop movement when touch ends
});

// Start and restart button handling
startButton.addEventListener('click', () => {
    gameStarted = true;
    startScreen.style.display = 'none';
    hurtSound.play();
    resetGame();
});

restartButton.addEventListener('click', () => {
    hurtSound.play();
    resetGame();
});

// Initial setup
setInterval(update, 1000 / 60);
