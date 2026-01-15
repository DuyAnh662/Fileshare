/**
 * Scroll Animations & Dynamic Effects
 * Intersection Observer based scroll reveal effects
 */

(function () {
    'use strict';

    // Configuration
    const config = {
        threshold: 0.15, // Trigger when 15% of element is visible
        rootMargin: '0px 0px -50px 0px', // Trigger slightly before element enters viewport
    };

    // Initialize scroll animations
    function initScrollAnimations() {
        // Check for reduced motion preference
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            // Show all elements immediately without animation
            document.querySelectorAll('.scroll-animate, .scroll-animate-scale, .scroll-animate-left, .scroll-animate-right, .stagger-children')
                .forEach(el => el.classList.add('animate-in'));
            return;
        }

        // Create Intersection Observer
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                    // Optionally unobserve after animation (better performance)
                    // observer.unobserve(entry.target);
                }
            });
        }, config);

        // Observe all scroll-animate elements
        const animateElements = document.querySelectorAll(
            '.scroll-animate, .scroll-animate-scale, .scroll-animate-left, .scroll-animate-right, .stagger-children'
        );

        animateElements.forEach(el => observer.observe(el));
    }

    // Parallax effect for hero section (subtle)
    function initParallax() {
        const hero = document.querySelector('.hero');
        if (!hero) return;

        // Check for reduced motion preference
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
        }

        let ticking = false;

        function updateParallax() {
            const scrolled = window.pageYOffset;
            const heroHeight = hero.offsetHeight;

            if (scrolled < heroHeight) {
                const orbs = hero.querySelectorAll('.hero-orb');
                orbs.forEach((orb, index) => {
                    const speed = 0.1 + (index * 0.05);
                    orb.style.transform = `translateY(${scrolled * speed}px)`;
                });
            }
            ticking = false;
        }

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(updateParallax);
                ticking = true;
            }
        }, { passive: true });
    }

    // Header shrink on scroll
    function initHeaderScroll() {
        const header = document.querySelector('.header');
        if (!header) return;

        let lastScroll = 0;

        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;

            if (currentScroll > 50) {
                header.style.padding = '10px 0';
                header.style.boxShadow = 'var(--shadow-md)';
            } else {
                header.style.padding = '16px 0';
                header.style.boxShadow = 'none';
            }

            lastScroll = currentScroll;
        }, { passive: true });
    }

    // Smooth appear for dynamically loaded content
    function observeDynamicContent() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Element node
                        // Add animation class to new cards
                        if (node.classList && node.classList.contains('file-card')) {
                            node.style.opacity = '0';
                            node.style.transform = 'translateY(20px)';
                            requestAnimationFrame(() => {
                                node.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                                node.style.opacity = '1';
                                node.style.transform = 'translateY(0)';
                            });
                        }
                    }
                });
            });
        });

        // Observe file grid for dynamic content
        const fileGrid = document.getElementById('latest-files');
        if (fileGrid) {
            observer.observe(fileGrid, { childList: true });
        }
    }

    // Initialize all animations when DOM is ready
    function init() {
        initScrollAnimations();
        initParallax();
        initHeaderScroll();
        observeDynamicContent();
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
