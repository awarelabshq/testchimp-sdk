let menuItemValues = {}; // To store menu item values by their ID

// dateTimeHelpers.js

 function getCurrentDate() {
  return new Date().toLocaleDateString();
}

 function getCurrentTime() {
  return new Date().toLocaleTimeString();
}

 function getISODate() {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

 function getShortDate() {
  const date = new Date();
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`; // MM/DD/YYYY
}

 function getShortDateDMY() {
  const date = new Date();
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`; // DD/MM/YYYY
}

 function getFullDate() {
  return new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

 function getDayOfWeek() {
  return new Date().toLocaleDateString(undefined, { weekday: 'long' }); // E.g., "Monday"
}

 function getCurrentMonth() {
  return new Date().toLocaleDateString(undefined, { month: 'long' }); // E.g., "October"
}

 function getCurrentYear() {
  return new Date().getFullYear().toString(); // E.g., "2024"
}

// Random Value Helpers
function getRandomNumber() {
  return Math.floor(Math.random() * 100) + 1;
}

function getRandomString(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getRandomEmail() {
  const domains = ['example.com', 'mail.com', 'test.com'];
  const randomName = getRandomString(6);
  const randomDomain = domains[Math.floor(Math.random() * domains.length)];
  return `${randomName}@${randomDomain}`;
}

function getRandomGUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function getRandomIPv4() {
  return `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
}

function getRandomIPv6() {
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += Math.floor(Math.random() * 65536).toString(16) + ':';
  }
  return result.slice(0, -1);
}

function getRandomMAC() {
  return 'XX:XX:XX:XX:XX:XX'.replace(/X/g, () => '0123456789ABCDEF'.charAt(Math.floor(Math.random() * 16)));
}

function getRandomPhoneNumber() {
  return `+1-${Math.floor(100 + Math.random() * 900)}-${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function getRandomCreditCard() {
  let ccnum = Array.from({length: 15}, () => Math.floor(Math.random() * 10)).join('');
  let checksum = 0, shouldDouble = true;

  for (let i = ccnum.length - 1; i >= 0; i--) {
    let digit = parseInt(ccnum[i]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    checksum += digit;
    shouldDouble = !shouldDouble;
  }

  ccnum += (checksum * 9 % 10).toString();
  return ccnum;
}

function getRandomHex() {
  return '0x' + Math.floor(Math.random() * 0xFFFFFF).toString(16);
}

function getRandomBoolean() {
  return Math.random() >= 0.5 ? 'true' : 'false';
}

function getRandomURL() {
  const domains = ['randomsite.com', 'example.org', 'testpage.net'];
  return `https://${getRandomString(6)}.${domains[Math.floor(Math.random() * domains.length)]}`;
}

function getRandomPostalCode() {
  return `${Math.floor(10000 + Math.random() * 90000)}`;
}

function getRandomColorHex() {
  return `#${Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0')}`;
}

function getRandomCoordinates() {
  const lat = (Math.random() * 180 - 90).toFixed(6);
  const lon = (Math.random() * 360 - 180).toFixed(6);
  return `${lat}°, ${lon}°`;
}

// Function to execute dynamic values
// Function to execute dynamic values
function executeDynamicFunction(funcName) {
  switch (funcName) {
    case 'getCurrentDate':
      return getCurrentDate();
    case 'getCurrentTime':
      return getCurrentTime();
    case 'getISODate':
      return getISODate();
    case 'getShortDate':
      return getShortDate();
    case 'getShortDateDMY':
      return getShortDateDMY();
    case 'getFullDate':
      return getFullDate();
    case 'getDayOfWeek':
      return getDayOfWeek();
    case 'getCurrentMonth':
      return getCurrentMonth();
    case 'getCurrentYear':
      return getCurrentYear();
    case 'getRandomNumber':
      return getRandomNumber();
    case 'getRandomString':
      return getRandomString();
    case 'getRandomEmail':
      return getRandomEmail();
    case 'getRandomGUID':
      return getRandomGUID();
    case 'getRandomIPv4':
      return getRandomIPv4();
    case 'getRandomIPv6':
      return getRandomIPv6();
    case 'getRandomMAC':
      return getRandomMAC();
    case 'getRandomPhoneNumber':
      return getRandomPhoneNumber();
    case 'getRandomCreditCard':
      return getRandomCreditCard();
    case 'getRandomHex':
      return getRandomHex();
    case 'getRandomBoolean':
      return getRandomBoolean();
    case 'getRandomURL':
      return getRandomURL();
    case 'getRandomPostalCode':
      return getRandomPostalCode();
    case 'getRandomColorHex':
      return getRandomColorHex();
    case 'getRandomCoordinates':
      return getRandomCoordinates();
    default:
      console.error(`Function ${funcName} not found.`);
      return '';
  }
}

// Fetch the configuration file and build the menu
function loadContextMenu() {
  fetch(chrome.runtime.getURL('menu-config.json'))
    .then(response => response.json())
    .then(config => {
      buildContextMenu(config);
    })
    .catch(error => console.error('Error loading config file:', error));
}

// Function to build context menu from JSON config
function buildContextMenu(config) {
  console.log("Building context menu for testchimp");
  // Create the main TestChimp context menu
  chrome.contextMenus.create({
    id: "testchimp",
    title: "TestChimp",
    contexts: ["editable","selection"]
  });

  chrome.contextMenus.create({
      id: "testchimp_addToVocab",
      title: "Add to Vocabulary...",
      parentId: "testchimp",
      contexts: ["selection"]  // Only show when text is selected
  });

    // Listen for when the menu item is clicked
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "testchimp_addToVocab" && info.selectionText) {
        updateVocab(info.selectionText);  // Call your function with the selected text
    }
  });
  // Recursively create sub-menus and items
  createSubMenu(config, "testchimp");
}

function updateVocab(selectedText) {
    chrome.storage.local.get({ vocabulary: [] }, (result) => {
        let vocabList = result.vocabulary;

        // Add the selected text if it's not already in the list
        if (!vocabList.includes(selectedText)) {
            vocabList.push(selectedText);
            vocabList.sort();  // Keep it in alphabetical order

            // Store the updated list in chrome.storage.local
            chrome.storage.local.set({ vocabulary: vocabList }, () => {
                console.log("Vocabulary updated:", vocabList);
                recreateVocabMenu(vocabList);  // Update the menu after adding the new word
            });
        }
    });
}

function recreateVocabMenu(vocabList) {
    // Remove the old menu
    chrome.contextMenus.remove("testchimp_custom_vocabs", () => {
        // Create a new parent menu for custom vocabulary
        chrome.contextMenus.create({
            id: "testchimp_custom_vocabs",
            title: "Custom Vocabulary",
            parentId: "testchimp",
            contexts: ["editable"]
        });

        // Add each vocabulary item as a submenu
        vocabList.forEach((vocabItem) => {
            chrome.contextMenus.create({
                id: "vocab_" + vocabItem,
                title: vocabItem,
                parentId: "testchimp_custom_vocabs",
                contexts: ["editable"]
            });
            menuItemValues["vocab_" + vocabItem] = vocabItem;
        });
    });
}

function createSubMenu(config, parentId) {
  for (const key in config) {
    if (typeof config[key] === 'string') {
      chrome.contextMenus.create({
        id: parentId + "_" + key,
        parentId: parentId,
        title: key,
        contexts: ["editable"]
      });
      menuItemValues[parentId + "_" + key] = config[key];
    } else if (Array.isArray(config[key])) {
      const submenuId = parentId + "_" + key;
      chrome.contextMenus.create({
        id: submenuId,
        parentId: parentId,
        title: key,
        contexts: ["editable"]
      });
      config[key].forEach(value => {
        chrome.contextMenus.create({
          id: submenuId + "_" + value,
          parentId: submenuId,
          title: value,
          contexts: ["editable"]
        });
        menuItemValues[submenuId + "_" + value] = value;
      });
    } else if (typeof config[key] === 'object') {
      const submenuId = parentId + "_" + key;
      chrome.contextMenus.create({
        id: submenuId,
        parentId: parentId,
        title: key,
        contexts: ["editable"]
      });
      createSubMenu(config[key], submenuId);
    }
  }
}

// Handle clicks on menu items
chrome.contextMenus.onClicked.addListener((info, tab) => {
  let value = menuItemValues[info.menuItemId];

  if (value && value.startsWith('__tc_exec(') && value.endsWith(')')) {
    const funcName = value.slice(10, -1); // Extract the function name
    value = executeDynamicFunction(funcName); // Get dynamic value
  }

  if (value) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: fillInputField,
      args: [value]
    });
  }
});

// Function to fill the input field with selected value
function fillInputField(value) {
  const activeElement = document.activeElement;
  if (activeElement && (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA")) {
    activeElement.value = value;
  }
}