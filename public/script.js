document.addEventListener('DOMContentLoaded', function() {
    // Fetch bot information
    fetchBotInfo();
    
    // Set up smooth scrolling for anchor links
    setupSmoothScrolling();
    
    // Update stats periodically
    setInterval(fetchBotInfo, 60000); // Update every minute
});

// Fetch bot information from API
function fetchBotInfo() {
    fetch('/api/botinfo')
        .then(response => response.json())
        .then(data => {
            // Update stats on the page
            document.getElementById('server-count').textContent = data.servers;
            document.getElementById('uptime').textContent = data.uptime;
            document.getElementById('command-count').textContent = data.commands.length;
            document.getElementById('prefix').textContent = data.prefix;
            
            // Update prefix in command list
            document.querySelectorAll('.prefix').forEach(element => {
                if (element.textContent === '$') {
                    element.textContent = data.prefix;
                }
            });
        })
        .catch(error => {
            console.error('Error fetching bot info:', error);
        });
}

// Set up smooth scrolling for anchor links
function setupSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
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