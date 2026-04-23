class NamePrintUpsell extends HTMLElement {
  connectedCallback() {
    this.printVariantId = this.dataset.printVariantId;
    this.productTitle   = this.dataset.productTitle;
    this.maxChars       = parseInt(this.dataset.maxChars, 10) || 12;

    this.toggle      = this.querySelector('.name-print-upsell__toggle');
    this.panel       = this.querySelector('.name-print-upsell__panel');
    this.nameInput   = this.querySelector('.name-print-upsell__name-input');
    this.numberInput = this.querySelector('.name-print-upsell__number-input');
    this.charCount   = this.querySelector('.name-print-upsell__char-count');
    this.errorMsg    = this.querySelector('.name-print-upsell__error');

    if (this.toggle)      this.toggle.addEventListener('change', () => this.onToggle());
    if (this.nameInput)   this.nameInput.addEventListener('input', () => this.onNameInput());
    if (this.numberInput) this.numberInput.addEventListener('input', () => this.onNumberInput());

    this.buildSquadLists();
    this.interceptForm();
  }

  // ── Toggle ──────────────────────────────────────────────────────────────────

  onToggle() {
    const checked = this.toggle.checked;
    this.toggle.setAttribute('aria-expanded', checked ? 'true' : 'false');
    if (this.panel) this.panel.hidden = !checked;
    if (this.errorMsg) this.errorMsg.hidden = true;
    this.updateSubmitLabel(checked);
  }

  updateSubmitLabel(checked) {
    if (!this._form) return;
    const btn = this._form.querySelector('[type="submit"]');
    if (!btn) return;
    const labelEl = btn.querySelector('span:not([class])') || btn.querySelector('span') || btn;
    if (checked) {
      if (!labelEl.dataset.originalText) labelEl.dataset.originalText = labelEl.textContent.trim();
      labelEl.textContent = 'Add to cart + name printing';
    } else if (labelEl.dataset.originalText) {
      labelEl.textContent = labelEl.dataset.originalText;
    }
  }

  // ── Inputs ───────────────────────────────────────────────────────────────────

  onNameInput() {
    if (this.charCount) this.charCount.textContent = this.maxChars - this.nameInput.value.length;
    if (this.errorMsg && !this.errorMsg.hidden) this.errorMsg.hidden = true;
  }

  onNumberInput() {
    this.numberInput.value = this.numberInput.value.replace(/\D/g, '').slice(0, 2);
    if (this.errorMsg && !this.errorMsg.hidden) this.errorMsg.hidden = true;
  }

  // ── Squad list builder ───────────────────────────────────────────────────────
  // Raw data is stored in hidden <textarea> elements. Their .value property in
  // JS preserves newlines correctly — avoiding both the HTML-attribute
  // normalisation issue and Liquid's split:"\n" literal-string problem.

  parsePlayers(raw) {
    if (!raw || !raw.trim()) return [];
    return raw
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map(line => {
        // Try comma separator first: "Name, Number"
        const commaIdx = line.lastIndexOf(',');
        if (commaIdx > 0) {
          return { name: line.slice(0, commaIdx).trim(), number: line.slice(commaIdx + 1).trim() };
        }
        // Fallback: last word as number if it looks like 1-2 digits: "Name Number"
        const spaceIdx = line.lastIndexOf(' ');
        if (spaceIdx > 0) {
          const lastWord = line.slice(spaceIdx + 1).trim();
          if (/^\d{1,2}$/.test(lastWord)) {
            return { name: line.slice(0, spaceIdx).trim(), number: lastWord };
          }
        }
        return null;
      })
      .filter(p => p && p.name && p.number);
  }

  buildSquadLists() {
    const mensTa   = this.querySelector('.name-print-upsell__mens-data');
    const womensTa = this.querySelector('.name-print-upsell__womens-data');
    if (!mensTa && !womensTa) return;

    const mensPlayers   = this.parsePlayers(mensTa   ? mensTa.value   : '');
    const womensPlayers = this.parsePlayers(womensTa ? womensTa.value : '');

    const mensList    = this.querySelector('.name-print-upsell__squad-list[data-squad="mens"]');
    const womensList  = this.querySelector('.name-print-upsell__squad-list[data-squad="womens"]');
    const tabsWrapper = this.querySelector('.name-print-upsell__squad-tabs');

    const HIDDEN = 'name-print-upsell__squad-list--hidden';

    if (mensList) {
      mensPlayers.forEach(p => mensList.appendChild(this.makePlayerItem(p)));
      // Men's list is visible by default (no --hidden class in HTML)
      if (mensPlayers.length === 0) mensList.classList.add(HIDDEN);
    }
    if (womensList) {
      womensPlayers.forEach(p => womensList.appendChild(this.makePlayerItem(p)));
      // Women's list starts hidden; only show if there are no men's players
      if (womensPlayers.length === 0 || mensPlayers.length > 0) {
        womensList.classList.add(HIDDEN);
      } else {
        womensList.classList.remove(HIDDEN);
      }
    }

    const hasBoth = mensPlayers.length > 0 && womensPlayers.length > 0;

    if (tabsWrapper && hasBoth) {
      // Build Men's / Women's tab buttons
      const mensTab   = this.makeTabButton("Men's",   'mens',   true);
      const womensTab = this.makeTabButton("Women's", 'womens', false);
      tabsWrapper.appendChild(mensTab);
      tabsWrapper.appendChild(womensTab);
      tabsWrapper.classList.remove('name-print-upsell__squad-tabs--hidden');
      [mensTab, womensTab].forEach(t => t.addEventListener('click', () => this.switchTab(t.dataset.squad)));
    } else if (tabsWrapper) {
      // Single squad — add a small label instead of tabs
      tabsWrapper.classList.add('name-print-upsell__squad-tabs--hidden');
      const label = document.createElement('p');
      label.className = 'name-print-upsell__squad-label';
      label.textContent = mensPlayers.length > 0 ? "Men's squad" : "Women's squad";
      tabsWrapper.insertAdjacentElement('afterend', label);
    }

    this.querySelectorAll('.name-print-upsell__player').forEach(btn => {
      btn.addEventListener('click', () => this.selectPlayer(btn.dataset.name, btn.dataset.number));
    });
  }

  makePlayerItem(player) {
    const li  = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'name-print-upsell__player';
    btn.dataset.name   = player.name;
    btn.dataset.number = player.number;
    btn.innerHTML = `<span class="name-print-upsell__player-name">${this.esc(player.name)}</span><span class="name-print-upsell__player-number">#${this.esc(player.number)}</span>`;
    li.appendChild(btn);
    return li;
  }

  makeTabButton(label, squad, active) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'name-print-upsell__squad-tab' + (active ? ' name-print-upsell__squad-tab--active' : '');
    btn.dataset.squad = squad;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
    btn.textContent = label;
    return btn;
  }

  esc(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  switchTab(squad) {
    this.querySelectorAll('.name-print-upsell__squad-tab').forEach(t => {
      const active = t.dataset.squad === squad;
      t.classList.toggle('name-print-upsell__squad-tab--active', active);
      t.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    this.querySelectorAll('.name-print-upsell__squad-list').forEach(list => {
      list.classList.toggle('name-print-upsell__squad-list--hidden', list.dataset.squad !== squad);
    });
  }

  // ── Player buttons ────────────────────────────────────────────────────────────

  initPlayerButtons() {
    // Player buttons are built dynamically in buildSquadLists(); this is a no-op.
  }

  selectPlayer(name, number) {
    if (this.nameInput) { this.nameInput.value = name; this.onNameInput(); }
    if (this.numberInput) this.numberInput.value = number;

    // Open the custom entry section, close the squad picker
    const accordions = this.querySelectorAll('.name-print-upsell__accordion');
    accordions.forEach((acc, i) => { acc.open = (i === 0); });

    if (this.errorMsg) this.errorMsg.hidden = true;
  }

  // ── Form interception ────────────────────────────────────────────────────────

  interceptForm() {
    const scope = this.closest('section, [id^="MainProduct"]');
    const form  = (scope ? scope.querySelector('product-form form') : null)
               || document.querySelector('product-form form');
    if (!form) return;
    this._form = form;
    form.addEventListener('submit', (e) => this.onFormSubmit(e), true);
  }

  onFormSubmit(event) {
    if (!this.toggle || !this.toggle.checked) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const name   = this.nameInput   ? this.nameInput.value.trim()   : '';
    const number = this.numberInput ? this.numberInput.value.trim() : '';

    if (!name || !number || !/^\d{1,2}$/.test(number)) {
      if (this.errorMsg) {
        this.errorMsg.hidden = false;
        this.errorMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      return;
    }

    if (this.errorMsg) this.errorMsg.hidden = true;

    const formData = new FormData(this._form);
    const body     = new URLSearchParams();

    // items[0] = print service (added first → appears below main product in cart)
    body.append('items[0][id]',                       this.printVariantId);
    body.append('items[0][quantity]',                 '1');
    body.append('items[0][properties][Printed Name]', name);
    body.append('items[0][properties][Number]',       number);
    body.append('items[0][properties][_for_product]', this.productTitle);

    // items[1] = main product (added last → appears above)
    body.append('items[1][id]',                       formData.get('id'));
    body.append('items[1][quantity]',                 formData.get('quantity') || '1');
    body.append('items[1][properties][Printed Name]', name);
    body.append('items[1][properties][Number]',       number);

    for (const [key, value] of formData.entries()) {
      if (key !== 'id' && key !== 'quantity' && !key.startsWith('properties')) {
        body.append(`items[1][${key}]`, value);
      }
    }

    this.setLoading(true);

    fetch('/cart/add.js', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body.toString()
    })
      .then(r => r.json())
      .then(data => {
        if (data.status) {
          console.error('Cart add error:', data.description || data.message);
          return;
        }

        // Reset the upsell after a successful add
        if (this.toggle) { this.toggle.checked = false; this.toggle.setAttribute('aria-expanded', 'false'); }
        if (this.panel)       this.panel.hidden = true;
        if (this.nameInput)   this.nameInput.value = '';
        if (this.numberInput) this.numberInput.value = '';
        if (this.charCount)   this.charCount.textContent = this.maxChars;
        this.updateSubmitLabel(false);

        this.dispatchEvent(new CustomEvent('cart:refresh', { bubbles: true }));

        const cartDrawer = document.querySelector('cart-drawer');
        if (cartDrawer && typeof cartDrawer.open === 'function') {
          return fetch('/cart.js')
            .then(r => r.json())
            .then(cart => {
              document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart } }));
              cartDrawer.open();
            });
        }
      })
      .catch(err => console.error('Name print upsell error:', err))
      .finally(() => this.setLoading(false));
  }

  setLoading(loading) {
    const btn = this._form ? this._form.querySelector('[type="submit"]') : null;
    if (btn) { btn.disabled = loading; btn.setAttribute('aria-busy', loading ? 'true' : 'false'); }
  }
}

customElements.define('name-print-upsell', NamePrintUpsell);
