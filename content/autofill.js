/* global browser */
/* Job Filler – content script */

(function () {
  'use strict';

  // ── Field patterns ────────────────────────────────────────────────────────────
  // attrs    : normalized id / name / data-automation-id fragments to match
  // autocomplete : expected autocomplete attribute values
  // keywords : substrings to look for in placeholder / label / aria-label text

  const TEXT_PATTERNS = {
    firstName: {
      attrs: ['firstname', 'fname', 'givenname', 'first'],
      autocomplete: ['given-name'],
      keywords: ['first name', 'given name', 'forename', 'nombre', 'prénom', 'vorname'],
    },
    lastName: {
      attrs: ['lastname', 'lname', 'surname', 'familyname'],
      autocomplete: ['family-name'],
      keywords: ['last name', 'surname', 'family name', 'apellido', 'nom de famille'],
    },
    fullName: {
      attrs: ['fullname', 'yourname', 'applicantname', 'candidatename', 'name'],
      autocomplete: ['name'],
      keywords: ['full name', 'your name', 'nombre completo', 'full legal name'],
    },
    email: {
      attrs: ['email', 'mail', 'emailaddress'],
      autocomplete: ['email'],
      keywords: ['email', 'e-mail', 'email address', 'correo'],
    },
    phoneCountry: {
      attrs: ['phonecountry', 'countrycode', 'phoneprefix', 'dialcode', 'dialingcode', 'callingcode', 'phonecode', 'intlcode'],
      autocomplete: ['tel-country-code'],
      keywords: ['country code', 'dialing code', 'dial code', 'phone prefix', 'calling code'],
    },
    phone: {
      attrs: ['phone', 'tel', 'telephone', 'mobile', 'cell', 'phonenumber', 'localnumber', 'phonelocalpart'],
      autocomplete: ['tel', 'tel-national', 'tel-local'],
      keywords: ['phone', 'telephone', 'mobile', 'cell', 'teléfono', 'phone number'],
    },
    address: {
      attrs: ['address', 'streetaddress', 'street', 'addressline1', 'addr'],
      autocomplete: ['street-address', 'address-line1'],
      keywords: ['address', 'street address', 'street'],
    },
    city: {
      attrs: ['city', 'town', 'municipality', 'addresscity'],
      autocomplete: ['address-level2'],
      keywords: ['city', 'town', 'municipality'],
    },
    province: {
      attrs: ['province', 'state', 'region', 'county', 'addressstate', 'addressregion'],
      autocomplete: ['address-level1'],
      keywords: ['province', 'state', 'region', 'county', 'district'],
    },
    country: {
      attrs: ['country', 'nation', 'countryname', 'addresscountry'],
      autocomplete: ['country-name', 'country'],
      keywords: ['country', 'nation'],
    },
    location: {
      attrs: ['location', 'currentlocation', 'currentcity', 'basedlocation'],
      autocomplete: [],
      keywords: ['location', 'current location', 'where are you based', 'where do you live'],
    },
    linkedin: {
      attrs: ['linkedin', 'linkedinurl', 'linkedinprofile', 'linkedinlink'],
      autocomplete: [],
      keywords: ['linkedin', 'linked in'],
    },
    github: {
      attrs: ['github', 'githuburl', 'githubprofile', 'githublink', 'githubrepo'],
      autocomplete: [],
      keywords: ['github', 'git hub', 'github profile', 'github repo'],
    },
    website: {
      attrs: ['website', 'portfolio', 'personalwebsite', 'websiteurl', 'portfoliourl', 'personalsite', 'siteurl', 'blog', 'personalurl'],
      autocomplete: ['url'],
      keywords: ['website', 'portfolio', 'personal site', 'personal url', 'your website'],
    },
    coverLetterText: {
      attrs: ['coverletter', 'coverlettertext', 'motivationletter', 'motivationtext', 'letter', 'coverletterfield'],
      autocomplete: [],
      keywords: ['cover letter', 'motivation letter', 'covering letter', 'message', 'tell us about yourself'],
    },
    pronoun: {
      attrs: ['pronoun', 'pronouns', 'preferredpronoun', 'genderpronoun', 'preferredpronouns'],
      autocomplete: [],
      keywords: ['pronoun', 'preferred pronoun', 'gender pronoun', 'pronouns'],
    },
    availability: {
      attrs: ['availability', 'startdate', 'availabletostart', 'noticeperiod', 'whencanstart', 'earlystart', 'joiningdate'],
      autocomplete: [],
      keywords: ['availability', 'available to start', 'when can you start', 'start date', 'notice period', 'earliest start', 'joining date'],
    },
  };

  const FILE_KEYWORDS = {
    resume: ['resume', 'cv', 'curriculum', 'cvfile', 'resumefile', 'uploadresume', 'resumeupload', 'cvupload'],
    coverLetter: ['coverletter', 'cover_letter', 'coverletterfile', 'motivationletter', 'coverletterupload'],
  };

  // ── Helpers ───────────────────────────────────────────────────────────────────

  function norm(str) {
    return (str || '').toLowerCase().replace(/[-_\s[\]]/g, '');
  }

  function getLabelText(el) {
    const lby = el.getAttribute('aria-labelledby');
    if (lby) {
      const text = lby.split(/\s+/)
        .map(id => document.getElementById(id)?.textContent || '')
        .join(' ').trim();
      if (text) return text;
    }

    const al = el.getAttribute('aria-label');
    if (al) return al;

    if (el.id) {
      try {
        const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (label) return label.textContent;
      } catch { /* skip */ }
    }

    const parentLabel = el.closest('label');
    if (parentLabel) return parentLabel.textContent;

    let prev = el.previousElementSibling;
    while (prev) {
      const tag = prev.tagName;
      if (tag === 'LABEL' || tag === 'SPAN' || tag === 'P' || tag === 'DIV') {
        const t = prev.textContent.trim();
        if (t) return t;
      }
      prev = prev.previousElementSibling;
    }

    if (el.parentElement) {
      const label = el.parentElement.querySelector('label');
      if (label) return label.textContent;
    }

    return '';
  }

  function scoreField(el, patterns) {
    let score = 0;
    const idN = norm(el.id);
    const nameN = norm(el.name);
    const ph = (el.placeholder || '').toLowerCase();
    const ac = (el.getAttribute('autocomplete') || '').toLowerCase().trim();
    const labelN = getLabelText(el).toLowerCase();
    const autoId = norm(el.getAttribute('data-automation-id'));
    const testId = norm(el.getAttribute('data-testid'));

    for (const attr of patterns.attrs) {
      const a = norm(attr);
      if (idN === a) score += 14; else if (idN.includes(a)) score += 7;
      if (nameN === a) score += 14; else if (nameN.includes(a)) score += 7;
      if (autoId === a) score += 13; else if (autoId.includes(a)) score += 7;
      if (testId === a) score += 10; else if (testId.includes(a)) score += 5;
    }

    for (const acVal of patterns.autocomplete) {
      if (ac === acVal) score += 16;
      else if (ac.includes(acVal)) score += 9;
    }

    for (const kw of patterns.keywords) {
      if (ph.includes(kw)) score += 8;
      if (labelN.includes(kw)) score += 10;
    }

    return score;
  }

  function scoreFile(el, keywords) {
    let score = 0;
    const idN = norm(el.id);
    const nameN = norm(el.name);
    const labelN = getLabelText(el).toLowerCase();
    const autoId = norm(el.getAttribute('data-automation-id'));

    for (const kw of keywords) {
      const k = norm(kw);
      if (idN === k || idN.includes(k)) score += 12;
      if (nameN === k || nameN.includes(k)) score += 12;
      if (autoId === k || autoId.includes(k)) score += 12;
      if (labelN.includes(kw.toLowerCase())) score += 9;
    }

    return score;
  }

  function isVisible(el) {
    const s = window.getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
  }

  // ── Fill functions ────────────────────────────────────────────────────────────

  function fillInput(el, value) {
    try {
      const proto = el.tagName === 'TEXTAREA'
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) setter.call(el, value);
      else el.value = value;

      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: value.slice(-1) }));
      return true;
    } catch {
      return false;
    }
  }

  function fillSelect(el, value) {
    const v = value.toLowerCase().trim();
    // Try: exact value match → exact text match → partial text contains value → value contains option text
    for (const pass of [
      o => o.value.toLowerCase() === v,
      o => o.text.toLowerCase() === v,
      o => o.text.toLowerCase().includes(v),
      o => v.includes(o.text.toLowerCase()) && o.text.length > 2,
    ]) {
      const match = Array.from(el.options).find(pass);
      if (match) {
        el.value = match.value;
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
    }
    return false;
  }

  function fillElement(el, value) {
    return el.tagName === 'SELECT' ? fillSelect(el, value) : fillInput(el, value);
  }

  function fillFile(el, fileInfo) {
    try {
      const bytes = atob(fileInfo.data);
      const buf = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
      const blob = new Blob([buf], { type: fileInfo.type || 'application/pdf' });
      const file = new File([blob], fileInfo.name, { type: fileInfo.type || 'application/pdf' });

      const dt = new DataTransfer();
      dt.items.add(file);
      el.files = dt.files;
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    } catch {
      return false;
    }
  }

  function highlight(el) {
    const prev = { outline: el.style.outline, offset: el.style.outlineOffset, transition: el.style.transition };
    el.style.transition = 'outline 0.2s';
    el.style.outline = '2px solid #22c55e';
    el.style.outlineOffset = '1px';
    setTimeout(() => {
      el.style.outline = prev.outline;
      el.style.outlineOffset = prev.offset;
      el.style.transition = prev.transition;
    }, 2000);
  }

  // ── Main fill logic ───────────────────────────────────────────────────────────

  function fillForm(profile) {
    const firstName    = profile.firstName    || '';
    const lastName     = profile.lastName     || '';
    const fullName     = [firstName, lastName].filter(Boolean).join(' ');
    const phoneCountry = profile.phoneCountry || '';
    const phoneLocal   = profile.phone        || '';
    const phoneFull    = phoneCountry && phoneLocal
      ? `${phoneCountry}${phoneLocal}`
      : (phoneLocal || phoneCountry);
    const city     = profile.city     || '';
    const province = profile.province || '';
    const country  = profile.country  || '';
    const location = [city, province, country].filter(Boolean).join(', ');

    const values = {
      firstName,
      lastName,
      fullName,
      pronoun:          profile.pronoun          || '',
      availability:     profile.availability     || '',
      email:            profile.email            || '',
      phoneCountry,
      phone:            phoneFull,   // adjusted below if country code was separately filled
      address:          profile.address          || '',
      city,
      province,
      country,
      location,
      linkedin:         profile.linkedin         || '',
      github:           profile.github           || '',
      website:          profile.website          || '',
      coverLetterText:  profile.coverLetterText  || '',
    };

    const SKIP_TYPES = new Set(['file', 'submit', 'button', 'reset', 'checkbox', 'radio', 'image', 'range', 'color', 'hidden']);

    const fillableEls = Array.from(document.querySelectorAll(
      'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])'
    )).filter(el => !SKIP_TYPES.has(el.type) && isVisible(el));

    const fileEls = Array.from(document.querySelectorAll('input[type="file"]:not([disabled])'));

    const used = new Set();
    const filledFields = new Set();  // tracks which profile fields were successfully placed
    let filled = 0;

    for (const [field, patterns] of Object.entries(TEXT_PATTERNS)) {
      // If country code was separately filled, use the local-only number for the phone field
      let value = (field === 'phone' && filledFields.has('phoneCountry'))
        ? phoneLocal
        : values[field];

      if (!value) continue;

      let best = null;
      let bestScore = 0;

      for (const el of fillableEls) {
        if (used.has(el)) continue;
        const score = scoreField(el, patterns);
        if (score > bestScore) { bestScore = score; best = el; }
      }

      if (best && bestScore >= 5) {
        if (fillElement(best, value)) {
          highlight(best);
          used.add(best);
          filledFields.add(field);
          filled++;
        }
      }
    }

    // ── File inputs ───────────────────────────────────────────────────────────

    function placeFile(fileInfo, keywords) {
      let best = null, bestScore = 0;
      for (const el of fileEls) {
        if (used.has(el)) continue;
        const s = scoreFile(el, keywords);
        if (s > bestScore) { bestScore = s; best = el; }
      }
      if (!best) {
        best = fileEls.find(el => !used.has(el)) || null;
        if (best) bestScore = 1;
      }
      if (best && bestScore >= 1 && fillFile(best, fileInfo)) {
        highlight(best);
        used.add(best);
        filled++;
      }
    }

    if (profile.resume)      placeFile(profile.resume,      FILE_KEYWORDS.resume);
    if (profile.coverLetter) placeFile(profile.coverLetter, FILE_KEYWORDS.coverLetter);

    return { filled };
  }

  // ── Message listener ──────────────────────────────────────────────────────────

  const api = typeof browser !== 'undefined' ? browser : chrome;

  api.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'JF_FILL') {
      try {
        sendResponse(fillForm(message.profile));
      } catch (e) {
        sendResponse({ filled: 0, error: String(e) });
      }
    }
    return true;
  });
})();
