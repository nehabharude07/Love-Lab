const form = document.getElementById('love-form');
const submitBtn = document.getElementById('submit-btn');
const formError = document.getElementById('form-error');
const resultWrap = document.getElementById('result-wrap');
const tiltOuter = document.getElementById('tilt-outer');
const resultCard = document.getElementById('result-card');

const STAT_META = {
  communication: { label: 'COMMUNICATION SYNC' },
  chaos: { label: 'CHAOS METER' },
  spice: { label: 'SPICE LEVEL' },
  long_term: { label: 'LONG-TERM POTENTIAL' },
};

let readingCounter = 0;

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.classList.add('hidden');

  const payload = {
    name1: document.getElementById('name1').value,
    dob1: document.getElementById('dob1').value,
    name2: document.getElementById('name2').value,
    dob2: document.getElementById('dob2').value,
  };

  submitBtn.disabled = true;
  submitBtn.querySelector('span').textContent = 'ANALYZING...';

  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Something went wrong');
    }

    renderResult(data);
  } catch (err) {
    formError.textContent = err.message;
    formError.classList.remove('hidden');
  } finally {
    submitBtn.disabled = false;
    submitBtn.querySelector('span').textContent = 'RUN ANALYSIS';
  }
});

function renderResult(data) {
  readingCounter += 1;
  document.getElementById('reading-no').textContent = String(readingCounter).padStart(3, '0');
  document.getElementById('zodiac-vibe').textContent = data.zodiac_vibe;
  document.getElementById('pair-names').textContent = `${data.name1} \u00d7 ${data.name2}`;
  document.getElementById('overall-score').textContent = '00';
  document.getElementById('verdict-title').textContent = data.verdict_title;
  document.getElementById('verdict-line').textContent = data.verdict_line;
  document.getElementById('life-path-codes').textContent = `${data.life_path_1} \u2022 ${data.life_path_2}`;
  document.getElementById('name-codes').textContent = `${data.name_number_1} \u2022 ${data.name_number_2}`;

  // Stat bars
  const statBarsEl = document.getElementById('stat-bars');
  statBarsEl.innerHTML = '';
  Object.keys(STAT_META).forEach((key) => {
    const value = data[key];
    const wrap = document.createElement('div');
    wrap.className = 'stat-item';
    wrap.innerHTML = `
      <div class="flex items-center justify-between">
        <p class="readout-label">${STAT_META[key].label}</p>
        <span class="stat-value">${value}%</span>
      </div>
      <div class="stat-track"><div class="stat-fill" data-target="${value}"></div></div>
    `;
    statBarsEl.appendChild(wrap);
  });

  resultWrap.classList.remove('hidden');
  resultWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Animate gauge arc (circumference ~ 251.2 for this path)
  const arc = document.getElementById('gauge-arc');
  const circumference = 251.2;
  const offset = circumference - (circumference * data.overall) / 100;
  requestAnimationFrame(() => {
    arc.style.strokeDashoffset = String(offset);
    animateCount('overall-score', data.overall);
    document.querySelectorAll('.stat-fill').forEach((el) => {
      requestAnimationFrame(() => { el.style.width = el.dataset.target + '%'; });
    });
  });

  spawnHearts(data.overall);
}

function animateCount(elId, target) {
  const el = document.getElementById(elId);
  const duration = 1200;
  const start = performance.now();
  function tick(now) {
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function spawnHearts(score) {
  const count = score >= 75 ? 18 : score >= 45 ? 10 : 5;
  const emojis = score >= 75 ? ['\ud83d\udc96', '\u2728', '\ud83d\udc8d'] : score >= 45 ? ['\ud83d\udc95', '\ud83c\udf38'] : ['\ud83e\udd7a', '\ud83c\udf27\ufe0f'];
  for (let i = 0; i < count; i++) {
    const span = document.createElement('span');
    span.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    span.style.position = 'fixed';
    span.style.left = Math.random() * 100 + 'vw';
    span.style.top = '100vh';
    span.style.fontSize = (14 + Math.random() * 18) + 'px';
    span.style.zIndex = '50';
    span.style.pointerEvents = 'none';
    span.style.transition = `transform ${2 + Math.random() * 1.5}s ease-out, opacity ${2 + Math.random()}s ease-out`;
    document.body.appendChild(span);
    requestAnimationFrame(() => {
      span.style.transform = `translateY(-${90 + Math.random() * 20}vh) rotate(${Math.random() * 360}deg)`;
      span.style.opacity = '0';
    });
    setTimeout(() => span.remove(), 4000);
  }
}

// --- 3D tilt interaction ---
const MAX_TILT = 10;
tiltOuter.addEventListener('mousemove', (e) => {
  const rect = tiltOuter.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;
  const y = (e.clientY - rect.top) / rect.height;
  const rotateY = (x - 0.5) * MAX_TILT * 2;
  const rotateX = (0.5 - y) * MAX_TILT * 2;
  resultCard.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.01)`;
});
tiltOuter.addEventListener('mouseleave', () => {
  resultCard.style.transform = 'rotateX(0deg) rotateY(0deg) scale(1)';
});
// touch support: gentle tilt based on device orientation not required; reset on touch end
tiltOuter.addEventListener('touchend', () => {
  resultCard.style.transform = 'rotateX(0deg) rotateY(0deg) scale(1)';
});

// --- Download result card as image ---
document.getElementById('download-btn').addEventListener('click', async () => {
  const btn = document.getElementById('download-btn');
  btn.textContent = 'Preparing...';
  const prevTransform = resultCard.style.transform;
  resultCard.style.transform = 'none';
  try {
    const canvas = await html2canvas(resultCard, {
      backgroundColor: '#180a2b',
      scale: 2,
      useCORS: true,
    });
    const link = document.createElement('a');
    link.download = 'love-lab-result.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (err) {
    console.error(err);
  } finally {
    resultCard.style.transform = prevTransform;
    btn.textContent = 'Save result card';
  }
});

document.getElementById('retry-btn').addEventListener('click', () => {
  resultWrap.classList.add('hidden');
  document.getElementById('form-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
});