(function () {
  'use strict';

  // --- Configuration et Éléments DOM ---
  const API_BASE = ((window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) || '').replace(/\/$/, '');
  const form = document.getElementById('contactForm');
  const msg = document.getElementById('formMessage');
  const phoneSelect = document.getElementById('phoneCode');
  const countrySelect = document.getElementById('country');

  const COUNTRY_PLACEHOLDER = 'Sélectionnez un pays';
  const DEFAULT_COUNTRY_ISO = 'TG';

  // --- Fonctions Utilitaires ---

  // Convertit les emojis de drapeau en code ISO 3166-1 alpha-2
  function flagToISO(flag) {
    const it = [...flag];
    if (it.length < 2) return '';
    const a = it[0].codePointAt(0) - 0x1F1E6;
    const b = it[1].codePointAt(0) - 0x1F1E6;
    if (a < 0 || b < 0) return '';
    return String.fromCharCode(65 + a) + String.fromCharCode(65 + b);
  }

  // Ajoute ou retire la classe 'error'
  function setError(el, show) {
    if (show) el.classList.add('error'); else el.classList.remove('error');
  }

  // Valide le format du numéro de téléphone local (4-20 chars)
  function validatePhone(value) {
    return /^[0-9 ()-]{4,20}$/.test(value.trim());
  }
  
  // Valide l'e-mail (Optionnel: valide si vide OU s'il correspond au pattern)
  function validateEmail(value) {
    const trimmed = value.trim();
    if (trimmed === '') return true; 
    // Pattern d'email basique
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed); 
  }

  // --- Initialisation des listes déroulantes ---
  async function fetchAndRenderCountries() {
    // Try to fetch authoritative country + dialing data from restcountries API
    try {
      const res = await fetch('https://restcountries.com/v3.1/all');
      if (!res.ok) throw new Error('restcountries fetch failed');
      const list = await res.json();

      // Build map: iso -> { iso, name, emoji, dials: Set }
      const map = new Map();
      list.forEach(c => {
        const iso = (c.cca2 || '').toUpperCase();
        const name = (c.name && (c.name.common || c.name.official)) || '';
        const emoji = c.flag || '';
        const idd = c.idd || {};
        const root = idd.root || '';
        const suffixes = Array.isArray(idd.suffixes) ? idd.suffixes : [];
        if (!iso) return;
        if (!map.has(iso)) map.set(iso, { iso, name, emoji, dials: new Set() });
        const entry = map.get(iso);
        if (root) {
          if (suffixes.length) {
            suffixes.forEach(suf => {
              const dial = (root + (suf || '')).replace(/\s+/g, '');
              entry.dials.add(dial);
            });
          } else {
            entry.dials.add(root.replace(/\s+/g, ''));
          }
        }
      });

      // Render phoneSelect: collect all (iso, dial) pairs
      const phoneFrag = document.createDocumentFragment();
      const phoneEntries = [];
      map.forEach(v => {
        v.dials.forEach(d => phoneEntries.push({ iso: v.iso, name: v.name, emoji: v.emoji, dial: d }));
      });

      // Sort by name for country order in phone list (optional)
      phoneEntries.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
      phoneEntries.forEach(pe => {
        const opt = document.createElement('option');
        opt.value = pe.dial;
        opt.textContent = `${pe.emoji ? pe.emoji + ' ' : ''}${pe.dial}`;
        opt.dataset.iso = pe.iso;
        opt.dataset.countryName = pe.name;
        phoneFrag.appendChild(opt);
      });

      if (phoneSelect) {
        phoneSelect.innerHTML = '';
        phoneSelect.appendChild(phoneFrag);
      }

      // Render countrySelect: iso -> name
      const countryFrag = document.createDocumentFragment();
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = COUNTRY_PLACEHOLDER;
      countryFrag.appendChild(placeholder);

      const countries = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
      countries.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.iso;
        opt.textContent = c.name;
        countryFrag.appendChild(opt);
      });

      if (countrySelect) {
        countrySelect.innerHTML = '';
        countrySelect.appendChild(countryFrag);
        // Select default TG if present
        const maybe = Array.from(countrySelect.options).find(o => o.value === DEFAULT_COUNTRY_ISO);
        if (maybe) countrySelect.value = DEFAULT_COUNTRY_ISO;
      }

      // Ensure phone default selected (TG dial if exists)
      if (phoneSelect) {
        const idx = Array.from(phoneSelect.options).findIndex(o => o.dataset && o.dataset.iso === DEFAULT_COUNTRY_ISO);
        phoneSelect.selectedIndex = idx >= 0 ? idx : 0;
      }

      return; // success
    } catch (err) {
      console.warn('Could not fetch restcountries data, falling back to local parsing:', err);
      // fallback to previous local parse function
      setupCountrySelectors();
    }
  }

  function setupCountrySelectors() {
    if (!phoneSelect || !countrySelect) return;
    
    const uniqueCountries = new Map();
    let defaultPhoneIndex = -1;

    // 1. Amélioration des options d'indicatif téléphonique (phoneCode)
    Array.from(phoneSelect.options).forEach((opt, idx) => {
      const raw = opt.textContent.trim();
      let flag = '';
      let dial = '';
      let name = '';
      let iso = '';

      // Tentative 1: format avec emojis de drapeau, ex: "🇹🇬 +228 Togo"
      let match = raw.match(/^([\p{RI}]{2})\s+(\+\d[\d\s\(\)]*)\s+(.+)$/u);
      if (match) {
        flag = match[1];
        dial = match[2].replace(/\s+/g, ' ').trim();
        name = match[3].trim();
        try { iso = flagToISO(flag); } catch (e) { iso = ''; }
      } else {
        // Tentative 2: format sans emoji, ex: "+228 Togo" ou "+1 (264) Anguilla"
        const m2 = raw.match(/(\+\d[\d\s\(\)]*)(?:\s+(.+))?/);
        if (m2) {
          dial = m2[1].replace(/\s+/g, ' ').trim();
          name = (m2[2] || '').trim();
        } else {
          // Fallback: découpe basique
          const parts = raw.split(/\s+/);
          dial = parts.find(p => p && p[0] === '+') || '';
          name = parts.filter(p => p && p !== dial).join(' ').trim();
        }

        // Si on a un nom, essaye de retrouver un ISO via la liste des pays déjà présents dans le <select>#country
        if (name && countrySelect && countrySelect.options.length) {
          const found = Array.from(countrySelect.options).find(o => o.textContent.trim().toLowerCase() === name.toLowerCase());
          if (found) iso = found.value;
        }
      }

      // Ne supprime plus les options — on normalise les attributs
      if (!dial) return; // ignore entries vraiment invalides

      opt.textContent = `${flag ? flag + ' ' : ''}${dial}${name ? ' ' + name : ''}`.trim();
      opt.value = dial;
      opt.dataset.countryName = name || '';
      opt.dataset.iso = iso || name || '';

      const key = opt.dataset.iso || opt.dataset.countryName || opt.value;
      const label = opt.dataset.countryName || opt.textContent || opt.value;
      if (!uniqueCountries.has(key)) uniqueCountries.set(key, label);

      // Définir l'index par défaut si le pays correspond à Togo (iso TG ou nom Togo)
      if (iso === DEFAULT_COUNTRY_ISO || label.toLowerCase() === 'togo') {
        defaultPhoneIndex = idx;
      }
    });

    // Définir la sélection par défaut pour l'indicatif téléphonique (TG)
    if (defaultPhoneIndex >= 0) {
      phoneSelect.selectedIndex = defaultPhoneIndex;
    } else {
        // Option de secours: sélectionner le premier si TG n'existe pas ou n'est pas trouvé
        phoneSelect.selectedIndex = 0;
    }

    // 2. Remplissage de la liste déroulante des pays (country)
    const items = Array.from(uniqueCountries.entries()).sort((a, b) =>
      a[1].localeCompare(b[1], 'fr', { sensitivity: 'base' })
    );

    // Si `index.html` contient déjà une liste complète de pays (par ex. génération statique),
    // on ne l'écrase pas pour préserver l'intégralité et la localisation. On s'assure seulement
    // que la valeur par défaut (Togo) soit sélectionnée si présente.
    if (countrySelect.options && countrySelect.options.length > 2) {
      const hasSelected = Array.from(countrySelect.options).some(o => o.selected && o.value);
      if (!hasSelected) {
        const found = Array.from(countrySelect.options).find(o => (
          (o.value && o.value.toString().toLowerCase() === DEFAULT_COUNTRY_ISO.toLowerCase()) ||
          o.textContent.trim().toLowerCase() === 'togo' ||
          o.value.trim().toLowerCase() === 'togo'
        ));
        if (found) found.selected = true;
      }
    } else {
      const frag = document.createDocumentFragment();
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = COUNTRY_PLACEHOLDER;
      frag.appendChild(placeholder);

      for (const [iso, name] of items) {
        const option = document.createElement('option');
        option.value = iso;
        option.textContent = name;
        if (iso === DEFAULT_COUNTRY_ISO || name.toLowerCase() === 'togo') {
          option.selected = true;
        }
        frag.appendChild(option);
      }

      countrySelect.innerHTML = '';
      countrySelect.appendChild(frag);

      // Si TG a été ajouté mais pas sélectionné, on le sélectionne maintenant
      if (countrySelect.value !== DEFAULT_COUNTRY_ISO) {
        const maybe = Array.from(countrySelect.options).find(o => o.value === DEFAULT_COUNTRY_ISO || o.textContent.trim().toLowerCase() === 'togo');
        if (maybe) countrySelect.value = maybe.value;
      }
    }
  }

  // Try dynamic load first
  fetchAndRenderCountries();

  // --- Gestion de la soumission du formulaire ---

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    msg.textContent = '';

    const { name, phoneCode, phoneNumber, email, address, country } = form.elements;
    let ok = true;
    
    // --- Validation ---
    
    // 1. Validation requise (Nom, Numéro de téléphone, Pays)
    if (!name.value.trim()) { setError(name, true); ok = false; } else setError(name, false);
    if (!phoneNumber.value.trim() || !validatePhone(phoneNumber.value)) { setError(phoneNumber, true); ok = false; } else setError(phoneNumber, false);
    if (!country.value) { setError(country, true); ok = false; } else setError(country, false);
    
    // 2. Validation optionnelle (Email)
    if (!validateEmail(email.value)) { 
        setError(email, true); 
        ok = false; 
    } else {
        setError(email, false);
    }
    
    // 3. Validation de longueur (Adresse)
    const addressEl = address || { value: '' }; 
    if (addressEl.value.trim().length > 50) { 
        setError(addressEl, true); 
        ok = false; 
    } else {
        setError(addressEl, false); 
    }

    if (!ok) {
      msg.textContent = 'Veuillez corriger les champs en surbrillance.';
      msg.className = 'errorMessage';
      return;
    }

    // --- Préparation de la charge utile ---
    
    const selectedCountry = country.selectedOptions.length
      ? country.selectedOptions[0]
      : null;
    const countryIso = selectedCountry ? selectedCountry.value : '';
    const countryLabel = selectedCountry ? selectedCountry.textContent : '';
    const commentsEl = form.comments || { value: '' };
    
    const interests = Array.from(form.querySelectorAll('input[name="interests"]:checked')).map(i => i.value);
    const comments = commentsEl.value.trim();

    const payload = {
      name: name.value.trim(),
      phone: (phoneCode && phoneCode.value ? phoneCode.value + ' ' : '') + phoneNumber.value.trim(),
      email: email.value.trim(),
      interests: interests,
      activities: comments, 
      comments: comments,
      country: countryLabel,
      country_iso: countryIso,
      address: addressEl.value.trim()
    };

    // --- Envoi à l'API ---
    
    fetch(`${API_BASE}/api/contacts`, {
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