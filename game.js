// Game variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
function resizeCanvas() {
    const container = document.getElementById('gameContainer');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Game state
const game = {
    running: true,
    score: 0,
    gameOverFlag: false
};

// Cat player
const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    width: 80,
    height: 80,
    speed: 4,
    health: 100,
    maxHealth: 100,
    vx: 0,
    vy: 0,
    image: new Image(),
    attacking: false,
    attackCooldown: 0,
    attackDuration: 10,
    angle: 0
};

player.image.src = './images/cat.png.PNG';

// Zombie class
class Zombie {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 80;
        this.height = 80;
        this.speed = 1.5;
        this.health = 30;
        this.maxHealth = 30;
        this.image = new Image();
        this.image.src = './images/zombie.png.png';
        this.damageTimer = 0;
    }

    update() {
        // Chase the player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        }

        // Check collision with player
        if (distance < 30) {
            if (this.damageTimer <= 0) {
                player.health -= 5;
                this.damageTimer = 30; // Damage every 30 frames
            }
        }

        if (this.damageTimer > 0) {
            this.damageTimer--;
        }
    }

    draw() {
        ctx.drawImage(this.image, this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);

        // Health bar
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2 - 10, this.width, 5);
        ctx.fillStyle = 'green';
        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2 - 10, (this.health / this.maxHealth) * this.width, 5);
    }

    takeDamage(damage) {
        this.health -= damage;
        return this.health <= 0;
    }
}

let zombies = [];
let spawnTimer = 0;
const SPAWN_INTERVAL = 360; // 6 seconds at 60 FPS
const MAX_ZOMBIES = 6;

// Attack effect class
class AttackEffect {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.radius = 50;
        this.duration = 15;
        this.elapsed = 0;
        this.image = new Image();
        this.image.src = './images/attack.png.PNG';
    }

    update() {
        this.elapsed++;
        return this.elapsed < this.duration;
    }

    draw() {
        const alpha = 1 - (this.elapsed / this.duration);
        ctx.globalAlpha = alpha;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.drawImage(this.image, -25, -25, 50, 50);
        ctx.restore();
        ctx.globalAlpha = 1;
    }
}

let attackEffects = [];

// Input handling
const keys = {};
const mouse = { x: 0, y: 0, clicking: false };

window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === ' ') {
        e.preventDefault();
        performAttack();
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
});

window.addEventListener('mousedown', () => {
    mouse.clicking = true;
});

window.addEventListener('mouseup', () => {
    mouse.clicking = false;
});

// Touch events for mobile
window.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    mouse.x = touch.clientX - rect.left;
    mouse.y = touch.clientY - rect.top;
});

window.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    mouse.x = touch.clientX - rect.left;
    mouse.y = touch.clientY - rect.top;
    performAttack();
});

// Load background image
const backgroundImage = new Image();
backgroundImage.src = './images/Background.jpg.jpg';

// Update function
function update() {
    if (!game.running) return;

    // Player movement
    player.vx = 0;
    player.vy = 0;

    if (keys['arrowup'] || keys['w']) player.vy = -player.speed;
    if (keys['arrowdown'] || keys['s']) player.vy = player.speed;
    if (keys['arrowleft'] || keys['a']) player.vx = -player.speed;
    if (keys['arrowright'] || keys['d']) player.vx = player.speed;

    // Mouse/touch movement
    const dx = mouse.x - player.x;
    const dy = mouse.y - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 30) {
        player.vx = (dx / distance) * player.speed;
        player.vy = (dy / distance) * player.speed;
        player.angle = Math.atan2(dy, dx);
    }

    // Apply movement with boundary checking
    player.x += player.vx;
    player.y += player.vy;

    // Keep player in bounds
    player.x = Math.max(player.width / 2, Math.min(canvas.width - player.width / 2, player.x));
    player.y = Math.max(player.height / 2, Math.min(canvas.height - player.height / 2, player.y));

    // Zombie spawning
    spawnTimer++;
    if (spawnTimer >= SPAWN_INTERVAL && zombies.length < MAX_ZOMBIES) {
        const side = Math.floor(Math.random() * 4);
        let x, y;
        switch (side) {
            case 0: // top
                x = Math.random() * canvas.width;
                y = -50;
                break;
            case 1: // bottom
                x = Math.random() * canvas.width;
                y = canvas.height + 50;
                break;
            case 2: // left
                x = -50;
                y = Math.random() * canvas.height;
                break;
            case 3: // right
                x = canvas.width + 50;
                y = Math.random() * canvas.height;
                break;
        }
        zombies.push(new Zombie(x, y));
        spawnTimer = 0;
    }

    // Update zombies
    for (let i = zombies.length - 1; i >= 0; i--) {
        zombies[i].update();

        if (zombies[i].health <= 0) {
            zombies.splice(i, 1);
            game.score += 10;
        }
    }

    // Update attack effects
    for (let i = attackEffects.length - 1; i >= 0; i--) {
        if (!attackEffects[i].update()) {
            attackEffects.splice(i, 1);
        }
    }

    // Update attack cooldown
    if (player.attackCooldown > 0) {
        player.attackCooldown--;
    }

    // Check game over
    if (player.health <= 0 && !game.gameOverFlag) {
        game.gameOverFlag = true;
        game.running = false;
        showGameOver();
    }

    // Update HUD
    document.getElementById('health').textContent = Math.max(0, player.health);
    document.getElementById('zombieCount').textContent = zombies.length;
    document.getElementById('score').textContent = game.score;
}

// Attack function
function performAttack() {
    if (player.attackCooldown <= 0) {
        player.attacking = true;
        player.attackCooldown = 20;

        // Create attack effect
        attackEffects.push(new AttackEffect(player.x, player.y, player.angle));

        // Check damage to zombies
        zombies.forEach(zombie => {
            const dx = zombie.x - player.x;
            const dy = zombie.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 100) {
                if (zombie.takeDamage(25)) {
                    game.score += 10;
                }
            }
        });
    }
}

// Draw function
function draw() {
    // Draw background
    if (backgroundImage.complete) {
        ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#2a5f2a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw zombies
    zombies.forEach(zombie => {
        zombie.draw();
    });

    // Draw player
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    ctx.drawImage(player.image, -player.width / 2, -player.height / 2, player.width, player.height);
    ctx.restore();

    // Draw player health bar
    ctx.fillStyle = 'red';
    ctx.fillRect(player.x - player.width / 2, player.y - player.height / 2 - 10, player.width, 5);
    ctx.fillStyle = 'green';
    ctx.fillRect(player.x - player.width / 2, player.y - player.height / 2 - 10, (player.health / player.maxHealth) * player.width, 5);

    // Draw attack effects
    attackEffects.forEach(effect => {
        effect.draw();
    });
}

// Game over screen
function showGameOver() {
    document.getElementById('finalScore').textContent = game.score;
    document.getElementById('gameOver').style.display = 'block';
}

// Game loop
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Start the game
gameLoop();
