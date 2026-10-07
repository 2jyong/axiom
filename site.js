const page = document.body.dataset.page;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Keep the links shared from the first one-page draft useful.
if (page === 'home' && location.hash) {
  const oldLinks = {
    '#solutions': 'equipment.html',
    '#capability': 'engineering.html',
    '#process': 'engineering.html',
    '#projects': 'projects.html',
    '#contact': 'contact.html'
  };
  const destination = oldLinks[location.hash];
  if (destination) location.replace(destination);
}

const header = document.getElementById('siteHeader');
const syncHeader = () => header.classList.toggle('scrolled', scrollY > 35);
addEventListener('scroll', syncHeader, { passive: true });
syncHeader();

const menuToggle = document.getElementById('menuToggle');
const mobileMenu = document.getElementById('mobileMenu');
function closeMenu() {
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', '메뉴 열기');
  mobileMenu.classList.remove('open');
}
menuToggle.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') !== 'true';
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
  mobileMenu.classList.toggle('open', open);
});
mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
addEventListener('resize', () => { if (innerWidth > 820) closeMenu(); });

const intro = document.getElementById('intro');
let introTimer;
let openingController;
function finishIntro() {
  if (!intro || intro.classList.contains('complete')) return;
  clearTimeout(introTimer);
  intro.classList.add('complete');
  document.body.classList.remove('intro-active');
  intro.setAttribute('aria-hidden', 'true');
  setTimeout(() => openingController?.dispose(), 300);
}
if (intro) {
  document.body.classList.add('intro-active');
  // Every home load includes the opening on desktop and mobile. A reduced-motion
  // visitor receives a short steel-panel reveal instead of motor rotation.
  const reviewingOpening = new URLSearchParams(location.search).has('intro-frame');
  introTimer = setTimeout(finishIntro, reviewingOpening ? 120000 : 14000);
  import('./opening-3d.js').then(async module => {
    if (intro.classList.contains('complete')) return;
    openingController = await module.playOpening({element:intro,onComplete:finishIntro,reducedMotion:reduceMotion});
    if (intro.classList.contains('complete')) openingController.dispose();
  }).catch(() => {
    intro.classList.add('fallback-exit');
    setTimeout(finishIntro, 850);
  });
  document.getElementById('introSkip').addEventListener('click', finishIntro);
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeMenu(); finishIntro(); } });

const scenes = [...document.querySelectorAll('.story-scene')];
if (scenes.length && 'IntersectionObserver' in window && !reduceMotion) {
  document.body.classList.add('js-motion');
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('is-visible');
  }), { threshold: .25 });
  scenes.forEach(scene => observer.observe(scene));
} else scenes.forEach(scene => scene.classList.add('is-visible'));

