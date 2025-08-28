document.addEventListener('DOMContentLoaded', function() {
    // Fetch bot information
    fetchBotInfo();

    // Set up smooth scrolling for anchor links
    setupSmoothScrolling();

    // Set up mobile navigation
    setupMobileNavigation();

    // Update stats periodically
    setInterval(fetchBotInfo, 60000); // Update every minute
});

// Fetch bot information from API
function fetchBotInfo() {
    fetch('/api/botinfo')
        .then(response => {
            if (!response.ok) {
                throw new Error(`API returned status ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            try {
                // Safely update stats on the page with error handling and animations
                const serverCount = document.getElementById('server-count');
                if (serverCount) {
                    // Add animation for number changes
                    if (serverCount.textContent !== data.servers.toString()) {
                        serverCount.style.transform = 'scale(1.1)';
                        setTimeout(() => {
                            serverCount.style.transform = 'scale(1)';
                        }, 200);
                    }
                    serverCount.textContent = data.servers || 'Online';
                }

                const uptime = document.getElementById('uptime');
                if (uptime) uptime.textContent = data.uptime || 'Online';

                const commandCount = document.getElementById('command-count');
                if (commandCount) commandCount.textContent = data.commands ? data.commands.length : '28';

                const prefix = document.getElementById('prefix');
                if (prefix) prefix.textContent = data.prefix || '/';

                // Update prefix in command list
                document.querySelectorAll('.prefix').forEach(element => {
                    if (element.textContent === '$') {
                        element.textContent = data.prefix || '/';
                    }
                });

                // Update last updated time
                const lastUpdated = document.getElementById('last-updated');
                if (lastUpdated) {
                    lastUpdated.textContent = new Date().toLocaleTimeString();
                }

                // Show connection status
                updateConnectionStatus(true);
            } catch (innerError) {
                console.warn('Error updating DOM with bot info:', innerError);
                updateConnectionStatus(false);
            }
        })
        .catch(error => {
            console.warn('Error fetching bot info:', error);
            updateConnectionStatus(false);
            // Set fallback values on error to avoid displaying empty data
            try {
                document.getElementById('server-count').textContent = 'Offline';
                document.getElementById('uptime').textContent = 'Offline';
                document.getElementById('command-count').textContent = '28';
                document.getElementById('prefix').textContent = '/';
            } catch (fallbackError) {
                // Silent fail - the page might not have these elements
            }
        });
}

// Update connection status indicator
function updateConnectionStatus(connected) {
    const indicator = document.getElementById('connection-status');
    if (indicator) {
        indicator.className = connected ? 'status-online' : 'status-offline';
        indicator.textContent = connected ? '🟢 Online' : '🔴 Offline';
    }
}

// Set up smooth scrolling for anchor links
function setupSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();

            const targetId = this.getAttribute('href');

            // Skip if targetId is just '#' or invalid
            if (!targetId || targetId === '#' || targetId.length <= 1) {
                return;
            }

            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 70, // Accounting for fixed header
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Add animation when elements come into view
window.addEventListener('scroll', () => {
    const featureCards = document.querySelectorAll('.feature-card');
    const commandItems = document.querySelectorAll('.command-item');
    const statCards = document.querySelectorAll('.stat-card');

    animateOnScroll(featureCards);
    animateOnScroll(commandItems);
    animateOnScroll(statCards);
});

function animateOnScroll(elements) {
    elements.forEach(element => {
        const elementPosition = element.getBoundingClientRect().top;
        const screenPosition = window.innerHeight / 1.3;

        if (elementPosition < screenPosition) {
            element.style.opacity = 1;
            element.style.transform = 'translateY(0)';
        }
    });
}

// Set up mobile navigation
function setupMobileNavigation() {
    // Create mobile menu toggle button
    const header = document.querySelector('header .container');
    const nav = document.querySelector('nav');
    const navUl = document.querySelector('nav ul');

    if (header && nav && navUl) {
        const mobileToggle = document.createElement('button');
        mobileToggle.innerHTML = '☰';
        mobileToggle.className = 'mobile-toggle';
        mobileToggle.style.cssText = `
            display: none;
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            padding: 5px;
            color: var(--dark-color);
        `;

        // Insert toggle button
        header.insertBefore(mobileToggle, nav);

        // Add mobile styles
        const style = document.createElement('style');
        style.textContent = `
            @media (max-width: 768px) {
                .mobile-toggle {
                    display: block !important;
                }
                nav {
                    position: relative;
                    width: 100%;
                }
            }
        `;
        document.head.appendChild(style);

        // Toggle functionality
        mobileToggle.addEventListener('click', () => {
            navUl.classList.toggle('mobile-open');
            mobileToggle.innerHTML = navUl.classList.contains('mobile-open') ? '✕' : '☰';
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!nav.contains(e.target) && !mobileToggle.contains(e.target)) {
                navUl.classList.remove('mobile-open');
                mobileToggle.innerHTML = '☰';
            }
        });

        // Close menu when clicking nav links
        navUl.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navUl.classList.remove('mobile-open');
                mobileToggle.innerHTML = '☰';
            });
        });
    }
}

// Initialize elements with fade-in effect
document.addEventListener('DOMContentLoaded', () => {
    const fadeElements = document.querySelectorAll('.feature-card, .command-item, .stat-card');

    fadeElements.forEach(element => {
        element.style.opacity = 0;
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    });

    // Trigger initial animation check
    setTimeout(() => {
        window.dispatchEvent(new Event('scroll'));
    }, 100);
});

// Function to show the dashboard or handle authentication
function showDashboard() {
    // Directly redirect to dashboard - let React app handle auth
    window.location.href = '/dashboard';
}