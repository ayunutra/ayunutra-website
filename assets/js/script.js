// Configuration
const CONFIG = {
    POINT_SPACING: 30,
    ANIMATION: {
        MAX_DISTANCE: 100,
        DRAG_FORCE: 0.975,
        RETURN_FORCE: 0.03,
        IDLE_TIMEOUT: 100,
        FADE_DURATION: 1000 // Duration of fade-in animation in milliseconds
    },
    COLORS: [
        'rgba(76, 175, 147, 0.3)',
        'rgba(98, 200, 221, 0.3)',
        'rgba(136, 212, 171, 0.3)'
    ]
};

// Splash Screen Animation Controller
class SplashScreenController {
    constructor() {
        this.splashScreen = document.getElementById('splash-screen');
        this.mainContent = document.getElementById('main-content');
        this.setupSplashScreen();
    }

    setupSplashScreen() {
        // Create logo container
        const logoContainer = document.createElement('div');
        logoContainer.className = 'logo-container';
        
        // Add circular progress
        const logoCircle = document.createElement('div');
        logoCircle.className = 'logo-circle';
        logoContainer.appendChild(logoCircle);
        
        // Add logo
        const logo = document.createElement('img');
        logo.src = 'assets/images/letter-logo.png';
        logo.alt = 'Logo';
        logoContainer.appendChild(logo);
        
        this.splashScreen.appendChild(logoContainer);
        
        // Start animation sequence
        this.startAnimationSequence();
    }

    startAnimationSequence() {
        // Wait for logo animation to complete (1.2s)
        setTimeout(() => {
            this.finishSplashScreen();
        }, 1500); // Slightly longer than animation to ensure smooth transition
    }

    finishSplashScreen() {
        // Add rise-up class for final animation
        this.splashScreen.classList.add('rise-up');
        
        // Show main content and start particle animation
        this.splashScreen.addEventListener('animationend', (e) => {
            if (e.animationName === 'riseUp') {
                // Initialize particle animation
                state.canvas.style.visibility = 'visible';
                state.animationStarted = true;
                animate();
                
                // Remove splash screen
                this.splashScreen.remove();
            }
        });
    }
}

// State Management
class State {
    constructor() {
        this.mouse = { x: undefined, y: undefined };
        this.points = [];
        this.canvas = null;
        this.ctx = null;
        this.animationStarted = false;
        this.isMouseMoving = false;
        this.mouseTimer = null;
        this.bounds = null;
        this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        this.isTouch = false;
        this.fadeStartTime = null;
    }
}

const state = new State();

// Point Class
class FluidPoint {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.baseX = x;
        this.baseY = y;
        this.density = (Math.random() * 20) + 1;
        this.radius = 2;
        this.baseColor = CONFIG.COLORS[Math.floor(Math.random() * CONFIG.COLORS.length)];
        this.color = this.baseColor;
        this.opacity = 0; // Start with 0 opacity
        this.vx = 0;
        this.vy = 0;
    }

    draw() {
        state.ctx.beginPath();
        state.ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        // Use the current opacity for drawing
        const color = this.baseColor.replace('0.3', this.opacity.toFixed(3));
        state.ctx.fillStyle = color;
        state.ctx.fill();
    }

    update(mouse) {
        // Update opacity based on animation progress
        if (state.fadeStartTime) {
            const progress = (Date.now() - state.fadeStartTime) / CONFIG.ANIMATION.FADE_DURATION;
            this.opacity = Math.min(0.3, progress * 0.3); // Max opacity is 0.3
        }

        if (state.isMouseMoving && mouse.x && mouse.y) {
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < CONFIG.ANIMATION.MAX_DISTANCE) {
                const force = (CONFIG.ANIMATION.MAX_DISTANCE - distance) / CONFIG.ANIMATION.MAX_DISTANCE;
                const forceFactor = 0.5;
                this.vx += (dx / distance) * force * this.density * forceFactor;
                this.vy += (dy / distance) * force * this.density * forceFactor;
            }
        } else {
            const dx = this.baseX - this.x;
            const dy = this.baseY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const returnForceFactor = Math.min(distance / 50, 1) * CONFIG.ANIMATION.RETURN_FORCE;
            this.vx += dx * returnForceFactor;
            this.vy += dy * returnForceFactor;
        }

        const damping = 0.98;
        this.vx *= CONFIG.ANIMATION.DRAG_FORCE * damping;
        this.vy *= CONFIG.ANIMATION.DRAG_FORCE * damping;
        
        const maxSpeed = 2.5;
        const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (currentSpeed > maxSpeed) {
            const scale = maxSpeed / currentSpeed;
            this.vx *= scale;
            this.vy *= scale;
        }

        this.x += this.vx;
        this.y += this.vy;

        this.handleBoundaryCollision();
    }

    handleBoundaryCollision() {
        const buffer = this.radius * 2;
        const bounds = state.bounds;
        
        if (this.x < bounds.left + buffer || this.x > bounds.right - buffer) {
            this.vx *= -0.5;
            this.x = Math.max(bounds.left + buffer, Math.min(this.x, bounds.right - buffer));
        }
        if (this.y < bounds.top + buffer || this.y > bounds.bottom - buffer) {
            this.vy *= -0.5;
            this.y = Math.max(bounds.top + buffer, Math.min(this.y, bounds.bottom - buffer));
        }
    }
}

