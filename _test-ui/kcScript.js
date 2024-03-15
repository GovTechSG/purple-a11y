const elements = {
  button: document.getElementById('issueTypeComboBox'),
  wrapper: document.getElementById('issueTypeComboBoxWrapper'),
  dropdown: document.getElementById('issueTypeListbox'),
  options: document.querySelectorAll('[role="option"]'),
};

let isDropdownOpen = false;
let currentOptionIndex = 0;
let lastTypedChar = '';
let lastMatchingIndex = 0;

function toggleAllyDropdown() {
  elements.dropdown.classList.toggle('active');
  isDropdownOpen = !isDropdownOpen;
  elements.button.setAttribute('aria-expanded', isDropdownOpen.toString());

  if (isDropdownOpen) {
    // focusCurrentOption();
    elements.button.setAttribute('aria-activedescendant', 'issueTypeListbox');
    // updateDropdownPosition();
  }
}

const handleKeyPress = event => {
  const { key } = event;
  const openKeys = ['ArrowDown', 'ArrowUp', 'Enter', ' '];

  if (!isDropdownOpen && openKeys.includes(key)) {
    toggleAllyDropdown();
    focusCurrentOption();
  } else if (isDropdownOpen) {
    switch (key) {
      case 'Escape':
        event.preventDefault();
        toggleAllyDropdown();
        break;
      case 'ArrowDown':
        moveFocusDown();
        break;
      case 'ArrowUp':
        moveFocusUp();
        break;
      case 'Enter':
      case ' ':
        selectCurrentOption();
        break;
      default:
        handleAlphanumericKeyPress(key);
        break;
    }
  }
};

const handleDocumentInteraction = event => {
  const isClickInsideButton = elements.button.contains(event.target);
  const isClickInsideDropdown = elements.dropdown.contains(event.target);

  if (isClickInsideButton || (!isClickInsideDropdown && isDropdownOpen)) {
    toggleAllyDropdown();
  }

  const clickedOption = event.target.closest('[role="option"]');
  if (clickedOption) {
    selectOptionByElement(clickedOption);
  }
};

const moveFocusDown = () => {
  if (currentOptionIndex < elements.options.length - 1) {
    currentOptionIndex++;
  } else {
    currentOptionIndex = 0;
  }
  focusCurrentOption();
};

const moveFocusUp = () => {
  if (currentOptionIndex > 0) {
    currentOptionIndex--;
  } else {
    currentOptionIndex = elements.options.length - 1;
  }
  focusCurrentOption();
};

const focusCurrentOption = () => {
  const currentOption = elements.options[currentOptionIndex];
  // const optionLabel = currentOption.textContent;

  currentOption.focus();

  currentOption.scrollIntoView({
    block: 'nearest',
  });

  // elements.options.forEach((option, index) => {
  //   if (option !== currentOption) {
  //     option.classList.remove('current');
  //   }
  // });
};

const selectCurrentOption = () => {
  const selectedOption = elements.options[currentOptionIndex];
  selectOptionByElement(selectedOption);
};

const selectOptionByElement = optionElement => {
  const optionValue = optionElement.textContent;
  const optionElementClassArray = [optionElement.classList[0], optionElement.classList[1]];
  const optionElementCategoryTitle = optionElement.children[0].innerText.replace(/\n/g, '');
  const optionElementCategoryInfo = optionElement.children[1].innerText.replace(/\n/g, '');

  // Resets dropdownToggleContainer to empty class
  document
    .getElementById('dropdownToggleContainer')
    .classList.remove('mustFix', 'goodToFix', 'needsReview');

  optionElementClassArray.forEach(className => {
    document.getElementById('dropdownToggleContainer').classList.add(className);
  });

  document.getElementById('dropdownToggleCategoryTitle').innerText = optionElementCategoryTitle;
  document.getElementById('dropdownToggleCategoryInfo').innerText = optionElementCategoryInfo;

  // Dynamically update dropdownIssueOccurrences
  const dropdownIssueOccurrencesString = document
    .getElementById(optionElement.classList[0] + 'Selector')
    .lastElementChild.innerText.replace(/\n/g, '');
  document.getElementById('dropdownIssuesOccurrences').innerText = dropdownIssueOccurrencesString;

  // elements.button.textContent = optionValue;
  elements.options.forEach(option => {
    option.classList.remove('active');
    option.setAttribute('aria-selected', 'false');
  });

  optionElement.classList.add('active');
  optionElement.setAttribute('aria-selected', 'true');

  toggleAllyDropdown();
  announceOption(optionValue);

  // Get categorySelector selected category
  const sharedCategory = optionElement.classList[0];

  // Update tooltip
  const svgElement = document.getElementById('categorySelectorDropdownToolipDescription');
  svgElement.setAttribute('title', scanItems[sharedCategory].description);
  const tooltip = new bootstrap.Tooltip(svgElement);
  tooltip.update();

  // Ensures categorySelector on desktop view matches with dropdown and load rules summary again
  const matchingButtonId = sharedCategory + 'Selector';
  document.getElementById(matchingButtonId).click();
  loadRulesSummary(sharedCategory, searchInput);
};

const handleAlphanumericKeyPress = key => {
  const typedChar = key.toLowerCase();

  if (lastTypedChar !== typedChar) {
    lastMatchingIndex = 0;
  }

  const matchingOptions = Array.from(elements.options).filter(option =>
    option.textContent.toLowerCase().startsWith(typedChar),
  );

  if (matchingOptions.length) {
    if (lastMatchingIndex === matchingOptions.length) {
      lastMatchingIndex = 0;
    }
    let value = matchingOptions[lastMatchingIndex];
    const index = Array.from(elements.options).indexOf(value);
    currentOptionIndex = index;
    focusCurrentOption();
    lastMatchingIndex += 1;
  }
  lastTypedChar = typedChar;
};

const announceOption = text => {
  elements.announcement.textContent = text;
  elements.announcement.setAttribute('aria-live', 'assertive');
  setTimeout(() => {
    elements.announcement.textContent = '';
    elements.announcement.setAttribute('aria-live', 'off');
  }, 1000);
};

elements.button.addEventListener('keydown', handleKeyPress);
document.addEventListener('click', handleDocumentInteraction);
window.addEventListener('resize', updateDropdownPosition);
