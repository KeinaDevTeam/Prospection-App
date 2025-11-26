(function () {
  const form = document.getElementById('contactForm');
  const msg = document.getElementById('formMessage');
  const phoneSelect = document.getElementById('phoneCode');

  const COUNTRY_PLACEHOLDER = 'Sélectionnez un pays';

  function flagToISO(flag) {
    const it = [...flag];
    if (it.length < 2) return '';
    const a = it[0].codePointAt(0) - 0x1F1E6;
    const b = it[1].codePointAt(0) - 0x1F1E6;
    if (a < 0 || b < 0) return '';
    return String.fromCharCode(65 + a) + String.fromCharCode(65 + b);
  }

  function enhancePhoneOptions() {
    if (!phoneSelect) return [];
    const countries = [];
    let defaultIndex = -1;
    Array.from(phoneSelect.options).forEach((opt, idx) => {
      const raw = opt.textContent.trim();
      const match = raw.match(/^([\p{RI}]{2})\s+(\+\d+)\s+(.+)$/u);
      const flag = match ? match[1] : '';
      const dial = match ? match[2] : (opt.value || '');
      const name = match ? match[3] : raw;
      let iso = '';
      try { iso = flagToISO(flag); } catch (e) { iso = ''; }
      if (!iso && name) {
        iso = name.slice(0, 2).toUpperCase();
      }
      opt.textContent = `${flag} ${dial} ${iso}`.trim();
      opt.value = dial;
      if (name) opt.dataset.countryName = name;
      if (iso) {
        opt.dataset.iso = iso;
        countries.push({ iso, name });
        if (iso === 'TG') {
          defaultIndex = idx;
        }
      }
    });

    if (defaultIndex >= 0) {
      phoneSelect.selectedIndex = defaultIndex;
    }

    return countries;
  }

  function populateCountrySelect(countryEntries) {
    const sel = document.getElementById('country');
    if (!sel || !countryEntries.length) return;
    const unique = new Map();
    for (const entry of countryEntries) {
      if (entry.iso && entry.name && !unique.has(entry.iso)) {
        unique.set(entry.iso, entry.name);
      }
    }

    const items = Array.from(unique.entries()).sort((a, b) =>
      a[1].localeCompare(b[1], 'fr', { sensitivity: 'base' })
    );

    const frag = document.createDocumentFragment();
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = COUNTRY_PLACEHOLDER;
    frag.appendChild(placeholder);

    let hasDefault = false;
    for (const [iso, name] of items) {
      const option = document.createElement('option');
      option.value = iso;
      option.textContent = name;
      if (iso === 'TG') {
        option.selected = true;
        hasDefault = true;
      }
      frag.appendChild(option);
    }

    sel.innerHTML = '';
    sel.appendChild(frag);
    if (!hasDefault) {
      sel.value = 'FR';
    }
  }

  populateCountrySelect(enhancePhoneOptions());

  function setError(el, show) {
    if (show) el.classList.add('error'); else el.classList.remove('error');
  }

  function validatePhone(value) {
    // validate local phone number (digits, spaces, - or parentheses), 4-20 chars
    return /^[0-9 ()-]{4,20}$/.test(value.trim());
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    msg.textContent = '';

    const name = form.name;
    const phoneCode = form.phoneCode;
    const phoneNumber = form.phoneNumber;
    const email = form.email;
    const address = form.address;
    const country = form.country;
    const selectedCountry = country && country.selectedOptions.length
      ? country.selectedOptions[0]
      : null;
    const countryIso = selectedCountry ? selectedCountry.value : '';
    const countryLabel = selectedCountry ? selectedCountry.textContent : '';

    let ok = true;

    if (!name.value.trim()) { setError(name, true); ok = false; } else setError(name, false);
    if (!phoneNumber.value.trim() || !validatePhone(phoneNumber.value)) { setError(phoneNumber, true); ok = false; } else setError(phoneNumber, false);
    if (!email.value.trim()) { setError(email, true); ok = false; } else setError(email, false);
    if (address && address.value && address.value.trim().length > 50) { setError(address, true); ok = false; } else if (address) { setError(address, false); }
    if (!country.value) { setError(country, true); ok = false; } else setError(country, false);

    if (!ok) {
      msg.textContent = 'Veuillez corriger les champs en surbrillance.';
      msg.className = 'errorMessage';
      return;
    }

    // collect interests checkboxes
    const interests = Array.from(form.querySelectorAll('input[name="interests"]:checked')).map(i => i.value);
    const comments = form.comments ? form.comments.value.trim() : '';

    const payload = {
      name: name.value.trim(),
      phone: (phoneCode && phoneCode.value ? phoneCode.value + ' ' : '') + phoneNumber.value.trim(),
      email: email.value.trim(),
      interests: interests,
      // keep 'activities' for server compatibility (maps to partner.comment)
      activities: comments,
      comments: comments,
      country: countryLabel,
      country_iso: countryIso,
      address: address ? address.value.trim() : ''
    };

    // POST to server bridge which will create the contact in Odoo
    fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(async res => {
      const data = await res.json().catch(() => ({}));
      if (res.ok && data && data.success) {
        msg.className = 'successMessage';
        msg.textContent = 'Contact créé (id ' + (data.id || '') + '). Merci !';
        form.reset();
      } else {
        msg.className = 'errorMessage';
        msg.textContent = (data && data.error) ? data.error : 'Échec lors de la création du contact.';
      }
    }).catch(err => {
      console.error('Network error:', err);
      msg.className = 'errorMessage';
      msg.textContent = 'Erreur réseau lors de l’envoi. Vérifiez le serveur.';
    });
  });
})();
