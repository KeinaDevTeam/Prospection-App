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

  function setupCountrySelectors() {
    if (!phoneSelect || !countrySelect) return;
    
    const uniqueCountries = new Map();
    let defaultPhoneIndex = -1;

    // 1. Amélioration des options d'indicatif téléphonique (phoneCode)
    Array.from(phoneSelect.options).forEach((opt, idx) => {
      const raw = opt.textContent.trim();
      // Le 'u' à la fin de l'expression régulière est crucial pour les emojis (Regional Indicator Symbols)
      const match = raw.match(/^([\p{RI}]{2})\s+(\+\d+)\s+(.+)$/u); 
      
      if (match) {
        const flag = match[1];
        const dial = match[2];
        const name = match[3];
        let iso = '';
        
        try { iso = flagToISO(flag); } catch (e) { iso = ''; }

        if (iso) {
          // Met à jour l'option
          opt.textContent = `${flag} ${dial} ${iso}`.trim();
          opt.value = dial;
          opt.dataset.countryName = name;
          opt.dataset.iso = iso;
          
          if (!uniqueCountries.has(iso)) {
            uniqueCountries.set(iso, name);
          }
          
          // Définir l'index par défaut (TG)
          if (iso === DEFAULT_COUNTRY_ISO) {
            defaultPhoneIndex = idx;
          }
        } else {
          // Supprime l'option si l'extraction ISO a échoué
          opt.remove();
        }
      } else {
          // Supprime l'option si le format n'est pas bon
          opt.remove();
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

    const frag = document.createDocumentFragment();
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = COUNTRY_PLACEHOLDER;
    frag.appendChild(placeholder);

    for (const [iso, name] of items) {
      const option = document.createElement('option');
      option.value = iso;
      option.textContent = name;
      
      // Assurer que TG est sélectionné par défaut
      if (iso === DEFAULT_COUNTRY_ISO) {
        option.selected = true;
      }
      frag.appendChild(option);
    }

    countrySelect.innerHTML = '';
    countrySelect.appendChild(frag);
    
    // Si TG a été ajouté mais pas sélectionné (par ex. si la liste était vide), on le sélectionne maintenant
    if (countrySelect.value !== DEFAULT_COUNTRY_ISO) {
        countrySelect.value = DEFAULT_COUNTRY_ISO;
    }
  }

  setupCountrySelectors();

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