const canvas = document.createElement('canvas');
document.body.appendChild(canvas);

const ctx = canvas.getContext('2d');

// Set canvas size
function setCanvasSize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
setCanvasSize();

let particles = [];

// Particle Object
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.speedX = Math.random() * 2 - 1; // Random horizontal drift
        this.speedY = Math.random() * 2 - 1; // Random vertical drift
        this.opacity = 1; // Start fully visible
        this.life = 1; // Life span to fade out
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.opacity -= 0.02; // Gradually fade out
        this.life -= 0.01; // Decrease life
    }

    isDead() {
        return this.life <= 0 || this.opacity <= 0;
    }
}

// Create Particles on Mouse Move
function createParticles(e) {
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    for (let i = 0; i < 3; i++) {
        particles.push(new Particle(mouseX, mouseY));
    }
}

// Draw Connections Between Particles
function drawConnections() {
    for (let a = 0; a < particles.length; a++) {
        let connections = 0; // Track the number of connections per particle
        for (let b = a + 1; b < particles.length; b++) {
            if (connections >= 3) break; // Limit each particle to 3 connections
            const dx = particles[a].x - particles[b].x;
            const dy = particles[a].y - particles[b].y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 120) { // Increased connection distance
                const alpha = Math.min(particles[a].opacity, particles[b].opacity) * (1 - distance / 120); // Smooth fade by distance
                ctx.strokeStyle = `rgba(76, 175, 147, ${alpha})`;
                ctx.lineWidth = 0.8; // Slightly thicker lines for larger spread
                ctx.beginPath();
                ctx.moveTo(particles[a].x, particles[a].y);
                ctx.lineTo(particles[b].x, particles[b].y);
                ctx.stroke();
                connections++; // Count the connection
            }
        }
    }
}

// Animate Particles and Connections
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update and remove dead particles
    particles = particles.filter(particle => {
        particle.update();
        return !particle.isDead();
    });

    // Draw connections only
    drawConnections();

    requestAnimationFrame(animate);
}

window.addEventListener('mousemove', createParticles);
window.addEventListener('resize', setCanvasSize);

animate();
