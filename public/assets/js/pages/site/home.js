// Logged-in visitors go straight to their dashboard
document.addEventListener("DOMContentLoaded", () => {
    if (window.API && window.API.getToken()) {
        window.API.getProfile()
            .then(res => {
                console.log("Auto-redirecting logged in user");
                window.API.redirectByRole(res.data.role);
            })
            .catch(() => window.API.logout());
    }

    // 3D tilt on the feature cards
    const cards = document.querySelectorAll('.mac-window');

    cards.forEach(card => {
        const wrapper = card.querySelector('.feature-icon-wrapper');

        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = ((y - centerY) / centerY) * -15;
            const rotateY = ((x - centerX) / centerX) * 15;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05) translateY(-20px)`;

            card.style.background = `
                radial-gradient(circle at ${x}px ${y}px, rgba(255,255,255,0.08) 0%, rgba(20,20,25,0.6) 50%)
            `;

            if (wrapper) {
                wrapper.style.transform = `translateZ(40px) rotateX(${-rotateX}deg) rotateY(${-rotateY}deg) scale(1.1)`;
                wrapper.style.boxShadow = `${-rotateY}px ${rotateX}px 30px rgba(0,0,0,0.5)`;
            }
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1) translateY(0px)`;
            card.style.background = `rgba(20, 20, 25, 0.6)`;
            if (wrapper) {
                wrapper.style.transform = `translateZ(0px) scale(1)`;
                wrapper.style.boxShadow = `inset 0 0 20px rgba(255,255,255,0.02)`;
            }
        });
    });

    // Hero text parallax
    const hero = document.querySelector('.hero');
    const heroContent = document.querySelector('.hero-content');

    if (hero && heroContent) {
        hero.addEventListener('mousemove', e => {
            const xAxis = (window.innerWidth / 2 - e.pageX) / 50;
            const yAxis = (window.innerHeight / 2 - e.pageY) / 50;
            heroContent.style.transform = `translateZ(50px) rotateY(${xAxis}deg) rotateX(${yAxis}deg)`;
        });

        hero.addEventListener('mouseleave', () => {
            heroContent.style.transform = `translateZ(50px) rotateY(0deg) rotateX(0deg)`;
        });
    }
});
