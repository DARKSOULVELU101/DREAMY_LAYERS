document.addEventListener('DOMContentLoaded', () => {

  setTimeout(() => {
    const loading = document.getElementById('loading-screen');
    loading.style.opacity = '0';
    setTimeout(() => loading.style.display = 'none', 500);
  }, 1000);

  const navbar = document.getElementById('navbar');
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  });

  navToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
  });

  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('active');
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    });
  });

  const sliderContainer = document.getElementById('sliderContainer');
  const sliderDots = document.getElementById('sliderDots');
  let currentSlide = 0;
  let slides = [];
  let autoSlideInterval;

  fetch('/api/customer-photos')
    .then(res => res.json())
    .then(data => {
      if (data.success && data.photos.length > 0) {
        slides = data.photos;
        renderSlider();
      }
    });

  function renderSlider() {
    sliderContainer.innerHTML = '<div class="slider-track" id="sliderTrack"></div>';
    const track = document.getElementById('sliderTrack');
    sliderDots.innerHTML = '';

    slides.forEach((photo, i) => {
      const slide = document.createElement('div');
      slide.className = 'slider-slide';
      slide.innerHTML = `<img src="${photo}" alt="Happy Customer">`;
      track.appendChild(slide);

      const dot = document.createElement('div');
      dot.className = 'slider-dot' + (i === 0 ? ' active' : '');
      dot.addEventListener('click', () => goToSlide(i));
      sliderDots.appendChild(dot);
    });

    goToSlide(0);
    startAutoSlide();
  }

  function goToSlide(index) {
    const track = document.getElementById('sliderTrack');
    if (!track) return;
    currentSlide = index;
    track.style.transform = `translateX(-${index * 100}%)`;
    document.querySelectorAll('.slider-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
  }

  function startAutoSlide() {
    stopAutoSlide();
    autoSlideInterval = setInterval(() => {
      goToSlide((currentSlide + 1) % slides.length);
    }, 3000);
  }

  function stopAutoSlide() {
    if (autoSlideInterval) clearInterval(autoSlideInterval);
  }

  document.getElementById('prevBtn').addEventListener('click', () => {
    goToSlide((currentSlide - 1 + slides.length) % slides.length);
    startAutoSlide();
  });

  document.getElementById('nextBtn').addEventListener('click', () => {
    goToSlide((currentSlide + 1) % slides.length);
    startAutoSlide();
  });

  function calculatePrice() {
    const category = document.getElementById('cakeCategory').value;
    const weight = parseFloat(document.getElementById('weight').value) || 0;
    const quantity = parseInt(document.getElementById('quantity').value) || 1;
    const customization = document.getElementById('customization').value.trim();
    const kidsDiscount = document.getElementById('kidsDiscount').checked;

    let baseRate = 0;
    if (category === 'normal') baseRate = 450;
    else if (category === 'special') baseRate = 700;
    else if (category === 'ice') baseRate = 900;

    let total = baseRate * weight * quantity;
    if (customization && category !== 'normal') total += 200 * quantity;
    if (kidsDiscount) total *= 0.85;

    document.getElementById('totalAmount').textContent = '₹' + Math.round(total);
  }

  document.getElementById('cakeCategory').addEventListener('change', calculatePrice);
  document.getElementById('weight').addEventListener('change', calculatePrice);
  document.getElementById('quantity').addEventListener('input', calculatePrice);
  document.getElementById('customization').addEventListener('input', calculatePrice);
  document.getElementById('kidsDiscount').addEventListener('change', calculatePrice);

  const today = new Date().toISOString().split('T')[0];
  document.getElementById('deliveryDate').setAttribute('min', today);

  document.getElementById('orderForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('submitBtn');
    const feedback = document.getElementById('formFeedback');

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    feedback.className = 'form-feedback';
    feedback.style.display = 'none';

    const formData = {
      customerName: document.getElementById('customerName').value,
      contactNo: document.getElementById('contactNo').value,
      email: document.getElementById('email').value,
      deliveryAddress: document.getElementById('deliveryAddress').value,
      cakeType: document.getElementById('cakeType').value,
      cakeCategory: document.getElementById('cakeCategory').value,
      weight: document.getElementById('weight').value,
      quantity: document.getElementById('quantity').value,
      customization: document.getElementById('customization').value,
      deliveryDate: document.getElementById('deliveryDate').value,
      messageOnCake: document.getElementById('messageOnCake').value
    };

    try {
      const response = await fetch('/api/place-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.success) {
        feedback.className = 'form-feedback success';
        feedback.style.display = 'block';
        feedback.innerHTML = `
          <h4><i class="fas fa-check-circle"></i> Order Placed Successfully!</h4>
          <p>Order ID: <strong>${result.orderId}</strong></p>
          <p>Total Amount: <strong>₹${result.totalPrice}</strong></p>
          <p>We will contact you shortly to confirm your order.</p>
          <div style="margin-top:15px;display:flex;gap:10px;flex-wrap:wrap;">
            <a href="${result.whatsappUrl}" target="_blank" class="btn" style="background:#25D366;color:#fff;padding:10px 20px;border-radius:50px;text-decoration:none;font-size:14px;">
              <i class="fab fa-whatsapp"></i> View on WhatsApp
            </a>
          </div>
        `;
        this.reset();
        calculatePrice();
        setTimeout(() => {
          if (result.whatsappUrl) window.open(result.whatsappUrl, '_blank');
        }, 500);
      } else {
        feedback.className = 'form-feedback error';
        feedback.style.display = 'block';
        feedback.innerHTML = `<p><i class="fas fa-exclamation-circle"></i> ${result.message}</p>`;
      }
    } catch (error) {
      feedback.className = 'form-feedback error';
      feedback.style.display = 'block';
      feedback.innerHTML = '<p><i class="fas fa-exclamation-circle"></i> Network error. Please try again.</p>';
    }

    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Place Order';
  });

  document.querySelectorAll('.cake-card').forEach(card => {
    card.addEventListener('click', function() {
      const cakeType = this.dataset.cake;
      if (cakeType === 'custom') {
        document.getElementById('cakeType').value = 'Custom';
        document.getElementById('cakeCategory').value = 'special';
      } else if (cakeType === 'birthday') {
        document.getElementById('cakeType').value = 'Birthday';
      } else if (cakeType === 'wedding') {
        document.getElementById('cakeType').value = 'Wedding';
      } else if (cakeType === 'mango') {
        document.getElementById('cakeType').value = 'Mango Chocolate';
      } else if (cakeType === 'fruit') {
        document.getElementById('cakeType').value = 'Fruit Cake';
      } else if (cakeType === 'new-arrivals') {
        document.getElementById('cakeType').value = 'New Arrival';
      } else if (cakeType === 'dry') {
        document.getElementById('cakeType').value = 'Dry Cake';
      } else if (cakeType === 'combo') {
        document.getElementById('cakeType').value = 'Cake Combo';
      }
      calculatePrice();
      document.getElementById('order').scrollIntoView({ behavior: 'smooth' });
    });
  });

  calculatePrice();
});
