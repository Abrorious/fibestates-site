document.addEventListener('DOMContentLoaded', () => {
    // Email Obfuscation Logic
    const user = 'abror.husanov';
    const domain = 'fibestates.com';
    const emailElements = document.querySelectorAll('.email-encoded');
    emailElements.forEach(el => {
        el.textContent = `${user}@${domain}`;
        // Optional: make it a clickable link if parent is not an anchor (or just leave as text)
        if (el.parentElement.tagName !== 'A') {
            // If you want it clickable:
            // el.innerHTML = `<a href="mailto:${user}@${domain}">${user}@${domain}</a>`;
        }
    });
});

// DOM Elements
const modal = document.getElementById('leadModal');
const mobileMenu = document.getElementById('mobile-menu');
const navLinks = document.querySelector('.nav-links');
const openModalBtns = document.querySelectorAll('.open-modal');
const closeModalBtn = document.querySelector('.close-modal');
const leadForm = document.getElementById('leadForm');
const projectInterestInput = document.getElementById('projectInterest');
const btnSubmit = document.getElementById('btnSubmit');

// 2-Step Elements
const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const nextBtn = document.getElementById('btnNextStep');
const backBtn = document.getElementById('backBtn');
const step1Error = document.getElementById('step1Error');
const phoneInput = document.getElementById('phone');
const emailInput = document.getElementById('email');

// Mobile Menu Logic
if (mobileMenu && navLinks) {
    mobileMenu.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        mobileMenu.classList.toggle('is-active'); // For potential hamburger animation
    });

    // Close menu when a link is clicked
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
            mobileMenu.classList.remove('is-active');
        });
    });
}

// Open Modal logic
if (openModalBtns) {
    openModalBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();

            // Reset Steps on Open
            if (step1 && step2) {
                step1.style.display = 'block';
                step2.style.display = 'none';
                if (step1Error) step1Error.style.display = 'none';
            }

            // If button has project data, update hidden input
            const project = btn.dataset.project;
            if (project) {
                if (projectInterestInput) projectInterestInput.value = project;
                const headerH3 = document.querySelector('.modal-header h3');
                const headerP = document.querySelector('.modal-header p');
                if (headerH3) headerH3.textContent = 'Request Brochure';
                if (headerP) headerP.textContent = `Get full details for ${project}`;
            } else {
                if (projectInterestInput) projectInterestInput.value = '2026 Insider Guide';
                const headerH3 = document.querySelector('.modal-header h3');
                const headerP = document.querySelector('.modal-header p');
                if (headerH3) headerH3.textContent = 'Download 2026 Insider\'s Guide';
                if (headerP) headerP.textContent = 'Enter your details for instant access.';
            }

            if (modal) {
                modal.style.display = 'block';
                // Small timeout to allow transition
                setTimeout(() => {
                    modal.classList.add('show');
                }, 10);
            }
        });
    });
}

// Close Modal logic
function closeModal() {
    if (!modal) return;
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
        // Reset form
        if (leadForm) leadForm.reset();
        if (projectInterestInput) projectInterestInput.value = 'General';

        // Reset Steps
        const step3 = document.getElementById('step3');
        if (step1 && step2) {
            step1.style.display = 'block';
            step2.style.display = 'none';
            if (step3) step3.style.display = 'none';
            if (step1Error) step1Error.style.display = 'none';
        }
    }, 300);
}

if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);

// Close on outside click
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModal();
    }
});

// Next Button Logic
if (nextBtn) {
    nextBtn.addEventListener('click', () => {
        // Validation
        if (!phoneInput || !emailInput) return;

        const phoneValue = phoneInput.value.trim();
        const emailValue = emailInput.value.trim();

        // Simple Email Regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        let isValid = true;
        let errorMessage = '';

        if (phoneValue === '' || emailValue === '') {
            isValid = false;
            errorMessage = 'Please fill in all fields.';
        } else if (!emailRegex.test(emailValue)) {
            isValid = false;
            errorMessage = 'Please enter a valid email address.';
        } else if (phoneValue.length < 7) {
            isValid = false;
            errorMessage = 'Please enter a valid phone number.';
        }

        if (!isValid) {
            if (step1Error) {
                step1Error.style.display = 'block';
                step1Error.textContent = errorMessage;
            }
            // Visual feedback
            if (emailValue === '' || !emailRegex.test(emailValue)) emailInput.style.borderColor = 'red';
            else emailInput.style.borderColor = '';

            if (phoneValue === '' || phoneValue.length < 7) phoneInput.style.borderColor = 'red';
            else phoneInput.style.borderColor = '';

            return;
        }

        // Clear errors
        emailInput.style.borderColor = '';
        phoneInput.style.borderColor = '';

        // Success
        if (step1Error) step1Error.style.display = 'none';
        if (step1) step1.style.display = 'none';
        if (step2) step2.style.display = 'block';
    });
}

// Back Button Logic
if (backBtn) {
    backBtn.addEventListener('click', () => {
        if (step2) step2.style.display = 'none';
        if (step1) step1.style.display = 'block';
    });
}

