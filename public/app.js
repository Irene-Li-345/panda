const menu = [
  ['scallion', 'Scallion Pancakes', 'Appetizers', 'Crisp, flaky pancakes with dipping sauce.', 625],
  ['dumplings', 'Pork Dumplings', 'Appetizers', 'Six pan-fried dumplings with ginger soy.', 795],
  ['tso', 'General Tso’s Chicken', 'Entrées', 'Crispy chicken in a sweet, spicy sauce.', 1495],
  ['broccoli', 'Beef with Broccoli', 'Entrées', 'Sliced beef and broccoli in savory brown sauce.', 1595],
  ['lomein', 'Vegetable Lo Mein', 'Rice & Noodles', 'Wok-tossed noodles with mixed vegetables.', 1095],
  ['rice', 'Chicken Fried Rice', 'Rice & Noodles', 'Wok-fried rice with chicken, egg and vegetables.', 1125],
];
const $ = id => document.getElementById(id);
const paletteToggle = $('palette-toggle');
const paletteKey = 'panda-prototype-theme';
function setPalette(classic) {
  document.documentElement.dataset.theme = classic ? 'classic' : 'bamboo';
  paletteToggle.setAttribute('aria-pressed', String(classic));
}
setPalette(localStorage.getItem(paletteKey) === 'classic');
paletteToggle.onclick = () => {
  const classic = paletteToggle.getAttribute('aria-pressed') !== 'true';
  localStorage.setItem(paletteKey, classic ? 'classic' : 'bamboo');
  setPalette(classic);
};
window.addEventListener('storage', event => {
  if (event.key === paletteKey) setPalette(event.newValue === 'classic');
});
const money = cents => (cents / 100).toLocaleString('en-US', {style: 'currency', currency: 'USD'});
const time = value => new Intl.DateTimeFormat('en-US', {timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit'}).format(value);
const cardPaymentNote = '$15 minimum for cards and Apple Pay.';
const orderPrefix = 'panda-prototype-order:';
const kitchenNames = {
  'Scallion Pancakes': '葱油饼',
  'Pork Dumplings': '猪肉饺子',
  'General Tso’s Chicken': '左宗棠鸡',
  'Beef with Broccoli': '西兰花牛肉',
  'Vegetable Lo Mein': '蔬菜捞面',
  'Chicken Fried Rice': '鸡肉炒饭',
};
const pauseKey = 'panda-prototype-paused';
const paused = () => localStorage.getItem(pauseKey) === 'true';
const kitchen = new URLSearchParams(location.search).get('view') === 'kitchen';
const cart = new Map();
const lines = () => menu.filter(([id]) => cart.has(id)).map(
  ([id, name, , , price]) => ({name, price, quantity: cart.get(id)})
);
let category = 'All';
let challenge;
let countdown;
let audio;
let ringing;
let seen = new Set();

function showMenu() {
  const query = $('search').value.trim().toLowerCase();
  const matches = menu.filter(([, name, group]) =>
    (category === 'All' || group === category) && name.toLowerCase().includes(query));
  $('dishes').innerHTML = matches.map(([id, name, , description, price]) =>
    `<article class="dish"><div><strong>${name}</strong><p>${description}</p></div>
      <div class="dish-action"><strong>${money(price)}</strong>
      <button data-add="${id}" aria-label="Add ${name}">+ Add</button></div></article>`
  ).join('') || '<p>No dishes match your search.</p>';
}

function showCart() {
  $('cart-items').innerHTML = menu.filter(([id]) => cart.has(id)).map(([id, name]) =>
    `<div class="cart-line"><span>${name}</span><div class="quantity">
      <button data-change="-1" data-id="${id}" aria-label="Remove one ${name}">−</button>
      <span>${cart.get(id)}</span>
      <button data-change="1" data-id="${id}" aria-label="Add one ${name}">+</button>
    </div></div>`
  ).join('') || '<p class="muted">Your cart is empty.</p>';
  $('total').textContent = money(lines().reduce((sum, line) => sum + line.price * line.quantity, 0));
  $('checkout').disabled = !cart.size || paused();
  $('checkout').textContent = paused() ? 'Online ordering paused' : 'Continue to checkout';
}

function changeQuantity(id, delta) {
  const quantity = Math.min(20, (cart.get(id) || 0) + delta);
  if (quantity > 0) cart.set(id, quantity);
  else cart.delete(id);
  showCart();
}

function requestCode() {
  challenge = undefined;
  clearInterval(countdown);
  $('dialog-title').textContent = 'Pickup checkout';
  $('checkout-content').innerHTML = `<p>Pickup only in Lambertville, NJ · About 15 minutes · Pay at pickup</p>
    <p class="muted">${cardPaymentNote}</p>
    <form id="phone-form"><label>Phone number<input type="tel" id="phone" required maxlength="24"
    placeholder="(609) 555-0142" autocomplete="off"></label>
    <p class="muted">Use a sample number. The prototype simulates Twilio and sends no texts.</p>
    <p class="error" id="phone-error" role="alert"></p><button class="button">Get a code</button></form>`;
  $('phone-form').addEventListener('submit', event => {
    event.preventDefault();
    const phone = $('phone').value.trim();
    const digits = phone.replace(/\D/g, '');
    if (!/^[+\d ().-]+$/.test(phone) || !/^(1)?[2-9]\d{2}[2-9]\d{6}$/.test(digits)) {
      $('phone-error').textContent = 'Enter a valid 10-digit U.S. phone number.';
      return;
    }
    verifyCode();
  });
  $('phone').focus();
}

function verifyCode() {
  clearInterval(countdown);
  challenge = {code: String(100000 + Math.floor(Math.random() * 900000)), expires: Date.now() + 300000};
  $('dialog-title').textContent = 'Verify your phone';
  $('checkout-content').innerHTML = `<p>Simulated text code <strong>${challenge.code}</strong></p>
    <p id="expiry"></p><form id="code-form"><label>Six-digit code
    <input id="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required></label>
    <p class="error" id="code-error" role="alert"></p><button class="button" id="submit-order">Place pickup order</button></form>
    <div class="staff-actions"><button id="new-code">Get a new code</button><button id="change-phone">Change number</button></div>`;
  const updateExpiry = () => {
    const seconds = Math.max(0, Math.ceil((challenge.expires - Date.now()) / 1000));
    $('expiry').textContent = seconds ? `Code expires in ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : 'Code expired. Get a new code to continue.';
    $('submit-order').disabled = !seconds;
    if (!seconds) clearInterval(countdown);
  };
  updateExpiry();
  countdown = setInterval(updateExpiry, 500);
  $('new-code').onclick = verifyCode;
  $('change-phone').onclick = requestCode;
  $('code-form').onsubmit = event => {
    event.preventDefault();
    if (!challenge || Date.now() >= challenge.expires) return updateExpiry();
    if ($('code').value !== challenge.code) {
      $('code-error').textContent = 'That code doesn’t match. Try again.';
      return;
    }
    if (paused()) {
      $('code-error').textContent = 'Online ordering is paused. Your cart is still available.';
      return;
    }
    saveOrder();
  };
  $('code').focus();
}

function saveOrder() {
  const created = Date.now();
  const number = crypto.getRandomValues(new Uint32Array(1))[0].toString(36).toUpperCase().padStart(7, '0');
  const order = {number, created, pickup: created + 15 * 60000, items: lines()};
  try {
    localStorage.setItem(orderPrefix + number, JSON.stringify(order));
  } catch {
    $('code-error').textContent = 'We couldn’t save the order. Please try again.';
    return;
  }
  clearInterval(countdown);
  challenge = undefined;
  cart.clear();
  showCart();
  $('dialog-title').textContent = 'Order received';
  $('checkout-content').innerHTML = `<p><strong>Order #${number}</strong></p>
    <p>Pick up around <strong>${time(order.pickup)} ET</strong> in Lambertville, NJ.</p>
    <p>Pickup only · Pay at pickup</p><p class="muted">${cardPaymentNote}</p><p class="muted">Demo confirmation saved. No text was sent.</p>
    <button class="button" id="done">Done</button>`;
  $('done').onclick = () => $('dialog').close();
  $('done').focus();
}

function stopAlert() {
  clearInterval(ringing);
  $('silence').hidden = true;
}

function alertKitchen() {
  if (!audio || audio.state !== 'running') return;
  stopAlert();
  $('silence').hidden = false;
  let remaining = 5;
  const play = () => {
    const tone = audio.createOscillator();
    const volume = audio.createGain();
    tone.frequency.value = 880;
    volume.gain.setValueAtTime(.24, audio.currentTime);
    volume.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .3);
    tone.connect(volume).connect(audio.destination);
    tone.start();
    tone.stop(audio.currentTime + .3);
    if (--remaining === 0) stopAlert();
  };
  play();
  ringing = setInterval(play, 800);
}

function bilingual(element, chinese, english) {
  const zh = document.createElement('span');
  zh.className = 'zh';
  zh.lang = 'zh-Hans';
  zh.textContent = chinese;
  const en = document.createElement('span');
  en.className = 'en';
  en.textContent = english;
  element.replaceChildren(zh, en);
}

const chineseTime = value => new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', hour12: false,
}).format(value);

function showOrders(notify = false) {
  const orders = Object.keys(localStorage).filter(key => key.startsWith(orderPrefix))
    .map(key => JSON.parse(localStorage.getItem(key))).filter(Boolean)
    .sort((first, second) => second.created - first.created);
  if (notify && orders.some(order => !seen.has(order.number))) alertKitchen();
  seen = new Set(orders.map(order => order.number));
  const tickets = orders.map(order => {
    const ticket = document.createElement('article');
    ticket.className = 'ticket';
    const heading = document.createElement('h3');
    bilingual(heading, '订单 #' + order.number, 'Order #' + order.number);
    const pickup = document.createElement('p');
    bilingual(pickup, `接单 ${chineseTime(order.created)} · 预计自取 ${chineseTime(order.pickup)}`,
      `Received ${time(order.created)} · Pickup around ${time(order.pickup)} ET`);
    const items = document.createElement('ul');
    for (const line of order.items) {
      const item = document.createElement('li');
      bilingual(item, `${line.quantity} × ${kitchenNames[line.name] ?? line.name}`,
        `${line.quantity} × ${line.name}`);
      items.append(item);
    }
    ticket.append(heading, pickup, items);
    return ticket;
  });
  $('orders').replaceChildren(...tickets);
  if (!orders.length) bilingual($('orders'), '暂无订单', 'No orders yet.');
  if (paused()) bilingual($('pause'), '恢复线上接单', 'Resume online orders');
  else bilingual($('pause'), '暂停线上接单', 'Pause online orders');
}

if (kitchen) {
  $('customer').hidden = true;
  $('kitchen').hidden = false;
  bilingual($('sound'), '开启提示音', 'Enable sound');
  bilingual($('silence'), '关闭本次提示音', 'Silence alert');
  $('sound').onclick = async () => {
    audio ??= new AudioContext();
    await audio.resume();
    if (audio.state === 'running') {
      bilingual($('sound'), '提示音已开启', 'Sound enabled');
      $('sound').disabled = true;
    }
  };
  $('silence').onclick = stopAlert;
  $('pause').onclick = () => {
    localStorage.setItem(pauseKey, String(!paused()));
    showOrders();
  };
  showOrders();
  window.addEventListener('storage', () => showOrders(true));
} else if ($('menu')) {
  for (const group of ['All', ...new Set(menu.map(dish => dish[2]))]) {
    const button = document.createElement('button');
    button.textContent = group;
    button.setAttribute('aria-pressed', String(group === category));
    button.onclick = () => {
      category = group;
      for (const filter of $('filters').children) {
        filter.setAttribute('aria-pressed', String(filter === button));
      }
      showMenu();
    };
    $('filters').append(button);
  }
  $('search').oninput = showMenu;
  $('dishes').onclick = event => {
    const button = event.target.closest('[data-add]');
    if (button) changeQuantity(button.dataset.add, 1);
  };
  $('cart-items').onclick = event => {
    const button = event.target.closest('[data-change]');
    if (button) changeQuantity(button.dataset.id, Number(button.dataset.change));
  };
  $('checkout').onclick = () => {
    $('dialog').showModal();
    requestCode();
  };
  $('close').onclick = () => $('dialog').close();
  $('dialog').onclose = () => {
    clearInterval(countdown);
    challenge = undefined;
  };
  window.addEventListener('storage', event => {
    if (event.key === pauseKey) showCart();
  });
  showMenu();
  showCart();
}
