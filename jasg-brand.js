(() => {
    const storageKey = 'jasg_company';

    function renderSharedLogo() {
        let company = {};
        try {
            company = JSON.parse(localStorage.getItem(storageKey) || '{}');
        } catch (error) {
            console.error('No se pudo cargar el logo de JASG', error);
        }

        document.querySelectorAll('[data-jasg-company-name]').forEach((element) => {
            element.textContent = company.name || 'SERVICIO TÉCNICO JASG Spa';
        });
        document.querySelectorAll('[data-jasg-company-address]').forEach((element) => {
            element.textContent = company.address || '';
        });
        document.querySelectorAll('[data-jasg-company-contact]').forEach((element) => {
            element.textContent = [company.phone, company.email].filter(Boolean).join(' | ');
        });

        document.querySelectorAll('[data-jasg-brand-logo]').forEach((image) => {
            const fallback = image.parentElement.querySelector('[data-jasg-brand-fallback]');
            if (company.customIcon) {
                image.src = company.customIcon;
                image.classList.remove('hidden');
                fallback?.classList.add('hidden');
            } else {
                image.removeAttribute('src');
                image.classList.add('hidden');
                fallback?.classList.remove('hidden');
            }

            image.onerror = () => {
                image.classList.add('hidden');
                fallback?.classList.remove('hidden');
            };
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderSharedLogo, { once: true });
    } else {
        renderSharedLogo();
    }

    window.addEventListener('storage', (event) => {
        if (event.key === storageKey) renderSharedLogo();
    });
})();
