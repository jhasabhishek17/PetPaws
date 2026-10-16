/**
 * PetPaws Client-Side Interactive JavaScript
 * 
 * Handles UI interactions, animated toast feedback, live search filtering,
 * modal triggers, and form validations.
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log('🐾 PetPaws Interactive Animations & Scripts Initialized!');

  // Tooltip Initialization
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });

  // Dynamic Search Input Animation
  const searchInput = document.getElementById('petSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      const petCards = document.querySelectorAll('.pet-card-col');
      
      petCards.forEach(card => {
        const title = card.getAttribute('data-title')?.toLowerCase() || '';
        const breed = card.getAttribute('data-breed')?.toLowerCase() || '';
        if (title.includes(query) || breed.includes(query)) {
          card.style.display = 'block';
          card.classList.add('animate-fade-in');
        } else {
          card.style.display = 'none';
        }
      });
    });
  }
});

/**
 * Custom Toast Alert Notification Helper
 * 
 * @param {string} message - Toast message to display
 * @param {string} type - 'success' | 'danger' | 'info'
 */
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer') || createToastContainer();
  
  const toastEl = document.createElement('div');
  toastEl.className = `toast align-items-center text-white bg-${type} border-0 shadow-lg animate-fade-in mb-2`;
  toastEl.setAttribute('role', 'alert');
  toastEl.setAttribute('aria-live', 'assertive');
  toastEl.setAttribute('aria-atomic', 'true');
  
  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body font-weight-bold">
        ${type === 'success' ? '✅' : '⚠️'} ${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;
  
  container.appendChild(toastEl);
  const bsToast = new bootstrap.Toast(toastEl, { delay: 4000 });
  bsToast.show();

  toastEl.addEventListener('hidden.bs.toast', () => {
    toastEl.remove();
  });
}

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toastContainer';
  container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
  container.style.zIndex = '9999';
  document.body.appendChild(container);
  return container;
}
