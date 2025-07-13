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
        logo.src = 'assets/images/letter-logo.webp';
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
        this.enableInteraction = !this.isMobile;
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
        // Fix opacity handling - don't replace if opacity is 0
        if (this.opacity > 0) {
            const color = this.baseColor.replace('0.3', this.opacity.toFixed(3));
            state.ctx.fillStyle = color;
            state.ctx.fill();
        }
    }

    update(mouse) {
        // Update opacity based on animation progress
        if (state.fadeStartTime) {
            const progress = (Date.now() - state.fadeStartTime) / CONFIG.ANIMATION.FADE_DURATION;
            this.opacity = Math.min(0.3, progress * 0.3); // Max opacity is 0.3
        } else if (!state.fadeStartTime && state.animationStarted) {
            // Ensure particles are visible once animation starts
            this.opacity = 0.3;
        }

        if (state.enableInteraction && state.isMouseMoving && mouse.x && mouse.y) {
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < CONFIG.ANIMATION.MAX_DISTANCE) {
                const force = (CONFIG.ANIMATION.MAX_DISTANCE - distance) / CONFIG.ANIMATION.MAX_DISTANCE;
                const forceFactor = 0.5;
                this.vx += (dx / distance) * force * this.density * forceFactor;
                this.vy += (dy / distance) * force * this.density * forceFactor;
            }
        } else if (state.enableInteraction) {
            const dx = this.baseX - this.x;
            const dy = this.baseY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const returnForceFactor = Math.min(distance / 50, 1) * CONFIG.ANIMATION.RETURN_FORCE;
            this.vx += dx * returnForceFactor;
            this.vy += dy * returnForceFactor;
        }

        if (state.enableInteraction) {
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
    }

    handleBoundaryCollision() {
        if (!state.enableInteraction) return;

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
    state.canvas.style.position = 'fixed';
    state.canvas.style.top = '0';
    state.canvas.style.left = '0';
    state.canvas.style.pointerEvents = 'none';
    state.canvas.style.zIndex = '-1';
    
    // Append canvas to body instead of main content
    document.body.appendChild(state.canvas);
    updateCanvasBounds();
}

function updateCanvasBounds() {
    if (!state.canvas) return;
    
    state.bounds = {
        left: 0,
        top: 0,
        right: window.innerWidth,
        bottom: window.innerHeight
    };
    
    state.canvas.width = window.innerWidth;
    state.canvas.height = window.innerHeight;
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
    state.mouse.x = e.clientX;
    state.mouse.y = e.clientY;
    state.isMouseMoving = true;
    
    clearTimeout(state.mouseTimer);
    state.mouseTimer = setTimeout(() => {
        state.isMouseMoving = false;
    }, CONFIG.ANIMATION.IDLE_TIMEOUT);
}

