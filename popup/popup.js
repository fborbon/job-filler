/* global browser */
const api = typeof browser !== 'undefined' ? browser : chrome;

const TEXT_FIELDS = [
  'firstName', 'lastName', 'pronoun', 'availability',
  'email', 'phoneCountry', 'phone',
  'address', 'city', 'province', 'country',
  'linkedin', 'github', 'website',
  'coverLetterText',
];
const fileData = { resume: null, coverLetter: null };

// ── Status ────────────────────────────────────────────────────────────────────

function showStatus(msg, type = 'info') {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.className = `status show ${type}`;
  if (type === 'success') setTimeout(() => { el.className = 'status'; }, 3000);
}

// ── Storage ───────────────────────────────────────────────────────────────────

async function loadProfile() {
  const { profile } = await api.storage.local.get('profile');
  if (!profile) return;

  for (const id of TEXT_FIELDS) {
    const el = document.getElementById(id);
    if (el && profile[id]) el.value = profile[id];
  }

  restoreFile('resume',      profile.resume);
  restoreFile('coverLetter', profile.coverLetter);
}

function restoreFile(key, fileInfo) {
  if (!fileInfo) return;
  fileData[key] = fileInfo;
  const prefix = key === 'coverLetter' ? 'cover' : 'resume';
  const nameEl   = document.getElementById(`${prefix}-name`);
  const clearBtn = document.getElementById(`${prefix}-clear`);
  nameEl.textContent = fileInfo.name;
  nameEl.classList.add('has-file');
  clearBtn.classList.add('visible');
}

async function saveProfile() {
  const profile = {};
  for (const id of TEXT_FIELDS) {
    const val = document.getElementById(id).value.trim();
    if (val) profile[id] = val;
  }
  if (fileData.resume)      profile.resume      = fileData.resume;
  if (fileData.coverLetter) profile.coverLetter = fileData.coverLetter;

  await api.storage.local.set({ profile });
  showStatus('Profile saved.', 'success');
}

// ── File pickers ──────────────────────────────────────────────────────────────

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve({
      name: file.name,
      type: file.type || 'application/octet-stream',
      data: reader.result.split(',')[1],
    });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function setupFilePicker(prefix, storageKey) {
  const btn      = document.getElementById(`${prefix}-btn`);
  const input    = document.getElementById(`${prefix}-input`);
  const nameEl   = document.getElementById(`${prefix}-name`);
  const clearBtn = document.getElementById(`${prefix}-clear`);

  btn.addEventListener('click', () => input.click());

  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;
    try {
      fileData[storageKey] = await readFileAsBase64(file);
      nameEl.textContent = file.name;
      nameEl.classList.add('has-file');
      clearBtn.classList.add('visible');
    } catch {
      showStatus('Could not read file.', 'error');
    }
  });

  clearBtn.addEventListener('click', async () => {
    fileData[storageKey] = null;
    input.value = '';
    nameEl.textContent = 'No file chosen';
    nameEl.classList.remove('has-file');
    clearBtn.classList.remove('visible');

    const { profile } = await api.storage.local.get('profile');
    if (profile) {
      delete profile[storageKey];
      await api.storage.local.set({ profile });
    }
  });
}

// ── Autofill ──────────────────────────────────────────────────────────────────

async function autofill() {
  const profile = {};
  for (const id of TEXT_FIELDS) {
    const val = document.getElementById(id).value.trim();
    if (val) profile[id] = val;
  }
  if (fileData.resume)      profile.resume      = fileData.resume;
  if (fileData.coverLetter) profile.coverLetter = fileData.coverLetter;

  if (Object.keys(profile).length === 0) {
    showStatus('Profile is empty — add your details and save first.', 'error');
    return;
  }

  // The popup runs in a detached window, so currentWindow is the popup itself.
  // getLastFocused with windowTypes:['normal'] returns the most recently focused browser window.
  let tab;
  try {
    const win = await api.windows.getLastFocused({ windowTypes: ['normal'] });
    if (!win) throw new Error('no window');
    [tab] = await api.tabs.query({ active: true, windowId: win.id });
    if (!tab) throw new Error('no tab');
  } catch {
    showStatus('No browser window found — open a job page first.', 'error');
    return;
  }

  const btn = document.getElementById('btn-fill');
  btn.disabled = true;

  try {
    const response = await api.tabs.sendMessage(tab.id, { type: 'JF_FILL', profile });
    if (response.filled === 0) {
      showStatus('No matching fields found on this page.', 'info');
    } else {
      showStatus(`Filled ${response.filled} field${response.filled !== 1 ? 's' : ''}.`, 'success');
    }
  } catch {
    showStatus('Cannot reach the page — try refreshing it first.', 'error');
  } finally {
    btn.disabled = false;
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

setupFilePicker('resume', 'resume');
setupFilePicker('cover',  'coverLetter');

document.getElementById('btn-save').addEventListener('click', saveProfile);
document.getElementById('btn-fill').addEventListener('click', autofill);

loadProfile();
