(function () {
  const form = document.getElementById('contactForm');
  const msg = document.getElementById('formMessage');

  // Transform phoneCode options to show: <flag> <code> <ISO>
  (function shortenPhoneOptions() {
    const sel = document.getElementById('phoneCode');
    if (!sel) return;
    function flagToISO(flag) {
      // flag is two regional indicator symbols; convert to ISO alpha-2
      const it = [...flag];
      if (it.length < 2) return '';
      const a = it[0].codePointAt(0) - 0x1F1E6;
      const b = it[1].codePointAt(0) - 0x1F1E6;
      if (a < 0 || b < 0) return '';
      return String.fromCharCode(65 + a) + String.fromCharCode(65 + b);
    }

    for (const opt of Array.from(sel.options)) {
      const raw = opt.textContent.trim();
      // Expect format: "<flag> <code> <Country name>"
      const parts = raw.split(/\s+/);
      if (parts.length < 2) continue;
      const possibleFlag = parts[0];
      const possibleCode = parts[1];
      let iso = '';
      try { iso = flagToISO(possibleFlag); } catch (e) { iso = ''; }
      if (!iso) {
        // fallback: take first two letters of country name
        const name = parts.slice(2).join(' ');
        iso = name ? name.slice(0,2).toUpperCase() : '';
      }
      opt.textContent = `${possibleFlag} ${possibleCode} ${iso}`;
    }
  })();

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

    const payload = {
      name: name.value.trim(),
      phone: (phoneCode && phoneCode.value ? phoneCode.value + ' ' : '') + phoneNumber.value.trim(),
      email: email.value.trim(),
      activities: form.activities.value.trim(),
      country: country.value,
      address: address ? address.value.trim() : ''
    };

    console.log('Formulaire soumis (simulation):', payload);
    msg.className = '';
    msg.textContent = 'Formulaire envoyé (simulation). Merci !';
    form.reset();
  });
})();
