/* global browser */
const api = typeof browser !== 'undefined' ? browser : chrome;

const DEFAULT_PROFILE = {
  firstName: 'Jane',
  lastName: 'Doe',
  pronoun: 'She/Her',
  email: 'jane.doe@example.com',
  phoneCountry: '+1',
  phone: '5551234567',
  address: '123 Main Street',
  city: 'San Francisco',
  province: 'California',
  country: 'United States',
  linkedin: 'https://www.linkedin.com/in/janedoe',
  github: 'https://github.com/janedoe',
  website: 'https://janedoe.dev',
  availability: 'Immediately',
  coverLetterText: '',
  // Set resume and coverLetter by selecting files in the popup
  resume: null,
  coverLetter: null,
};

api.runtime.onInstalled.addListener(async ({ reason }) => {
  const { profile } = await api.storage.local.get('profile');

  if (reason === 'install' || !profile) {
    // First install: write full default profile
    await api.storage.local.set({ profile: { ...DEFAULT_PROFILE, ...(profile || {}) } });
  } else if (reason === 'update') {
    // Extension updated: merge any new default fields into the existing profile
    // without overwriting values the user has already saved
    const merged = { ...DEFAULT_PROFILE, ...profile };
    await api.storage.local.set({ profile: merged });
  }
});

// Open as a persistent detached window so file dialogs don't close it
let popupWindowId = null;

api.browserAction.onClicked.addListener(async () => {
  // If our window is already open, just focus it
  if (popupWindowId !== null) {
    try {
      await api.windows.update(popupWindowId, { focused: true });
      return;
    } catch {
      popupWindowId = null; // window was closed externally
    }
  }

  const win = await api.windows.create({
    url: api.runtime.getURL('popup/popup.html'),
    type: 'popup',
    width: 390,
    height: 660,
  });
  popupWindowId = win.id;
});

api.windows.onRemoved.addListener((windowId) => {
  if (windowId === popupWindowId) popupWindowId = null;
});