// Canvas Setup
function setupCanvas() {
    state.canvas = document.createElement('canvas');
    state.ctx = state.canvas.getContext('2d');
    state.canvas.style.visibility = 'hidden';
    
    // Append canvas to main content
    const mainContent = document.getElementById('main-content');
    mainContent.appendChild(state.canvas);
    
    updateCanvasBounds();
}

function updateCanvasBounds() {
    if (!state.canvas) return;
    
    const mainContent = document.getElementById('main-content');
    const rect = mainContent.getBoundingClientRect();
    
    state.bounds = {
        left: 0,
        top: 0,
        right: rect.width,
        bottom: rect.height
    };
    
    state.canvas.width = rect.width;
    state.canvas.height = rect.height;
}

// Point Management
function createPoints() {
    state.points = [];
    const columns = Math.floor(state.bounds.right / CONFIG.POINT_SPACING);
    const rows = Math.floor(state.bounds.bottom / CONFIG.POINT_SPACING);
    
    for (let i = 0; i < columns; i++) {
        for (let j = 0; j < rows; j++) {
            const x = (CONFIG.POINT_SPACING / 2) + (i * CONFIG.POINT_SPACING);
            const y = (CONFIG.POINT_SPACING / 2) + (j * CONFIG.POINT_SPACING);
            state.points.push(new FluidPoint(x, y));
        }
    }
}

// Animation
function animate() {
    if (!state.animationStarted) return;
    
    // Initialize fade start time when animation begins
    if (!state.fadeStartTime) {
        state.fadeStartTime = Date.now();
    }
    
    state.ctx.clearRect(0, 0, state.bounds.right, state.bounds.bottom);
    state.points.forEach(point => {
        point.update(state.mouse);
        point.draw();
    });
    requestAnimationFrame(animate);
}

// Event Handlers
function handleMouseMove(e) {
    if (!state.isMobile) {  // Only handle mouse events on desktop
        const mainContent = document.getElementById('main-content');
        const rect = mainContent.getBoundingClientRect();
        
        state.mouse.x = e.clientX - rect.left;
        state.mouse.y = e.clientY - rect.top;
        
        state.isMouseMoving = true;
        clearTimeout(state.mouseTimer);
        state.mouseTimer = setTimeout(() => {
            state.isMouseMoving = false;
        }, CONFIG.ANIMATION.IDLE_TIMEOUT);
    }
}

function handleMouseLeave() {
    if (!state.isMobile) {
        state.mouse.x = undefined;
        state.mouse.y = undefined;
        state.isMouseMoving = false;
    }
}

function handleTouchStart(e) {
    const touch = e.touches[0];
    const mainContent = document.getElementById('main-content');
    const rect = mainContent.getBoundingClientRect();
    
    state.isTouch = true;
    state.mouse.x = touch.clientX - rect.left;
    state.mouse.y = touch.clientY - rect.top;
    state.isMouseMoving = true;

    clearTimeout(state.mouseTimer);
}

function handleTouchEnd() {
    state.isTouch = false;
    clearTimeout(state.mouseTimer);
    state.mouseTimer = setTimeout(() => {
        state.isMouseMoving = false;
        state.mouse.x = undefined;
        state.mouse.y = undefined;
    }, 150);
}

function handleResize() {
    updateCanvasBounds();
    createPoints();
}

// Splash Screen Handler
function handleSplashScreen() {
    const splashScreen = document.getElementById('splash-screen');
    if (splashScreen) {
        splashScreen.addEventListener('animationend', (e) => {
            if (e.animationName === 'riseUp') {
                state.canvas.style.visibility = 'visible';
                state.animationStarted = true;
                animate();
            }
        });
    }
}

// Initialize
function init() {
    setupCanvas();
    createPoints();
    
    // Event Listeners
    const mainContent = document.getElementById('main-content');
    
    // Desktop events
    if (!state.isMobile) {
        mainContent.addEventListener('mousemove', handleMouseMove);
        mainContent.addEventListener('mouseleave', handleMouseLeave);
    }
    
    // Mobile events
    if (state.isMobile) {
        mainContent.addEventListener('touchstart', handleTouchStart);
        mainContent.addEventListener('touchend', handleTouchEnd);
    }
    
    window.addEventListener('resize', handleResize);
    handleSplashScreen();
}

// Initialize splash screen after DOM content is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SplashScreenController();
    init(); // Initialize the rest of the application
});