// REAL Form Submission (Google Sheets)
if (leadForm) {
    leadForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const submitButton = document.getElementById('btnSubmit');
        const originalText = submitButton.innerText;

        // UI loading
        submitButton.innerText = 'Sending...';
        submitButton.disabled = true;

        const data = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            intent: document.getElementById('intent').value,
            project: document.getElementById('projectInterest').value
        };

        fetch("https://script.google.com/macros/s/AKfycbyU_JPHUS8yE63nAdjOTOVgI1pX0b1wqegUhjN7PB0rTTsbblm7Zy6EqgT19Yq9DI9_8w/exec", {
            method: "POST",
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },
            body: JSON.stringify(data)
        })
            .then(() => {

                // Google Analytics event
                if (typeof gtag === 'function') {
                    gtag('event', 'generate_lead', {
                        project: data.project,
                        method: 'Form Popup'
                    });
                }

                // Success UI
                submitButton.innerText = 'Sent Successfully!';
                submitButton.style.background = '#28a745';

                // Show success step
                if (step1) step1.style.display = 'none';
                if (step2) step2.style.display = 'none';
                const step3 = document.getElementById('step3');
                if (step3) step3.style.display = 'block';

                // Open PDF
                window.open('Insider_Guide/Guide.pdf', '_blank');

            })
            .catch(err => {
                submitButton.innerText = originalText;
                submitButton.disabled = false;
                alert("Error: " + err);
            });
    });
}

// Smooth Scroll for Anchors
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

// Fade In Scroll Animation
const observerOptions = { threshold: 0.1 };
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('fade-in-up');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

document.querySelectorAll('.project-card, .feature-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
    observer.observe(el);
});

// Stats Logic
const statsSection = document.querySelector('.stats-section');
const counters = document.querySelectorAll('.counter');
const speed = 200;

const animateCounters = () => {
    counters.forEach(counter => {
        const updateCount = () => {
            const target = +counter.getAttribute('data-target');
            const count = +counter.innerText;
            const inc = target / speed;
            if (count < target) {
                counter.innerText = Math.ceil(count + inc);
                setTimeout(updateCount, 20);
            } else {
                counter.innerText = target;
            }
        };
        updateCount();
    });
};

if (statsSection) {
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounters();
                statsObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    statsObserver.observe(statsSection);
}

// Calculator Logic (Previous logic can be included here or kept global if no dependencies)
// To be safe, let's include it.

const calcPrice = document.getElementById('calcPrice');
const priceLabel = document.getElementById('priceLabel');
const calcDownPayment = document.getElementById('calcDownPayment');
const calcYears = document.getElementById('calcYears');
const downPaymentValue = document.getElementById('downPaymentValue');
const yearsValue = document.getElementById('yearsValue');
const monthlyResult = document.getElementById('monthlyResult');
const currencyInputs = document.querySelectorAll('input[name="currency"]');

let currentCurrency = 'AED';
const exchangeRate = 3.67;

const formatCurrency = (amount) => {
    return currentCurrency + ' ' + Math.round(amount).toLocaleString();
}

const calculatePayment = () => {
    if (!calcPrice || !calcDownPayment || !calcYears) return;
    let price = parseFloat(calcPrice.value);
    const downPaymentPercent = parseFloat(calcDownPayment.value);
    const years = parseFloat(calcYears.value);

    if (isNaN(price) || isNaN(downPaymentPercent) || isNaN(years)) return;

    const downPaymentAmount = price * (downPaymentPercent / 100);
    const remainingAmount = price - downPaymentAmount;
    const months = years * 12;
    const monthlyPayment = remainingAmount / months;

    if (downPaymentValue) downPaymentValue.innerText = downPaymentPercent;
    if (yearsValue) yearsValue.innerText = years;
    if (monthlyResult) monthlyResult.innerText = formatCurrency(monthlyPayment);
};

currencyInputs.forEach(input => {
    input.addEventListener('change', (e) => {
        const newCurrency = e.target.value;
        const currentPrice = parseFloat(calcPrice.value);
        if (newCurrency !== currentCurrency) {
            currentCurrency = newCurrency;
            if (priceLabel) priceLabel.innerText = `Property Price (${currentCurrency})`;
            if (currentCurrency === 'USD') {
                calcPrice.value = Math.round(currentPrice / exchangeRate);
            } else {
                calcPrice.value = Math.round(currentPrice * exchangeRate);
            }
            calculatePayment();
        }
    });


    if (calcPrice && calcDownPayment && calcYears) {
        calcPrice.addEventListener('input', calculatePayment);
        calcDownPayment.addEventListener('input', calculatePayment);
        calcYears.addEventListener('input', calculatePayment);
        calculatePayment();
    }
});

// Dynamic styles
const style = document.createElement('style');
style.innerHTML = `
    .feature-card.fade-in-up, .project-card.fade-in-up {
        opacity: 1 !important;
        transform: translateY(0) !important;
    }
`;
document.head.appendChild(style);