const equipmentData = [
  { image:'assets/line.webp', alt:'자동 반송 설비 콘셉트 비주얼', overline:'01 / TRANSFER SYSTEM', title:'제품의 흐름을<br>끊김 없이 잇습니다.', body:'제품 크기와 공정 간 거리에 맞춰 컨베이어, 리프터, 로봇 핸들링을 조합합니다. 이송 중 정렬과 적재까지 이어지는 흐름을 설계합니다.', tags:['컨베이어','리프터','로봇 핸들링'] },
  { image:'assets/machining.webp', alt:'정밀 가공과 조립 설비 콘셉트 비주얼', overline:'02 / ASSEMBLY SYSTEM', title:'반복 조립의 기준을<br>정확하게 잡습니다.', body:'부품의 기준면과 체결 순서를 고려해 지그와 구동부를 구성합니다. 반복 동작에서도 위치가 흔들리지 않도록 구조를 검토합니다.', tags:['전용 지그','구동부','정밀 가공'] },
  { image:'assets/robot-cell.webp', alt:'검사 선별 자동화 설비 콘셉트 비주얼', overline:'03 / INSPECTION SYSTEM', title:'판정과 선별을<br>하나의 흐름으로.', body:'제품이 지나가는 흐름을 끊지 않고 확인할 수 있도록 센서, 비전 검사, 배출 구조를 통합합니다. 판정 기준과 작업 편의성을 함께 검토합니다.', tags:['비전 검사','센서 연동','자동 선별'] }
];
const equipTabs = [...document.querySelectorAll('.equipment-tabs [role=tab]')];
let equipTimer;
function selectEquipment(index, focus = false) {
  const item = equipmentData[index];
  if (!item) return;
  equipTabs.forEach((tab,i) => { tab.setAttribute('aria-selected', String(i===index)); tab.tabIndex = i===index ? 0 : -1; });
  const image = document.getElementById('equipImage');
  const photo = document.querySelector('.equipment-photo');
  const applyImage = () => { image.src = item.image; image.alt = item.alt; photo.classList.remove('changing'); };
  clearTimeout(equipTimer);
  if (reduceMotion) applyImage(); else { photo.classList.add('changing'); equipTimer = setTimeout(applyImage,180); }
  document.getElementById('equipPanel').setAttribute('aria-labelledby', equipTabs[index].id);
  document.getElementById('equipOverline').textContent = item.overline;
  document.getElementById('equipTitle').innerHTML = item.title;
  document.getElementById('equipBody').textContent = item.body;
  document.getElementById('equipTags').replaceChildren(...item.tags.map(label => { const span=document.createElement('span'); span.textContent=label; return span; }));
  if (focus) equipTabs[index].focus();
}
equipTabs.forEach((tab,index) => {
  tab.tabIndex = index===0 ? 0 : -1;
  tab.addEventListener('click', () => selectEquipment(index));
  tab.addEventListener('keydown', e => {
    if (!['ArrowRight','ArrowLeft','Home','End'].includes(e.key)) return;
    e.preventDefault();
    const next = e.key==='Home' ? 0 : e.key==='End' ? equipTabs.length-1 : (index+(e.key==='ArrowRight'?1:-1)+equipTabs.length)%equipTabs.length;
    selectEquipment(next,true);
  });
});

const processData = [
  ['01 / REQUIREMENTS','목표 생산량, 제품 형상, 설치 공간, 기존 라인과의 연결 조건을 함께 확인합니다. 처음에 기준을 명확히 해야 제작 이후의 변경을 줄일 수 있습니다.'],
  ['02 / ENGINEERING','동작 순서와 장비 크기를 설계하고, 주요 부품과 제어 방식을 검토합니다. 작업자 접근성과 유지보수 공간도 함께 확인합니다.'],
  ['03 / FABRICATION','도면에 따라 부품을 제작하고 구동부와 제어부를 조립합니다. 단계마다 치수와 동작을 확인하며 다음 공정으로 넘깁니다.'],
  ['04 / COMMISSIONING','반복 동작과 안전 인터록을 확인한 뒤 현장 조건에 맞춰 조정합니다. 작업자가 실제로 사용하는 흐름까지 점검합니다.']
];
const processButtons = [...document.querySelectorAll('.process-steps button')];
processButtons.forEach((button,index) => button.addEventListener('click', () => {
  processButtons.forEach((item,i) => { item.classList.toggle('is-active', i===index); item.setAttribute('aria-pressed', String(i===index)); });
  document.getElementById('processOverline').textContent = processData[index][0];
  document.getElementById('processBody').textContent = processData[index][1];
}));

const briefForm = document.getElementById('briefForm');
briefForm?.addEventListener('submit', e => {
  e.preventDefault();
  if (!briefForm.reportValidity()) return;
  const form = new FormData(briefForm);
  const content = `AXIOM ENGINEERING | 설비 제작 요청서\n\n적용 산업: ${form.get('industry')}\n필요한 설비: ${form.get('equipment')}\n\n공정에서 해결할 문제\n${form.get('requirements')}\n`;
  const url = URL.createObjectURL(new Blob(['\ufeff',content], { type:'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href=url; link.download='AXIOM_설비제작_요청서.txt';
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url),1000);
  document.getElementById('formFeedback').textContent='요청서가 저장되었습니다. 도면과 함께 상담할 때 활용해 주세요.';
});
