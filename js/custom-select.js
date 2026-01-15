/**
 * Custom Select Dropdown
 * Converts standard <select> elements into styled custom dropdowns
 */

class CustomSelect {
    constructor(selectElement) {
        this.select = selectElement;
        this.options = Array.from(this.select.options);
        this.wrapper = null;
        this.trigger = null;
        this.customOptions = null;
        this.isOpen = false;

        this.init();
    }

    init() {
        // Hide original select
        this.select.style.display = 'none';

        // Create Wrapper
        this.wrapper = document.createElement('div');
        this.wrapper.classList.add('custom-select-wrapper');
        this.select.parentNode.insertBefore(this.wrapper, this.select);
        this.wrapper.appendChild(this.select);

        // Create Custom Select Container
        const customSelect = document.createElement('div');
        customSelect.classList.add('custom-select');
        this.wrapper.appendChild(customSelect);

        // Create Trigger
        this.trigger = document.createElement('div');
        this.trigger.classList.add('custom-select__trigger');
        const selectedOption = this.options[this.select.selectedIndex];
        
        let initialText = selectedOption ? selectedOption.textContent : this.options[0].textContent;
        // Default placeholder style if value is empty
        if (selectedOption && selectedOption.value === "") {
             this.trigger.style.color = "var(--text-muted)";
        }

        this.trigger.innerHTML = `
            <span>${initialText}</span>
            <div class="custom-select__arrow">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
        `;
        customSelect.appendChild(this.trigger);

        // Create Options List
        this.customOptions = document.createElement('div');
        this.customOptions.classList.add('custom-options');
        
        this.options.forEach(option => {
            // Skip placeholder option if you want, or include it
            // Here we include everything but style it
            const optionEl = document.createElement('div');
            optionEl.classList.add('custom-option');
            optionEl.textContent = option.textContent;
            optionEl.dataset.value = option.value;
            
            if (option.selected) {
                optionEl.classList.add('selected');
            }

            optionEl.addEventListener('click', () => {
                this.selectOption(option.value, option.textContent, optionEl);
            });

            this.customOptions.appendChild(optionEl);
        });

        customSelect.appendChild(this.customOptions);

        // Event Listeners
        this.trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!customSelect.contains(e.target)) {
                this.close();
            }
        });
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        this.wrapper.querySelector('.custom-select').classList.add('open');
        this.isOpen = true;
    }

    close() {
        this.wrapper.querySelector('.custom-select').classList.remove('open');
        this.isOpen = false;
    }

    selectOption(value, text, optionEl) {
        // Update original select
        this.select.value = value;
        this.select.dispatchEvent(new Event('change')); // Trigger change event

        // Update trigger text
        this.trigger.querySelector('span').textContent = text;
        
        // Update color (if it was placeholder)
        if (value === "") {
             this.trigger.style.color = "var(--text-muted)";
        } else {
             this.trigger.style.color = "var(--text-primary)";
        }

        // Update selected class
        this.customOptions.querySelectorAll('.custom-option').forEach(el => {
            el.classList.remove('selected');
        });
        optionEl.classList.add('selected');

        this.close();
    }
}

// Initialize on DOM Ready or calling manually
document.addEventListener('DOMContentLoaded', () => {
    // Find select elements explicitly marked or the specific one
    const targetSelect = document.getElementById('file_type');
    if (targetSelect) {
        new CustomSelect(targetSelect);
    }
});
