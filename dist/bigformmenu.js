///<reference path="bigformmenu.d.ts" />
// "DOMContentLoaded" fires when the html has loaded, even if the stylesheets, javascript, etc are still being loaded.
// "load" fires when the entire page has loaded, including stylesheets, etc. 
document.addEventListener("DOMContentLoaded", function () {
    BigFormMenu.pageLoadedHandler();
});
var BigFormMenu;
(function (BigFormMenu) {
    var _levelNonHeadingMenuItem = 9000;
    var defaultConfiguration = {
        skipFirstHeading: true,
        defaultOpenAtLevel: _levelNonHeadingMenuItem + 1,
        collapseOpenAtLevel: 1,
        minimumMenuWidth: 60,
        minimumMenuHeigth: 100,
        hideForSmallForms: true,
        filterPlaceholder: 'filter',
        filterMinimumCharacters: 2,
        highlightFilteredDomElements: true,
        classMenuShowButton: 'bigformmenu-menu-show',
        classMenuHideButton: 'bigformmenu-menu-hide',
        classExpandAllMenuButton: 'bigformmenu-expand-all-menu-button',
        classCollapseAllMenuButton: 'bigformmenu-collapse-all-menu-button',
        titleMenuShowButton: 'Show menu',
        titleMenuHideButton: 'Hide menu',
        titleExpandAllMenuButton: 'Expand all',
        titleCollapseAllMenuButton: 'Collapse all',
        // Note that HTML only has these heading tags. There is no h7, etc.
        cssMenuItemSelector: "h1,h2,h3,h4,h5,h6",
        tagNameToLevelMethod: tagNameToLevelDefaultMethod,
        itemStateInfos: {},
        menuButtons: {},
        getInputElementMethod: getInputElementDefaultMethod
    };
    // Create empty bigFormMenuConfiguration here, to make it easier to write
    // ...bigformmenu.config.js files that set properties on this object.
    //
    // Do not use let here, because that doesn't allow you to declare a variable 
    // multiple times.
    BigFormMenu.bigFormMenuConfiguration = {};
    var MenuElementInfo = /** @class */ (function () {
        function MenuElementInfo(
        // The heading, etc. in the actual DOM (not in the menu)
        domElement, 
        // Caption of the menu element
        caption, 
        // Level of the menu item. For example, a H1 has level 1, H2 has level 2.
        // Menu items that are not associated with a heading have a very high level.
        level) {
            this.domElement = domElement;
            this.caption = caption;
            this.level = level;
            this.children = [];
            // If this element has children, then if true the element is expanded
            this.isExpanded = false;
            // True if this element was the last menu item whose associated input element received the focus.
            // Note that this means it may not have the focus right now. This could happen if the element that currently has focus
            // is not an input element associated with a menu item (for example, this could be a previous / next button).
            this.lastHadFocus = false;
            // true if the menuElement (the dom menu item) is included in the menu. That is, if any filters are active,
            // it passed those filters. And it is displayed (no display:none).
            // Note that the menu item could be still not visible to the user even if this is true, because its parent was closed,
            // because it is scrolled out of the menu div visible area.
            this.isIncludedInMenu = false;
            // Contains all item state infos that are active for this element
            this.itemStates = [];
        }
        return MenuElementInfo;
    }());
    // Represents a button in the DOM pointed at by a button at the bottom of the menu
    var ButtonElementInfo = /** @class */ (function () {
        function ButtonElementInfo(domButton) {
            this.domButton = domButton;
        }
        return ButtonElementInfo;
    }());
    var _menuElementInfos;
    // Acts as the parent of menu elements with the lowest level (typically the h1)
    // Use the children property of this element to easily generate the ul tag
    // containing the menu items.
    // Must have a level lower than 1.
    var _menuElementInfosRoot = new MenuElementInfo(null, null, 0);
    // The div that contains the entire menu
    var _mainMenuElement;
    // Height of the entire menu. Set when the menu is loaded initially. Should only be used
    // when the menu height is fixed, so if it is used as a button bar instead of the full menu.
    var _mainMenuElementHeight;
    // The div that contains the entire menu
    var _mainUlElement;
    // The current content of the search box
    var _searchTerm = '';
    // Holds references to all iItemStateInfos whose filers are active
    var _itemStateInfoActiveFilters = [];
    // Used to determine in which direction the page is scrolling
    var _lastPageYOffset = 0;
    // If true, we're scrolling towards the end of the document
    var _scrollingDown = true;
    // True if a DOM element is being scrolled into view using scrollIntoView
    var _domScrolling = false;
    var _intersectionObserver;
    var _buttonElementInfos = [];
    var _buttonsIntersectionObserver;
    function allMenuElementInfos(callback) {
    }
    // Returns true if the browser is IE
    function runningIE() {
        var ua = window.navigator.userAgent;
        return (ua.indexOf('MSIE ') > -1) || (ua.indexOf('Trident/') > -1);
    }
    function localGetItem(key) {
        if (!localStorage) {
            console.log('localStorage not supported. Are you loading this file from the file system, using IE?');
            return;
        }
        return localStorage.getItem(key);
    }
    function localSetItem(key, value) {
        if (!localStorage) {
            return;
        }
        localStorage.setItem(key, value);
    }
    function localRemoveItem(key) {
        if (!localStorage) {
            return;
        }
        localStorage.removeItem(key);
    }
    // Returns the distance in pixels from the bottom of the screen to the bottom of the document
    function scrollDistanceToBottom() {
        // See https://learnersbucket.com/examples/javascript/detect-if-window-is-scrolled-to-the-bottom/
        var distance = document.body.offsetHeight - (window.innerHeight + window.pageYOffset);
        return distance;
    }
    function getMainMenuElementHeight() {
        var boundingRectangle = _mainMenuElement.getBoundingClientRect();
        return boundingRectangle.height;
    }
    // Sets the bigformmenu-scrolled-to-menu-height class on the main menu div
    // if the distance from bottom of the window to the bottom of the document is less than
    // the height of the menu.
    // 
    // Use this when using the menu as a button bar fixed at the bottom of the page.
    // The class will be added when the user scrolls so far down the document that the button bar starts to obscure
    // the very bottom of the document. If you don't remove the button bar then, the user will not be able to see 
    // the very bottom of the document.
    function setScrolledToMenuHeightClass() {
        var scrollBottomWithinMenuHeight = scrollDistanceToBottom() <= _mainMenuElementHeight;
        setClass(_mainMenuElement, 'bigformmenu-scrolled-to-menu-height', scrollBottomWithinMenuHeight);
    }
    // Finds a MenuElementInfo given the DOM element it points at.
    // If no such MenuElementInfo is found, returns null.
    function menuElementInfoByDomElement(domElement) {
        for (var i = 0; i < _menuElementInfos.length; i++) {
            var menuElementInfo = _menuElementInfos[i];
            if (menuElementInfo.domElement === domElement) {
                return menuElementInfo;
            }
        }
        return null;
    }
    // Finds a ButtonElementInfo given the DOM element it points at.
    // If no such ButtonElementInfo is found, returns null.
    function buttonElementInfoByDomButton(domButton) {
        for (var i = 0; i < _buttonElementInfos.length; i++) {
            var buttonElementInfo = _buttonElementInfos[i];
            if (buttonElementInfo.domButton === domButton) {
                return buttonElementInfo;
            }
        }
        return null;
    }
    function searchFilterIsActive() {
        var filterValue = _searchTerm;
        var filterMinimumCharacters = getConfigValue("filterMinimumCharacters");
        // Filter is active if there is a filter value, and there are enough filter characters.
        var filterIsActive = (filterValue && (filterValue.length >= filterMinimumCharacters));
        return filterIsActive;
    }
    function tagNameToLevelDefaultMethod(tagName) {
        switch (tagName.toLowerCase()) {
            case 'h1': return 1;
            case 'h2': return 2;
            case 'h3': return 3;
            case 'h4': return 4;
            case 'h5': return 5;
            case 'h6': return 6;
            default: return _levelNonHeadingMenuItem;
        }
    }
    function getInputElementDefaultMethod(domElement) {
        if (domElement.tagName.toLowerCase() !== 'label') {
            return null;
        }
        var labelElement = domElement;
        var inputElementId = labelElement.htmlFor;
        if (inputElementId) {
            var inputElement = document.getElementById(inputElementId);
            return inputElement;
        }
        return null;
    }
    function tagNameToLevel(tagName) {
        var tagNameToLevelMethod = getConfigValue("tagNameToLevelMethod");
        var level = tagNameToLevelMethod(tagName);
        return level;
    }
    function getInputElement(domElement) {
        var getInputElementMethod = getConfigValue("getInputElementMethod");
        var inputElement = getInputElementMethod(domElement);
        return inputElement;
    }
    function getConfigValue(itemName) {
        // bigFormMenuConfiguration may have been created by loading .js file that defines that variable.
        // First try to get the value from there. Otherwise get it from the default config.
        // Note that you want to check against undefined specifically, because for example false
        // is a valid value.
        // Do not use "if (bigFormMenuConfiguration)", because then you'll get a run time reference error
        // if the variable does not exist already.
        if (typeof BigFormMenu.bigFormMenuConfiguration !== 'undefined') {
            if (typeof BigFormMenu.bigFormMenuConfiguration[itemName] !== 'undefined') {
                return BigFormMenu.bigFormMenuConfiguration[itemName];
            }
        }
        return defaultConfiguration[itemName];
    }
    // Returns all dom elements to be represented in the menu
    function getAllDomElements() {
        var cssMenuItemSelector = getConfigValue("cssMenuItemSelector");
        var allDomElements = document.querySelectorAll(cssMenuItemSelector);
        return allDomElements;
    }
    // Returns true if all dom elements are visible.
    // See notes for hideForSmallForms option.
    function allDomElementsVisible(domElements) {
        for (var i = 0; i < domElements.length; i++) {
            var visibilityResult = elementIsVisible(domElements[i]);
            // Disregard items that are not shown on the page (display none), because it is not
            // clear if they will ever become shown - and if so how. For example, they could be popup menus.
            if (visibilityResult.isShown) {
                if (!visibilityResult.isVisible) {
                    return false;
                }
            }
        }
        return true;
    }
    // Converts a list of DOM elements to MenuElements.
    // Skips the first heading if config item skipFirstHeading is true.
    function domElementsToMenuElements(domElements) {
        var _menuElementInfos = [];
        var includeElement = !getConfigValue("skipFirstHeading");
        var count = domElements.length;
        for (var i = 0; i < count; i++) {
            var value = domElements[i];
            if (includeElement) {
                var menuElement = domElementToMenuElement(value);
                if (menuElement) {
                    _menuElementInfos.push(menuElement);
                }
            }
            includeElement = true;
        }
        return _menuElementInfos;
    }
    // Create a flash against the given DOM element, to attract the user's attention to it.
    function flashElement(domElement) {
        // See https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Animations/Using_CSS_animations
        domElement.addEventListener("animationend", function () { domElement.classList.remove('bigformmenu-highlighted-dom-item'); }, false);
        domElement.classList.add('bigformmenu-highlighted-dom-item');
    }
    function scrollDomElementIntoView(domElement) {
        _domScrolling = true;
        domElement.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
        // The scroll is asynchronous, so when scrollIntoView returns, it is still scrolling.
        // And time taken to scroll is browser specific.
        // See https://stackoverflow.com/questions/46795955/how-to-know-scroll-to-element-is-done-in-javascript
        // Guess that it will take no more than 500 ms.
        setTimeout(function () { _domScrolling = false; }, 500);
    }
    function showAndFlashElement(domElement) {
        var isVisibleResult = elementIsVisible(domElement);
        if (isVisibleResult.isShown) {
            if (!isVisibleResult.isVisible) {
                scrollDomElementIntoView(domElement);
                // Delay the flash a little bit, to allow for the element to smooth scroll into view.
                setTimeout(function () { flashElement(domElement); }, 500);
            }
            else {
                flashElement(domElement);
            }
        }
    }
    // Call this method when an input element associated with the given menu element gains or loses the focus.
    function onFocused(menuElementInfo, hasFocus) {
        if (hasFocus) {
            // Reset the flag of the last item that received the focus
            for (var i = 0; i < _menuElementInfos.length; i++) {
                _menuElementInfos[i].lastHadFocus = false;
            }
            menuElementInfo.lastHadFocus = true;
        }
        setClass(menuElementInfo.menuElement, 'bigformmenu-has-caption', hasFocus);
    }
    function setOnFocusHandlers(menuElementInfo) {
        var inputElement = getInputElement(menuElementInfo.domElement);
        if (!inputElement) {
            return;
        }
        inputElement.addEventListener("focus", function () {
            onFocused(menuElementInfo, true);
        });
        inputElement.addEventListener("blur", function () {
            onFocused(menuElementInfo, false);
        });
    }
    // Gives the focus to the input element associated with the given menu item.
    function setFocused(menuElementInfo) {
        // Set lastHadFocus explicitly instead of relying on the focus event to fire on the control
        // when it it given the focus further down. This to deal with controls that somehow do not
        // fire the focus event.
        menuElementInfo.lastHadFocus = true;
        var inputElement = getInputElement(menuElementInfo.domElement);
        if (!inputElement) {
            return;
        }
        showAndFlashElement(menuElementInfo.domElement);
        inputElement.focus();
    }
    // Returns the index in the _menuElementInfos array of the item associated with an input that last received the focus.
    // Returns null if there is no such item.
    function lastFocusedItemIndex() {
        for (var i = 0; i < _menuElementInfos.length; i++) {
            if (_menuElementInfos[i].lastHadFocus) {
                return i;
            }
        }
        return null;
    }
    function domElementToMenuElement(domElement) {
        var getItemCaption = getConfigValue("getItemCaption");
        var caption;
        if (getItemCaption) {
            caption = getItemCaption(domElement);
        }
        else {
            caption = domElement.innerText;
        }
        if (!caption) {
            return null;
        }
        var menuElementClass = 'bigformmenu-' + domElement.tagName;
        // If a menu item gets clicked, scroll the associated dom element into view if it is not already
        // visible. If it is already visible, do not scroll it.
        //
        // Also give it the bigformmenu-highlighted-dom-item for a short time, to point out where
        // it is.
        var onClickHandler = function (e) {
            showAndFlashElement(domElement);
            return false;
        };
        var level = tagNameToLevel(domElement.tagName);
        var menuElementInfo = new MenuElementInfo(domElement, caption, level);
        var menuElementDiv = createMenuElementDiv(menuElementInfo, menuElementClass, onClickHandler);
        menuElementInfo.menuElement = menuElementDiv;
        var defaultOpen = openByDefault(menuElementInfo, "defaultOpenAtLevel");
        menuElementInfo.isExpanded = defaultOpen;
        setOnFocusHandlers(menuElementInfo);
        return menuElementInfo;
    }
    // Sets the parent property in all elements in _menuElementInfos.
    // parent: set to _menuElementInfosRoot
    // i: set to 0
    function setParents(parent, i, _menuElementInfos) {
        var parentLevel = parent.level;
        while ((i.value < _menuElementInfos.length) && (_menuElementInfos[i.value].level > parentLevel)) {
            var currentMenuElementInfo = _menuElementInfos[i.value];
            currentMenuElementInfo.parent = parent;
            if (parent) {
                parent.children.push(currentMenuElementInfo);
            }
            // Point to first potential child item
            i.value = i.value + 1;
            setParents(currentMenuElementInfo, i, _menuElementInfos);
        }
    }
    // If the element has cssClass, remove it. Otherwise add it.
    function toggleClass(htmlElement, cssClass) {
        if (htmlElement.classList.contains(cssClass)) {
            htmlElement.classList.remove(cssClass);
        }
        else {
            htmlElement.classList.add(cssClass);
        }
    }
    // Adds the given class to the given element.
    // cssClass - one or more classes, separated by space
    // setIt - if true, the classes are added. If false, the classes are removed.
    function setClass(htmlElement, cssClass, setIt) {
        if (setIt === void 0) { setIt = true; }
        if (cssClass) {
            var cssClasses = cssClass.split(' ');
            for (var i = 0; i < cssClasses.length; i++) {
                if (cssClasses[i] && (cssClasses[i] !== ' ')) {
                    if (!setIt) {
                        htmlElement.classList.remove(cssClasses[i]);
                    }
                    else {
                        htmlElement.classList.add(cssClasses[i]);
                    }
                }
            }
        }
    }
    // If there is a local storage item with the given key, removes it.
    // Otherwise adds it with a non-falsy value.
    function toggleLocalStorage(key) {
        if (localGetItem(key)) {
            localRemoveItem(key);
        }
        else {
            localSetItem(key, "1");
        }
    }
    // Returns if by default the menu item should be open, false otherwise.
    // levelConfigItemName - name of config item that has the level at which the item should be open
    function openByDefault(menuElementInfo, levelConfigItemName) {
        var levelConfig = getConfigValue(levelConfigItemName);
        var result = ((menuElementInfo.level <= levelConfig) || (levelConfig == -1));
        return result;
    }
    function onExpandClicked(menuElementInfo) {
        toggleClass(menuElementInfo.menuElement, 'bigformmenu-item-open');
        menuElementInfo.isExpanded = !menuElementInfo.isExpanded;
        ensureMenuBottomVisible();
        return false;
    }
    function createMenuElementDiv(menuElementInfo, cssClass, onClickHandler) {
        var menuElement = document.createElement("div");
        var expandElement = document.createElement("a");
        expandElement.href = "#";
        expandElement.classList.add("bigformmenu-expand");
        expandElement.onclick = function (e) { return onExpandClicked(menuElementInfo); };
        menuElement.appendChild(expandElement);
        var captionElement = document.createElement("a");
        captionElement.href = "#";
        captionElement.classList.add("bigformmenu-caption");
        captionElement.innerHTML = menuElementInfo.caption;
        captionElement.onclick = onClickHandler;
        menuElement.appendChild(captionElement);
        setClass(menuElement, cssClass);
        menuElement.classList.add("bigformmenu-item");
        return menuElement;
    }
    // Gets the span with the caption from a MenuElementInfo
    function getCaptionElement(menuElementInfo) {
        var divElement = menuElementInfo.menuElement;
        var captionSpanElement = (divElement.children[1]);
        return captionSpanElement;
    }
    // Sets the bigformmenu-matching-filter-dom-element class on all DOM elements that match the current filter.
    // Scrolls the first matching DOM element into view if the filter is active.
    //
    // Resets it on those that do not match the filter.
    // Resets it on all elements if the filter is not active.
    function doHighlightFilteredDomElements() {
        var firstFound = false;
        var filterIsActive = searchFilterIsActive();
        for (var i = 0; i < _menuElementInfos.length; i++) {
            var highlightDomElement = filterIsActive && (matchesSearchFilter(_menuElementInfos[i]) !== -1);
            var domElement = _menuElementInfos[i].domElement;
            setClass(domElement, 'bigformmenu-matching-filter-dom-element', highlightDomElement);
            if (highlightDomElement && !firstFound) {
                firstFound = true;
                scrollDomElementIntoView(domElement);
            }
        }
    }
    // Inserts span tags into a string. The start tag will be at startIndex and the end tag
    // spanLength characters later.
    // For example:
    // s: abcdefgi, startIndex: 2, spanLength: 3
    // Result:
    // ab<span class='bigformmenu-matching-filter-text'>cde</span>fgi
    function insertMatchingFilterTextSpan(s, startIndex, spanLength) {
        var part1 = s.substring(0, startIndex);
        var part2 = s.substring(startIndex, startIndex + spanLength);
        var part3 = s.substring(startIndex + spanLength);
        var result = part1 + "<span class='bigformmenu-matching-filter-text'>" + part2 + "</span>" + part3;
        return result;
    }
    function onChangeFilter(e) {
        _searchTerm = (e.currentTarget).value;
        setClass(_mainMenuElement, 'bigformmenu-textmatch-filter-is-active', searchFilterIsActive());
        var highlightFilteredDomElements = getConfigValue("highlightFilteredDomElements");
        if (highlightFilteredDomElements) {
            doHighlightFilteredDomElements();
        }
        rebuildMenuList(false);
    }
    function createFilterInput() {
        var menuElement = document.createElement("input");
        menuElement.type = "search";
        menuElement.className = 'bigformmenu-filter';
        var filterPlaceholder = getConfigValue("filterPlaceholder");
        if (filterPlaceholder) {
            menuElement.placeholder = filterPlaceholder;
        }
        // onChange only fires after you've clicked outside the input box.
        // onKeypress fires before the value has been updated, so you get the old value, not the latest value
        menuElement.onkeyup = onChangeFilter;
        // oninput fires when the little clear icon is clicked.
        // Note that onsearch does the same thing on webkit, but not on IE.
        menuElement.oninput = onChangeFilter;
        return menuElement;
    }
    function setMenuHeight(height) {
        var widthResizeOnly = getConfigValue('widthResizeOnly');
        if (widthResizeOnly) {
            return;
        }
        _mainMenuElement.style.height = height + "px";
    }
    function storeDimensions(width, height) {
        localSetItem('bigformmenu-width', width.toString());
        localSetItem('bigformmenu-height', height.toString());
    }
    function storeWidth(width) {
        localSetItem('bigformmenu-width', width.toString());
    }
    function storeHeight(height) {
        localSetItem('bigformmenu-height', height.toString());
    }
    function getDimensions() {
        var result = {
            width: parseInt(localGetItem('bigformmenu-width')),
            height: parseInt(localGetItem('bigformmenu-height'))
        };
        return result;
    }
    function setDimensionsFromLocalStorage() {
        var dimensions = getDimensions();
        if (!isNaN(dimensions.width)) {
            _mainMenuElement.style.width = dimensions.width + "px";
        }
        if (!isNaN(dimensions.height)) {
            _mainMenuElement.style.height = dimensions.height + "px";
        }
    }
    // If bigformmenu-bottom has not been set, figures out the distance between the bottom of the
    // menu and the bottom of the screen and stores that under bigformmenu-bottom.
    function storeMenuBottom() {
        if (localGetItem("bigformmenu-bottom") !== null) {
            return;
        }
        var boundingRectangle = _mainMenuElement.getBoundingClientRect();
        var windowHeight = (window.innerHeight || document.documentElement.clientHeight);
        var formBottom = windowHeight - boundingRectangle.bottom;
        localSetItem('bigformmenu-bottom', formBottom.toString());
    }
    // If the user resizes the window, reducing it height, at some point the menu
    // will start extending below the bottom of the window. So its bottom is no longer
    // visible. Ensures this doesn't happen by removing
    // the height or max-height property; and
    // the bottom: auto property.
    // This allows the stylesheet to take over. If this sets top and bottom of the main menu
    // element, that will lead to both top and bottom of the menu being visible.
    function ensureMenuBottomVisible() {
        // If menu has never been resized, nothing that can be done here
        var storedHeightString = localGetItem('bigformmenu-height');
        if (storedHeightString === null) {
            return;
        }
        // formBottom should always be there, seeing it is set when the component is loaded.
        var formBottom = parseInt(localGetItem('bigformmenu-bottom'));
        var boundingRectangle = _mainMenuElement.getBoundingClientRect();
        var menuHeightWanted = boundingRectangle.top + parseInt(storedHeightString) + formBottom;
        var windowHeight = (window.innerHeight || document.documentElement.clientHeight);
        if (windowHeight < menuHeightWanted) {
            // Heigth stored in local storage is too high for the window.
            // Remove the bottom and height / max-height styles (which were set during menu resizes), 
            // so the stylesheet can take over 
            // sizing the heigth of the menu
            _mainMenuElement.style.height = null;
            _mainMenuElement.style.maxHeight = null;
            _mainMenuElement.style.bottom = null;
        }
        else {
            // window has grown higher to the point that the stored height can be used again
            setDimensionsFromLocalStorage();
        }
    }
    function hideMenu() {
        _mainMenuElement.classList.add('bigformmenu-hidden');
        localSetItem('bigformmenu-hidden', "1");
    }
    function showMenu() {
        _mainMenuElement.classList.remove('bigformmenu-hidden');
        localRemoveItem('bigformmenu-hidden');
    }
    function onMenuHideButtonClicked(e) {
        hideMenu();
    }
    function onMenuShowButtonClicked(e) {
        showMenu();
    }
    function onExpandAllMenuClicked(e) {
        var count = _menuElementInfos.length;
        for (var i = 0; i < count; i++) {
            var menuElementInfo = _menuElementInfos[i];
            menuElementInfo.isExpanded = true;
        }
        rebuildMenuList(false);
    }
    function onCollapseAllMenuClicked(e) {
        var count = _menuElementInfos.length;
        for (var i = 0; i < count; i++) {
            var menuElementInfo = _menuElementInfos[i];
            var defaultOpen = openByDefault(menuElementInfo, "collapseOpenAtLevel");
            // Close the items above the "collapseOpenAtLevel" level
            // Leave alone those items that could be opened. That way, if the user has closed
            // more items than this method would close, clicking collapse won't lead to actually
            // items being opened.
            if (!defaultOpen) {
                menuElementInfo.isExpanded = false;
            }
        }
        rebuildMenuList(false);
    }
    // Add a filter button to the filter bar (the bit of space left of the filter).
    // cssClassConfigName - name of config item holding css class of the button.
    // onClickHandler - runs when button is clicked.
    // parent - filter button will be added to this element.
    //
    function addFilterButton(cssClassConfigName, onClickHandler, titleConfigName, parent) {
        var cssClass;
        if (cssClassConfigName) {
            cssClass = getConfigValue(cssClassConfigName);
        }
        var title;
        if (titleConfigName) {
            title = getConfigValue(titleConfigName);
        }
        var filterButton = createFilterButton(cssClass, title, onClickHandler);
        parent.appendChild(filterButton);
    }
    function createFilterButton(cssClass, title, onClickHandler) {
        var filterButton = document.createElement("button");
        filterButton.type = "button";
        setClass(filterButton, cssClass);
        filterButton.classList.add('bigformmenu-filter-button');
        if (title) {
            filterButton.title = title;
        }
        filterButton.onclick = onClickHandler;
        return filterButton;
    }
    function createMainMenuElement() {
        var menuElement = document.createElement("div");
        menuElement.classList.add('bigformmenu');
        menuElement.id = 'bigformmenu';
        return menuElement;
    }
    function addMenuBody(_mainMenuElement, menuElementInfos) {
        _mainMenuElement.appendChild(verticalResizeDiv());
        _mainMenuElement.appendChild(horizontalResizeDiv('bigformmenu-left-horizontal-resizer', 1));
        _mainMenuElement.appendChild(horizontalResizeDiv('bigformmenu-right-horizontal-resizer', -1));
        var openButtonBar = document.createElement("div");
        openButtonBar.classList.add('bigformmenu-open-button-bar');
        addFilterButton('classMenuShowButton', onMenuShowButtonClicked, "titleMenuShowButton", openButtonBar);
        _mainMenuElement.appendChild(openButtonBar);
        var filterBar = document.createElement("div");
        filterBar.classList.add('bigformmenu-filter-bar');
        addFilterButton('classMenuHideButton', onMenuHideButtonClicked, "titleMenuHideButton", filterBar);
        addFilterButton('classExpandAllMenuButton', onExpandAllMenuClicked, 'titleExpandAllMenuButton', filterBar);
        addFilterButton('classCollapseAllMenuButton', onCollapseAllMenuClicked, 'titleCollapseAllMenuButton', filterBar);
        // Create the buttons area very early on, in case processing of the item state infos
        // or the rebuilding of the menu itself
        // has a dependency on the buttons.
        var buttonsArea = createButtonsArea();
        processAllItemStateInfos(filterBar, menuElementInfos);
        var filterInput = createFilterInput();
        filterBar.appendChild(filterInput);
        _mainMenuElement.appendChild(filterBar);
        _mainUlElement = document.createElement("ul");
        _mainMenuElement.appendChild(_mainUlElement);
        // Create buttons area
        _mainMenuElement.appendChild(buttonsArea);
        rebuildMenuList(false);
    }
    function visitAllItemStateInfos(callback) {
        visitKeyedConfigItems("itemStateInfos", callback);
    }
    function visitAllMenuButtonInfos(callback) {
        visitKeyedConfigItems("menuButtons", callback);
    }
    function visitKeyedConfigItems(configValueName, callback) {
        var configItems = getConfigValue(configValueName);
        var keys = Object.keys(configItems);
        var count = keys.length;
        for (var i = 0; i < count; i++) {
            var key = keys[i];
            callback(configItems[key]);
        }
    }
    // Creates a button area div. Visits all menu button infos
    // and adds the button to the button area div. Returns the button area div.
    function createButtonsArea() {
        var buttonArea = document.createElement("div");
        buttonArea.classList.add('bigformmenu-buttonarea');
        buttonArea.id = 'bigformmenu-buttonarea';
        visitAllMenuButtonInfos(function (menuButtonInfo) {
            if (menuButtonInfo.cssSelector) {
                var allButtonElements = document.querySelectorAll(menuButtonInfo.cssSelector);
                var _loop_1 = function (i) {
                    var currentButtonElement = allButtonElements[i];
                    var caption = currentButtonElement.innerHTML;
                    var onClick = function () { currentButtonElement.click(); };
                    var cssClass = currentButtonElement.className;
                    createButton(buttonArea, menuButtonInfo, caption, onClick, cssClass, currentButtonElement);
                };
                for (var i = 0; i < allButtonElements.length; i++) {
                    _loop_1(i);
                }
            }
            else {
                createButton(buttonArea, menuButtonInfo);
            }
        });
        return buttonArea;
    }
    function buttonIntersectionHandler(entries, observer) {
        var nbrEntries = entries.length;
        for (var i = 0; i < nbrEntries; i++) {
            var buttonElementInfo = buttonElementInfoByDomButton(entries[i].target);
            buttonElementInfo.isVisible = entries[i].isIntersecting;
        }
        var allButtonsVisible = true;
        for (var i = 0; i < _buttonElementInfos.length; i++) {
            if (!_buttonElementInfos[i].isVisible) {
                allButtonsVisible = false;
                break;
            }
        }
        setClass(_mainMenuElement, "bigformmenu-all-buttons-visible", allButtonsVisible);
    }
    function createButton(buttonArea, menuButtonInfo, caption, onClick, cssClass, domButton) {
        var button = document.createElement("button");
        button.type = "button";
        button.innerHTML = menuButtonInfo.caption || caption;
        button.onclick = menuButtonInfo.onClick || onClick;
        setClass(button, menuButtonInfo.cssClass || cssClass);
        var currentDomButton = menuButtonInfo.domButton || domButton;
        var generateButton = true;
        if (menuButtonInfo.wireUp) {
            generateButton = menuButtonInfo.wireUp(button);
        }
        if (generateButton) {
            buttonArea.appendChild(button);
            if (currentDomButton) {
                _buttonElementInfos.push(new ButtonElementInfo(currentDomButton));
            }
        }
    }
    // cssClass - class of the resizer grabber
    // direction - set to 1 if the grabber on the left is created, set to -1 if the one on the right is created. 
    function horizontalResizeDiv(cssClass, direction) {
        var resizeDiv = document.createElement("div");
        resizeDiv.classList.add(cssClass);
        resizeDiv.innerHTML = "&nbsp;";
        resizeDiv.addEventListener('mousedown', function (e) {
            e.preventDefault();
            var boundingRect = _mainMenuElement.getBoundingClientRect();
            var preMoveWidth = boundingRect.right - boundingRect.left;
            var preMoveMouseX = e.pageX;
            var resizeMenuHorizontally = function (e) {
                var newWidth = preMoveWidth - ((e.pageX - preMoveMouseX) * direction);
                storeWidth(newWidth);
                var minimumMenuWidth = getConfigValue('minimumMenuWidth');
                if (newWidth < minimumMenuWidth) {
                    window.removeEventListener('mousemove', resizeMenuHorizontally);
                    hideMenu();
                    return;
                }
                _mainMenuElement.style.width = newWidth + "px";
            };
            window.addEventListener('mousemove', resizeMenuHorizontally);
            window.addEventListener('mouseup', function () {
                window.removeEventListener('mousemove', resizeMenuHorizontally);
            });
        });
        return resizeDiv;
    }
    function verticalResizeDiv() {
        var resizeDiv = document.createElement("div");
        resizeDiv.classList.add('bigformmenu-vertical-resizer');
        resizeDiv.innerHTML = "&nbsp;";
        resizeDiv.addEventListener('mousedown', function (e) {
            e.preventDefault();
            var boundingRect = _mainMenuElement.getBoundingClientRect();
            var preMoveHeight = boundingRect.bottom - boundingRect.top;
            var preMoveMouseY = e.pageY;
            var resizeMenuVertically = function (e) {
                var newHeight = preMoveHeight + (e.pageY - preMoveMouseY);
                storeHeight(newHeight);
                var minimumMenuHeigth = getConfigValue('minimumMenuHeigth');
                if (newHeight < minimumMenuHeigth) {
                    window.removeEventListener('mousemove', resizeMenuVertically);
                    hideMenu();
                    return;
                }
                _mainMenuElement.style.height = newHeight + "px";
            };
            window.addEventListener('mousemove', resizeMenuVertically);
            window.addEventListener('mouseup', function () {
                window.removeEventListener('mousemove', resizeMenuVertically);
            });
        });
        return resizeDiv;
    }
    // Visits all item state infos, processes the menu element infos for each
    // and adds a filter button for each to the passed in filter bar. 
    function processAllItemStateInfos(filterBar, menuElementInfos) {
        visitAllItemStateInfos(function (itemStateInfo) {
            processItemStateInfo(itemStateInfo, filterBar, menuElementInfos);
        });
    }
    // Returns true if the given item state is active
    function getItemStateStatus(itemStateInfo) {
        var idx = _itemStateInfoActiveFilters.indexOf(itemStateInfo);
        return (idx !== -1);
    }
    // Sets the state of the given item state filter.
    // active - true to set active (so menu items are filtered), false to set inactive
    // filterButton - filter button associated with the item state
    function setItemStateStatus(active, itemStateInfo, filterButton) {
        setClass(_mainMenuElement, itemStateInfo.stateFilterActiveClass, active);
        setClass(filterButton, 'bigformmenu-filter-button-depressed', active);
        // Update _itemStateInfoActiveFilters array
        var idx = _itemStateInfoActiveFilters.indexOf(itemStateInfo);
        if (idx != -1) {
            _itemStateInfoActiveFilters.splice(idx, 1);
        }
        if (active) {
            _itemStateInfoActiveFilters.push(itemStateInfo);
        }
    }
    function onItemStateFilterButtonClicked(e, itemStateInfo) {
        var clickedElement = (e.currentTarget);
        var itemStateActive = getItemStateStatus(itemStateInfo);
        setItemStateStatus(!itemStateActive, itemStateInfo, clickedElement);
        rebuildMenuList(false);
    }
    // Called when the item state of a menu item is updated
    function setItemStateActive(active, itemStateInfo, filterButton, nextButton, previousButton, menuElementInfo) {
        var itemStates = menuElementInfo.itemStates;
        var idx = itemStates.indexOf(itemStateInfo);
        if (idx != -1) {
            itemStates.splice(idx, 1);
        }
        if (active) {
            itemStates.push(itemStateInfo);
        }
        // Update the menu element
        setClass(menuElementInfo.menuElement, itemStateInfo.hasActiveStateClass, active);
        // Update filter button style
        var existsActiveItem = active;
        if (!existsActiveItem) {
            var count = _menuElementInfos.length;
            for (var i = 0; i < count; i++) {
                var menuElementInfo_1 = _menuElementInfos[i];
                if (menuElementInfo_1.itemStates.indexOf(itemStateInfo) != -1) {
                    existsActiveItem = true;
                }
            }
        }
        if (itemStateInfo.onChangeMenuItemsWithItemStateExist) {
            itemStateInfo.onChangeMenuItemsWithItemStateExist(existsActiveItem);
        }
        filterButton.disabled = !existsActiveItem;
        nextButton.disabled = !existsActiveItem;
        previousButton.disabled = !existsActiveItem;
        if (!existsActiveItem) {
            setItemStateStatus(false, itemStateInfo, filterButton);
        }
        rebuildMenuList(true);
    }
    function onItemStatePreviousNextButtonClicked(itemStateInfo, increment) {
        var itemIndex = lastFocusedItemIndex();
        if (itemIndex == null) {
            itemIndex = -1;
        }
        var startingIndex = itemIndex;
        var nbrElementInfos = _menuElementInfos.length;
        do {
            itemIndex += increment;
            if (itemIndex < 0) {
                itemIndex = nbrElementInfos - 1;
            }
            else if (itemIndex >= nbrElementInfos) {
                itemIndex = 0;
            }
            if (itemIndex == startingIndex) {
                return;
            }
            if (_menuElementInfos[itemIndex].itemStates.indexOf(itemStateInfo) != -1) {
                setFocused(_menuElementInfos[itemIndex]);
                return;
            }
        } while (true);
    }
    function processItemStateInfo(itemStateInfo, filterBar, menuElementInfos) {
        var filterButton = createFilterButton(itemStateInfo.stateFilterButtonClass, itemStateInfo.buttonTitle, function (e) { onItemStateFilterButtonClicked(e, itemStateInfo); });
        filterButton.disabled = true;
        filterBar.appendChild(filterButton);
        var previousButton = createFilterButton(itemStateInfo.statePreviousButtonClass, itemStateInfo.buttonTitlePrevious, function (e) { onItemStatePreviousNextButtonClicked(itemStateInfo, -1); });
        previousButton.disabled = true;
        filterBar.appendChild(previousButton);
        var nextButton = createFilterButton(itemStateInfo.stateNextButtonClass, itemStateInfo.buttonTitleNext, function (e) { onItemStatePreviousNextButtonClicked(itemStateInfo, 1); });
        nextButton.disabled = true;
        filterBar.appendChild(nextButton);
        var count = menuElementInfos.length;
        var _loop_2 = function (i) {
            var menuElementInfo = _menuElementInfos[i];
            itemStateInfo.wireUp(menuElementInfo.domElement, function (active) { return setItemStateActive(active, itemStateInfo, filterButton, nextButton, previousButton, menuElementInfo); });
        };
        for (var i = 0; i < count; i++) {
            _loop_2(i);
        }
    }
    // If the element is visible inside the viewport, returns 0.
    // If it is not visible, returns distance from top of screen to top of element.
    // This will be negative if the element is above the screen. The more negative it is, the higher it is
    // (as in, the further away from the screen.)
    //
    // This does not take into consideration whether the element can be seen at any time.
    // That is, use this to find out if the element is scrolled onto the page or not,
    // not whether it has for example display:none.
    function elementIsVisible(element) {
        var boundingRectangle = element.getBoundingClientRect();
        var isVisible = ((boundingRectangle.top >= 0) &&
            (boundingRectangle.left >= 0) &&
            (boundingRectangle.bottom <= (window.innerHeight || document.documentElement.clientHeight)) &&
            (boundingRectangle.right <= (window.innerWidth || document.documentElement.clientWidth)));
        // If the element is not shown (display none, etc), top, left, bottom, right will all be 0.
        var isShown = !!(boundingRectangle.top || boundingRectangle.left || boundingRectangle.bottom || boundingRectangle.right);
        return { isVisible: isVisible, isShown: isShown, top: boundingRectangle.top };
    }
    // Returns true if the element is not hidden via display:none, visibility:hidden, etc. 
    // Does not look at whether the element is visible in the viewport.
    function elementIsDisplayed(element) {
        if (!(element.offsetWidth || element.offsetHeight || element.getClientRects().length)) {
            return false;
        }
        var style = getComputedStyle(element);
        return (!((style.display === 'none') || (style.visibility !== 'visible')));
    }
    // Sets a class on this menu item
    function setClassOnMenuItem(menuElement, classThisItem) {
        menuElement.menuElement.classList.add(classThisItem);
    }
    // Sets the bigformmenu-is-visible of an item.
    // Note that this doesn't reset the bigformmenu-is-visible etc. classes of items that are not visible.
    function setVisibility(menuElement, setIt) {
        if (setIt === void 0) { setIt = true; }
        setClass(menuElement.menuElement, 'bigformmenu-is-visible', setIt);
    }
    function removeVisibilityForMenu() {
        var count = _menuElementInfos.length;
        for (var i = 0; i < count; i++) {
            _menuElementInfos[i].menuElement.classList.remove('bigformmenu-is-visible');
        }
    }
    // Returns true if the menuElementInfo has passed any filters, and it is not hidden
    // because any of its parents is closed.
    // Even if this returns true, the element could still be invisible because scrolled out of the
    // visible area of the menu.
    function elementIsShownInMenu(menuElementInfo) {
        if (!menuElementInfo.isIncludedInMenu) {
            return false;
        }
        for (var e = menuElementInfo.parent; e && (e !== _menuElementInfosRoot); e = e.parent) {
            if (!e.isExpanded) {
                return false;
            }
        }
        return true;
    }
    function elementIsHeader(menuElementInfo) {
        return (menuElementInfo.level < _levelNonHeadingMenuItem);
    }
    // Returns true if the given menu item is visible inside the menu box.
    // Assumes the entire menu box is in a fixed location on the page and is entirely visible.
    function menuItemIsVisible(menuElementInfo) {
        var menuItemSpan = getCaptionElement(menuElementInfo);
        var availableXSpace = _mainUlElement.clientHeight - menuItemSpan.clientHeight;
        var isVisible = (menuElementInfo.menuElement.offsetTop >= _mainUlElement.scrollTop) &&
            (menuElementInfo.menuElement.offsetTop <= (_mainUlElement.scrollTop + availableXSpace));
        return isVisible;
    }
    function setMenuScrollTopIfNotDomScrolling(offsetTop) {
        // Do not scroll the menu while a DOM element is being scrolled into view.
        // When that happens, this method will be called for every DOM element that become visible durin this scroll.
        // If you try to scroll the menu while the DOM elements are being scrolled, the browser gets very confused
        // and the DOM scroll doesn't complete.
        //
        // At the end of the scroll, the scroll handler will call setVisibilityForMenu anyway, which will fix up the
        // scroll of the menu.
        if (_domScrolling) {
            return;
        }
        _mainUlElement.scrollTop = offsetTop;
    }
    // If given menu item is not visible inside the menu, scrolls the menu so the item
    // shows at the top.
    function menuItemMakeVisibleAtTop(menuElementInfo) {
        if (!menuItemIsVisible(menuElementInfo)) {
            setMenuScrollTopIfNotDomScrolling(menuElementInfo.menuElement.offsetTop);
        }
    }
    // If given menu item is not visible inside the menu, scrolls the menu so the item
    // shows at the bottom.
    function menuItemMakeVisibleAtBottom(menuElementInfo) {
        if (!menuItemIsVisible(menuElementInfo)) {
            var menuItemSpan = getCaptionElement(menuElementInfo);
            var availableXSpace = _mainUlElement.clientHeight - menuItemSpan.clientHeight;
            var newOffsetTop = menuElementInfo.menuElement.offsetTop - availableXSpace;
            if (newOffsetTop < 0) {
                newOffsetTop = 0;
            }
            setMenuScrollTopIfNotDomScrolling(newOffsetTop);
        }
    }
    function setVisibilityForMenuDirect() {
        if (!_menuElementInfos) {
            return;
        }
        removeVisibilityForMenu();
        var count = _menuElementInfos.length;
        var lastWasVisible = false;
        // The element that is 1) above the screen; 2) closest to the screen of all elements above the screen;
        // 3) visible inside the menu (not hidden because a parent is closed).
        var invisibleMenuHeaderAboveVisibleArea;
        // Distance to top of screen of invisibleMenuElementAboveVisibleArea.
        // This is negative. The closer to zero, the closer to the top.
        var closestDistanceToTop = Number.NEGATIVE_INFINITY;
        var firstVisibleElement;
        var lastVisibleElement;
        for (var i = 0; i < count; i++) {
            var currentMenuElementInfo = _menuElementInfos[i];
            var visibilityResult = elementIsVisible(currentMenuElementInfo.domElement);
            if (visibilityResult.isShown) {
                if (!visibilityResult.isVisible) {
                    if ((visibilityResult.top < 0) && (visibilityResult.top > closestDistanceToTop) &&
                        elementIsHeader(currentMenuElementInfo) &&
                        elementIsShownInMenu(currentMenuElementInfo)) {
                        invisibleMenuHeaderAboveVisibleArea = currentMenuElementInfo;
                    }
                }
                // If we just got past the items that were visible, then the rest will be invisible,
                // so no need to visit any more items.
                if (lastWasVisible && !visibilityResult.isVisible) {
                    break;
                }
                lastWasVisible = visibilityResult.isVisible;
                if (visibilityResult.isVisible) {
                    setVisibility(currentMenuElementInfo);
                    if (!firstVisibleElement) {
                        firstVisibleElement = currentMenuElementInfo;
                    }
                    lastVisibleElement = currentMenuElementInfo;
                }
            }
        }
        // The header just above the screen should be marked visible as well,
        // because at the top of the screen will probably be stuff that sits right under that header
        // but is not represented on the menu.
        if (invisibleMenuHeaderAboveVisibleArea) {
            setVisibility(invisibleMenuHeaderAboveVisibleArea);
            if (!firstVisibleElement) {
                firstVisibleElement = invisibleMenuHeaderAboveVisibleArea;
            }
            // Note that invisibleMenuHeaderAboveVisibleArea can only be the last visible element
            // if there are no other elements - seeing it by definition sits above all other
            // visible elements.
            if (!lastVisibleElement) {
                lastVisibleElement = invisibleMenuHeaderAboveVisibleArea;
            }
        }
        // Make sure that the menu elements associated with the visible dom elements
        // are actually in view.
        // Theoratically, there could be more visible elements than can be shown in the menu box.
        // You want to have the menu scrolling in the same direction as the document.
        // So, when scrolling down (towards bottom of the document), scroll the last "visible" menu item
        // into view. When scrolling up, scroll the first "visible" item in view.
        if (_scrollingDown) {
            menuItemMakeVisibleAtBottom(lastVisibleElement);
        }
        else {
            menuItemMakeVisibleAtTop(firstVisibleElement);
        }
        return;
    }
    // Returns index of the current filter in the caption of the given menu item.
    // Assumes the search filter is active.
    // If there is no match, returns -1.
    function matchesSearchFilter(menuElementInfo) {
        var filterValueLc = _searchTerm.toLowerCase();
        var foundIndex = menuElementInfo.caption.toLowerCase().indexOf(filterValueLc);
        return foundIndex;
    }
    // Finds out if the menu element in the menuElementInfo passes the search filter.
    // If so, updates the caption to highlight the matched bit and returns true.
    // Otherwise returns false.
    function passesSearchFilter(menuElementInfo) {
        var captionElement = getCaptionElement(menuElementInfo);
        // Restore the caption to its original state
        captionElement.innerHTML = menuElementInfo.caption;
        menuElementInfo.menuElement.classList.remove('bigformmenu-is-textmatch');
        if (!searchFilterIsActive()) {
            return true;
        }
        var foundIndex = matchesSearchFilter(menuElementInfo);
        if (foundIndex === -1) {
            return false;
        }
        var captionWithFilterTextSpan = insertMatchingFilterTextSpan(menuElementInfo.caption, foundIndex, _searchTerm.length);
        captionElement.innerHTML = captionWithFilterTextSpan;
        menuElementInfo.menuElement.classList.add('bigformmenu-is-textmatch');
        return true;
    }
    function passesItemStateFilters(menuElementInfo) {
        for (var i = 0; i < _itemStateInfoActiveFilters.length; i++) {
            if (menuElementInfo.itemStates.indexOf(_itemStateInfoActiveFilters[i]) === -1) {
                return false;
            }
        }
        return true;
    }
    function getMenuElementsUl(menuElementInfo) {
        var ulElement = document.createElement("ul");
        ulElement.classList.add('bigformmenu-top-menuitems');
        for (var i = 0; i < menuElementInfo.children.length; i++) {
            var childMenuElement = menuElementInfo.children[i];
            childMenuElement.isIncludedInMenu = false;
            var liElement = getMenuElementLi(childMenuElement);
            if (liElement) {
                ulElement.appendChild(liElement);
                childMenuElement.isIncludedInMenu = true;
            }
        }
        return ulElement;
    }
    // Gets the li element representing a menu element from the corresponding menuElementInfo.
    // Returns falsy if the menu element should not be shown (because it doesn't pass a filter).
    function getMenuElementLi(menuElementInfo) {
        var ulElement = getMenuElementsUl(menuElementInfo);
        var hasChildren = (ulElement.children.length > 0);
        setClass(menuElementInfo.menuElement, 'bigformmenu-has-children', hasChildren);
        if ((!passesSearchFilter(menuElementInfo)) && (!hasChildren)) {
            return null;
        }
        if ((!passesItemStateFilters(menuElementInfo)) && (!hasChildren)) {
            return null;
        }
        if ((!elementIsDisplayed(menuElementInfo.domElement)) && (!hasChildren)) {
            return null;
        }
        var liElement = document.createElement("li");
        liElement.appendChild(menuElementInfo.menuElement);
        if (hasChildren) {
            liElement.appendChild(ulElement);
            setClass(menuElementInfo.menuElement, "bigformmenu-item-open", menuElementInfo.isExpanded);
        }
        return liElement;
    }
    // Debounces calls to a method.
    // timerId - store this between calls. Will be updated by the method. Initialise to a { id: 0 }
    // bounceMs - the method will not be called more often than once every bounceMs milliseconds.
    // callback - method to be called.
    function debounce(timerId, bounceMs, callback) {
        if (timerId.id) {
            clearTimeout(timerId.id);
        }
        timerId.id = setTimeout(callback, bounceMs);
    }
    var rebuildMenuDebounceTimer = {
        id: 0,
        // True if scroll position will be kept the same. Only for rebuildMenuList.
        keepScroll: true,
        // True if the next action will be rebuild menu list. False if it will be setVisibilityForMenuDirect only.
        rebuildMenuList: false
    };
    // Replaces the ul with the menu items with a new ul holding the new set of menu items.
    // keepScroll - true if the scroll of the ul should be maintained, false if it should be reset to 0.
    //
    // If any of the calls to rebuildMenuList during the debounce period has keepScroll = false,
    // then keepScroll is false will be used.
    function rebuildMenuList(keepScroll) {
        rebuildMenuDebounceTimer.keepScroll && (rebuildMenuDebounceTimer.keepScroll = keepScroll);
        rebuildMenuDebounceTimer.rebuildMenuList = true;
        scheduleDebouncedAction();
    }
    function setVisibilityForMenu() {
        scheduleDebouncedAction();
    }
    function scheduleDebouncedAction() {
        debounce(rebuildMenuDebounceTimer, 50, function () {
            var keepScroll = rebuildMenuDebounceTimer.keepScroll;
            rebuildMenuDebounceTimer.keepScroll = true;
            var rebuildMenuList = rebuildMenuDebounceTimer.rebuildMenuList;
            rebuildMenuDebounceTimer.rebuildMenuList = false;
            if (rebuildMenuList) {
                var scrollBuffer = _mainUlElement.scrollTop;
                var ulElement = getMenuElementsUl(_menuElementInfosRoot);
                // The top level ul must be positioned, so location of menu items within that ul
                // can be determined with offsetTop
                // Make sure ONLY the top level ul is positioned, not lower level ones.
                ulElement.style.position = "relative";
                _mainMenuElement.replaceChild(ulElement, _mainUlElement);
                _mainUlElement = ulElement;
                ensureMenuBottomVisible();
                setVisibilityForMenuDirect();
                setScrolledToMenuHeightClass();
                if (keepScroll) {
                    _mainUlElement.scrollTop = scrollBuffer;
                }
            }
            else {
                setVisibilityForMenuDirect();
                setScrolledToMenuHeightClass();
            }
        });
    }
    function handleSingleIntersection(entry) {
        if (entry.isIntersecting) {
            // Entry is now intersecting. If currently it is not in the menu, rebuild the menu.
            // Otherwise highlight the associated menu item.
            var menuElementInfo = menuElementInfoByDomElement(entry.target);
            if (menuElementInfo) {
                if (menuElementInfo.isIncludedInMenu) {
                    if (_scrollingDown) {
                        menuItemMakeVisibleAtBottom(menuElementInfo);
                    }
                    else {
                        menuItemMakeVisibleAtTop(menuElementInfo);
                    }
                    setVisibility(menuElementInfo);
                }
                else {
                    rebuildMenuList(true);
                }
            }
            return;
        }
        // Entry is not intersecting anymore. If this is because it is no longer displayed (display none),
        // then rebuild the menu. Otherwise remove the highlighted class.
        if (elementIsDisplayed(entry.target)) {
            var menuElementInfo = menuElementInfoByDomElement(entry.target);
            setVisibility(menuElementInfo, false);
        }
        else {
            rebuildMenuList(true);
        }
    }
    function intersectionHandler(entries, observer) {
        var nbrEntries = entries.length;
        for (var i = 0; i < nbrEntries; i++) {
            handleSingleIntersection(entries[i]);
        }
    }
    function scrollHandler() {
        var currentYOffset = window.pageYOffset;
        _scrollingDown = (currentYOffset > _lastPageYOffset);
        _lastPageYOffset = (currentYOffset < 0) ? 0 : currentYOffset;
        setVisibilityForMenu();
    }
    BigFormMenu.scrollHandler = scrollHandler;
    function resizeHandler() {
        setVisibilityForMenu();
        ensureMenuBottomVisible();
    }
    BigFormMenu.resizeHandler = resizeHandler;
    function pageLoadedHandler() {
        _lastPageYOffset = window.pageYOffset;
        var allDomElements = getAllDomElements();
        var hideForSmallForms = getConfigValue('hideForSmallForms');
        if (hideForSmallForms) {
            if (allDomElementsVisible(allDomElements)) {
                // If all DOM elements (that is, fields in the form) are visible now, then this is a small form
                // and we won't add the menu to the DOM.
                return;
            }
        }
        _menuElementInfos = domElementsToMenuElements(allDomElements);
        setParents(_menuElementInfosRoot, { value: 0 }, _menuElementInfos);
        // Set _mainMenuElement early, because it will be used if setActive is called (part of itemStateInfo).
        // setActive may be called while the menu is being created.
        _mainMenuElement = createMainMenuElement();
        if (localGetItem('bigformmenu-hidden')) {
            _mainMenuElement.classList.add('bigformmenu-hidden');
        }
        if (runningIE()) {
            _mainMenuElement.classList.add('bigformmenu-ie');
        }
        addMenuBody(_mainMenuElement, _menuElementInfos);
        setDimensionsFromLocalStorage();
        var bodyElement = document.getElementsByTagName("BODY")[0];
        bodyElement.appendChild(_mainMenuElement);
        storeMenuBottom();
        _mainMenuElementHeight = getMainMenuElementHeight();
        // IE11 does not support IntersectionObserver
        if (!!window.IntersectionObserver) {
            _intersectionObserver = new IntersectionObserver(intersectionHandler, { threshold: 1.0 });
            for (var i = 0; i < _menuElementInfos.length; i++) {
                _intersectionObserver.observe(_menuElementInfos[i].domElement);
            }
            // Threshold 0 means invoke the handler if even one pixel becomes visible
            _buttonsIntersectionObserver = new IntersectionObserver(buttonIntersectionHandler, { threshold: 0 });
            for (var i = 0; i < _buttonElementInfos.length; i++) {
                _buttonsIntersectionObserver.observe(_buttonElementInfos[i].domButton);
            }
        }
        var rebuildOnClickedSelector = getConfigValue("rebuildOnClickedSelector");
        if (rebuildOnClickedSelector) {
            var rebuildOnClickedElements = document.querySelectorAll(rebuildOnClickedSelector);
            for (var i = 0; i < rebuildOnClickedElements.length; i++) {
                rebuildOnClickedElements[i].addEventListener("click", function () {
                    rebuildMenuList(true);
                });
            }
        }
        document.addEventListener('scroll', function (e) {
            // IE will fire the scroll event if anything inside the document (such as the menu) is scrolled,
            // not only when the document itself is scrolled. So only take action if the target of the event is the document.
            if (e.target !== document) {
                return;
            }
            BigFormMenu.scrollHandler();
        }, {
            passive: true
        });
        // The resize event only gets triggered on the window object, and doesn't bubble.
        // See https://developer.mozilla.org/en-US/docs/Web/API/Window/resize_event
        window.addEventListener("resize", function () {
            BigFormMenu.resizeHandler();
        });
    }
    BigFormMenu.pageLoadedHandler = pageLoadedHandler;
})(BigFormMenu || (BigFormMenu = {}));
//# sourceMappingURL=bigformmenu.js.map