function handleMouseLeave() {
    state.mouse.x = undefined;
    state.mouse.y = undefined;
    state.isMouseMoving = false;
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

function setupAccreditationScroll() {
    const grid = document.querySelector('.accreditation-grid');
    if (!grid) return;

    // Duplicate the cards to create a seamless loop
    const cards = grid.innerHTML;
    grid.innerHTML += cards; // Append the same cards again for infinite scrolling

    // Adjust the animation duration based on the total width
    const totalWidth = grid.scrollWidth / 2; // Since we duplicated the cards
    const duration = totalWidth / 50; // Adjust speed (50px per second)
    grid.style.animationDuration = `${duration}s`;
}

function setupMapPins() {
    // List of countries with names and ISO codes
    const countries = [
        { name: 'Sri Lanka', code: 'LK' },
        { name: 'Ghana', code: 'GH' },
        { name: 'Myanmar', code: 'MM' },
        { name: 'El Salvador', code: 'SV' },
        { name: 'Dominican Republic', code: 'DO' },
        { name: 'Azerbaijan', code: 'AZ' },
        { name: 'Malawi', code: 'MW' },
        { name: 'Uzbekistan', code: 'UZ' },
        { name: 'Mali', code: 'ML' },
        { name: 'Cambodia', code: 'KH' },
        { name: 'USA', code: 'US' },
        { name: 'India', code: 'IN' } // Added India
    ];

    // Get the SVG element
    const svg = document.querySelector('.world-map svg');
    if (!svg) {
        console.warn('SVG map not found. Check if .world-map contains an SVG element.');
        return;
    }

    // Check the viewBox
    const viewBox = svg.viewBox.baseVal;
    if (!viewBox || !viewBox.width || !viewBox.height) {
        console.warn('SVG viewBox is not defined or invalid. Add a viewBox attribute like "0 0 1000 600".');
    }
    const vbWidth = viewBox.width;
    const vbHeight = viewBox.height;

    // Get the pin container
    const pinContainer = document.querySelector('.pin-container');
    if (!pinContainer) {
        console.warn('Pin container not found. Ensure .pin-container exists in your HTML.');
        return;
    }

    // Check if the device is mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    // Process each country
    countries.forEach(country => {
        const countryPath = document.getElementById(country.code);
        if (countryPath) {
            let pinLeft, pinTop;
            if(isMobile) {
                console.log('Mobile device detected, using custom coordinates for pins.');
                switch (country.code) {
                    case 'US':
                        pinLeft = 17.320968627929688;
                        pinTop = 54.947775640486604;
                        break;
                    case 'IN':
                        pinLeft = 69.13727111816406;
                        pinTop = 62.591904396513065;
                        break;
                    case 'LK':
                        pinLeft = 69.49183654785156;
                        pinTop = 67.23507294820046;
                        break;
                    case 'GH':
                        pinLeft = 46.74879150390625;
                        pinTop = 67.59819591602197;
                        break;
                    case 'MM':
                        pinLeft = 73.90322570800781;
                        pinTop = 62.00128176154838;
                        break;
                    case 'SV':
                        pinLeft = 22.320968627929688;
                        pinTop = 64.44778002018163;
                        break;
                    case 'DO':
                        pinLeft = 27.530178833007813;
                        pinTop = 62.28997154950106;
                        break;
                    case 'AZ':
                        pinLeft = 60.2563720703125;
                        pinTop = 52.2439090705236;
                        break;
                    case 'MW':
                        pinLeft = 56.56344299316406;
                        pinTop = 75.58572079268977;
                        break;
                    case 'UZ':
                        pinLeft = 64.9783447265625;
                        pinTop = 52.04356079717457;
                        break;
                    case 'ML': // Mali
                        pinLeft = 46.01634521484375;
                        pinTop = 61.93000826886422;
                        break;
                    case 'KH': // Cambodia
                        pinLeft = 76.21014404296875;
                        pinTop = 65.14895728220653;
                        break;
                }

            } else {
                console.log('Desktop device detected, calculating pin positions based on SVG paths.');
                // For desktop, use the SVG viewBox to calculate pin positions
                // Special handling for USA with custom coordinates
                if (country.code === 'US') {
                    // Custom coordinates for USA (adjust these based on your SVG)
                    pinLeft = 17.320968627929688;
                    pinTop = 53.947775640486604;
                } else if(country.code === 'IN') {
                    // Custom coordinates for India (adjust these based on your SVG)
                    const svgRect = svg.getBoundingClientRect();
                    const pathRect = countryPath.getBoundingClientRect();
                    pinLeft = (((pathRect.left + pathRect.width / 2 - svgRect.left) / svgRect.width) * 100)-1;
                    pinTop = (((pathRect.top + pathRect.height / 2 - svgRect.top) / svgRect.height) * 100)+1;
                } else {
                    // Alternative method using getBoundingClientRect for other countries
                    const svgRect = svg.getBoundingClientRect();
                    const pathRect = countryPath.getBoundingClientRect();
                    pinLeft = ((pathRect.left + pathRect.width / 2 - svgRect.left) / svgRect.width) * 100;
                    pinTop = ((pathRect.top + pathRect.height / 2 - svgRect.top) / svgRect.height) * 100;
                }
            }
            // Create the pin
            const pin = document.createElement('div');
            pin.className = 'map-pin';
            pin.style.left = `${pinLeft}%`;
            pin.style.top = `${pinTop}%`;

            if (country.code === 'IN') {
                const tooltip = document.createElement('span');
                tooltip.className = 'country-tooltip';
                tooltip.textContent = 'AyuNutra Pharmaceuticals, India';
                pin.appendChild(tooltip);
                const img = document.createElement('img');
                img.src = 'assets/images/letter-logo.webp';
                img.alt = 'AyuNutra Logo';
                pin.appendChild(img);
            } else {
                const tooltip = document.createElement('span');
                tooltip.className = 'country-tooltip';
                tooltip.textContent = country.name;
                pin.appendChild(tooltip);
                const icon = document.createElement('i');
                icon.className = 'fa-solid fa-map-pin'; 
                pin.appendChild(icon);
            }

            // Add hover event listeners for highlighting
            pin.addEventListener('mouseenter', () => {
                countryPath.classList.add('highlight');
            });
            pin.addEventListener('mouseleave', () => {
                countryPath.classList.remove('highlight');
            });

            pinContainer.appendChild(pin);
        } else {
            console.warn(`Country path not found for ${country.name} (${country.code}). Check SVG path IDs.`);
        }
    });
}

// Initialize
function init() {
    setupCanvas();
    createPoints();
    setupMapPins();
    setupAccreditationScroll();
    
    // Event Listeners
    const mainContent = document.getElementById('main-content');
    
    if (state.enableInteraction) {
        mainContent.addEventListener('mousemove', handleMouseMove);
        mainContent.addEventListener('mouseleave', handleMouseLeave);
    }

    
    window.addEventListener('resize', handleResize);
    handleSplashScreen();
}

        // Hero Carousel
        let currentSlide = 0;
        const slides = document.querySelectorAll('.hero-slide');
        const totalSlides = slides.length;

        function showSlide(index) {
            slides.forEach((slide, i) => {
                slide.classList.toggle('active', i === index);
            });
        }

        function nextSlide() {
            currentSlide = (currentSlide + 1) % totalSlides;
            showSlide(currentSlide);
        }

        // Auto-advance carousel
        setInterval(nextSlide, 5000);

        // Scroll to top functionality
        const scrollTopBtn = document.querySelector('.scroll-top');

        function scrollToTop() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }

        // Combined scroll handlers
        window.addEventListener('scroll', function() {
            const heroBottom = heroSection.offsetTop + heroSection.offsetHeight - 100;
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            // Header behavior
            if (scrollTop < heroBottom) {
                if (!headerInitialized) {
                    header.classList.add('initial');
                    header.classList.remove('sticky');
                }
            } else {
                header.classList.remove('initial');
                header.classList.add('sticky');
                headerInitialized = true;
            }
            
            // Scroll to top button
            if (scrollTop > 300) {
                scrollTopBtn.classList.add('show');
            } else {
                scrollTopBtn.classList.remove('show');
            }
        });

        // Smooth scrolling for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    const headerHeight = document.querySelector('header').offsetHeight;
                    const targetPosition = target.offsetTop - headerHeight;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });  


        const mobileMenu = document.querySelector('.mobile-menu');
        const nav = document.querySelector('nav');

        // Create overlay element
        const overlay = document.createElement('div');
        overlay.className = 'mobile-menu-overlay';
        document.body.appendChild(overlay);

        mobileMenu.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            nav.classList.toggle('active');
            this.classList.toggle('active');
            overlay.classList.toggle('active');
            
            // Force reflow for mobile devices
            nav.offsetHeight;
            
            // Prevent body scroll when menu is open
            document.body.style.overflow = nav.classList.contains('active') ? 'hidden' : '';
        });

        // Close menu when overlay is clicked
        overlay.addEventListener('click', function(e) {
            e.preventDefault();
            nav.classList.remove('active');
            mobileMenu.classList.remove('active');
            this.classList.remove('active');
            document.body.style.overflow = '';
        });

        // Close menu when nav link is clicked
        nav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', (e) => {
                // Small delay to allow for smooth transition
                setTimeout(() => {
                    nav.classList.remove('active');
                    mobileMenu.classList.remove('active');
                    overlay.classList.remove('active');
                    document.body.style.overflow = '';
                }, 100);
            });
        });

        // Header scroll effect - sticky after carousel
        const header = document.querySelector('header');
        const heroSection = document.querySelector('.hero');
        let headerInitialized = false;

        // Initially show header
        header.classList.add('initial');

        window.addEventListener('scroll', function() {
            const heroBottom = heroSection.offsetTop + heroSection.offsetHeight - 100; // 100px buffer
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            if (scrollTop < heroBottom) {
                // User is still in hero section or above
                if (!headerInitialized) {
                    header.classList.add('initial');
                    header.classList.remove('sticky');
                }
            } else {
                // User has scrolled past the carousel
                header.classList.remove('initial');
                header.classList.add('sticky');
                headerInitialized = true;
            }
        });

        // Intersection Observer for animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver(function(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Add a class instead of setting inline styles
                    entry.target.classList.add('animate-in');
                }
            });
        }, observerOptions);

        // Observe elements for animation - Remove inline style setting
        document.querySelectorAll('.product-card, .accreditation-card, .about-content > *').forEach(el => {
            // Add initial class instead of inline styles
            el.classList.add('animate-initial');
            observer.observe(el);
        });
        
        // Counter animation for global stats
        function animateCounter(element, target, duration) {
            let start = 0;
            const increment = target / (duration / 16);
            
            function updateCounter() {
                start += increment;
                if (start < target) {
                    element.textContent = Math.floor(start) + (element.textContent.includes('+') ? '+' : '');
                    requestAnimationFrame(updateCounter);
                } else {
                    element.textContent = target + (element.textContent.includes('+') ? '+' : '');
                }
            }
            
            updateCounter();
        }

        // Animate counters when they come into view
        const statsObserver = new IntersectionObserver(function(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const statNumber = entry.target.querySelector('.stat-number');
                    const text = statNumber.textContent;
                    const number = parseInt(text.replace(/\D/g, ''));
                    const hasPlus = text.includes('+');
                    
                    statNumber.textContent = '0' + (hasPlus ? '+' : '');
                    animateCounter(statNumber, number, 2000);
                    
                    statsObserver.unobserve(entry.target);
                }
            });
        }, observerOptions);

        document.querySelectorAll('.stat-item').forEach(item => {
            statsObserver.observe(item);
        });

        // Add loading animation
        window.addEventListener('load', function() {
            document.body.classList.add('loaded');
        });

        // Add mobile menu styles for responsive design
        if (window.innerWidth <= 768) {
            const style = document.createElement('style');
            style.textContent = `
                nav {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background: white;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                    transform: translateY(-100%);
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.3s ease;
                }
                
                nav.active {
                    transform: translateY(0);
                    opacity: 1;
                    visibility: visible;
                }
                
                nav ul {
                    flex-direction: column;
                    padding: 1rem;
                    gap: 1rem;
                }
                
                .mobile-menu.active span:nth-child(1) {
                    transform: rotate(45deg) translate(5px, 5px);
                }
                
                .mobile-menu.active span:nth-child(2) {
                    opacity: 0;
                }
                
                .mobile-menu.active span:nth-child(3) {
                    transform: rotate(-45deg) translate(7px, -6px);
                }
            `;
            document.head.appendChild(style);
        }

// Initialize splash screen after DOM content is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SplashScreenController();
    init(); // Initialize the rest of the application
});