///<reference path="formmenu.d.ts" />

/*!
 * Copyright (c) 2016-__YEAR__ Mattijs Perdeck | License: MIT
 * Version: __Version__
 * NPM: https://www.npmjs.com/package/formmenu
 * Source Code: https://github.com/mperdeck/formmenu
 * Documentation: https://formmenu.com
*/

// "DOMContentLoaded" fires when the html has loaded, even if the stylesheets, javascript, etc are still being loaded.
// "load" fires when the entire page has loaded, including stylesheets, etc. Use against window, not document.

window.addEventListener("load", function () {
    if (!FormMenu.formMenuConfiguration.suppressLoadOnPageLoad) {
        FormMenu.pageLoadedHandler();
    }
});

namespace FormMenu {
    const _levelNonHeadingMenuItem: number = 9000;

    let defaultConfiguration: iFormMenuConfiguration = {
        skipFirstHeading: true,

        defaultOpenAtLevel: _levelNonHeadingMenuItem + 1,

        collapseOpenAtLevel: 1,

        minimumMenuWidth: 60,
        minimumMenuHeigth: 100,

        hideForSmallForms: true,

        filterPlaceholder: 'filter',
        filterMinimumCharacters: 2,
        highlightFilteredDomElements: true,

        classMenuShowButton: 'formmenu-menu-show',
        classMenuHideButton: 'formmenu-menu-hide',
        classExpandAllMenuButton: 'formmenu-expand-all-menu-button',
        classCollapseAllMenuButton: 'formmenu-collapse-all-menu-button',
        classPreviousHeadingBox: 'formmenu-previous-heading-box',
        classNextHeadingBox: 'formmenu-next-heading-box',

        titleMenuShowButton: 'Show menu',
        titleMenuHideButton: 'Hide menu',
        titleExpandAllMenuButton: 'Expand all',
        titleCollapseAllMenuButton: 'Collapse all',
        titlePreviousHeadingBox: 'Previous section',
        titleNextHeadingBox: 'Next section',

        domElementClasses: [
            // Note that HTML only has these heading tags. There is no h7, etc.
            { level: 1, cssSelector: "h1" },
            { level: 2, cssSelector: "h2" },
            { level: 3, cssSelector: "h3" },
            { level: 4, cssSelector: "h4" },
            { level: 5, cssSelector: "h5" },
            { cssSelector: "h6" }
        ],

        itemStateInfos: {},
        menuButtons: {},
        getInputElementMethod: getInputElementDefaultMethod
    }

    // Create empty formMenuConfiguration here, to make it easier to write
    // ...formmenu.config.js files that set properties on this object.
    //
    // Do not use let here, because that doesn't allow you to declare a variable 
    // multiple times.
    export var formMenuConfiguration: iFormMenuConfiguration = {};

    class DomElementInfo {
        constructor(
            // The heading, etc. in the actual DOM (not in the menu)
            public element: HTMLElement,

            // class of this element
            public domElementClass: iDomElementClass,

            // distance of this element from the top of the page
            public top: number
        ) { }
    }

    class MenuElementInfo {

        constructor(
            // The heading, etc. in the actual DOM (not in the menu)
            public domElement: HTMLElement,

            // Caption of the menu element
            public caption: string,

            // Level of the menu item. For example, a H1 has level 1, H2 has level 2.
            // Menu items that are not associated with a heading have a very high level.
            public level: number,

            // CSS selector that found the DOM element that is represented by this menu element
            public cssSelector: string
        ) { }

        // The item in the menu
        public menuElement: HTMLElement;

        // Headings constitute a hierarchy. An H2 below an H1 is the child of that H1.
        // non-headings are children of the heading they sit under.
        public parent: MenuElementInfo;
        public children: MenuElementInfo[] = [];

        // If this element has children, then if true the element is expanded
        public isExpanded: boolean = false;

        // If true, the menu element will be given +- buttons, even if it has no children
        public forceExpandable: boolean = false;

        // True if this element was the last menu item whose associated input element received the focus.
        // Note that this means it may not have the focus right now. This could happen if the element that currently has focus
        // is not an input element associated with a menu item (for example, this could be a previous / next button).
        public lastHadFocus: boolean = false;

        // true if the menuElement (the dom menu item) is included in the menu. That is, if any filters are active,
        // it passed those filters. And it is displayed (no display:none).
        // Note that the menu item could be still not visible to the user even if this is true, because its parent was closed,
        // because it is scrolled out of the menu div visible area.
        public isIncludedInMenu: boolean = false;

        // Contains all item state infos that are active for this element
        public itemStates: iItemStateInfo[] = [];
    }

    // Represents a button in the DOM pointed at by a button at the bottom of the menu
    class ButtonElementInfo {
        constructor(
            public domButton: HTMLButtonElement
        ) { }

        public isVisible: boolean;
    }

    let _menuElementInfos: MenuElementInfo[];

    // Acts as the parent of menu elements with the lowest level (typically the h1)
    // Use the children property of this element to easily generate the ul tag
    // containing the menu items.
    // Must have a level lower than 1.
    let _menuElementInfosRoot: MenuElementInfo = new MenuElementInfo(null, null, 0, null);

    // The div that contains the entire menu
    let _mainMenuElement: HTMLElement;

    // Height of the entire menu. Set when the menu is loaded initially. Should only be used
    // when the menu height is fixed, so if it is used as a button bar instead of the full menu.
    let _mainMenuElementHeight: number;

    // The div that contains the entire menu
    let _mainUlElement: HTMLUListElement;

    // The current content of the search box
    let _searchTerm: string = '';

    // Holds references to all iItemStateInfos whose filers are active
    let _itemStateInfoActiveFilters: iItemStateInfo[] = [];

    // Used to determine in which direction the page is scrolling
    let _lastPageYOffset: number = 0;

    // If true, we're scrolling towards the end of the document
    let _scrollingDown = true;

    // True if a DOM element is being scrolled into view using scrollIntoView
    let _domScrolling = false;

    let _intersectionObserver: IntersectionObserver;

    let _buttonElementInfos: ButtonElementInfo[] = [];

    let _buttonsIntersectionObserver: IntersectionObserver;

    function allMenuElementInfos(callback: () => void) {

    }

    // Returns true if the browser is IE
    function runningIE(): boolean {
        const ua = window.navigator.userAgent;
        return (ua.indexOf('MSIE ') > -1) || (ua.indexOf('Trident/') > -1);
    }

    function localGetItem(key: string) {
        if (!localStorage) {
            console.log('localStorage not supported. Are you loading this file from the file system, using IE?');
            return;
        }

        return localStorage.getItem(key);
    }

    function localSetItem(key: string, value: string) {
        if (!localStorage) {
            return;
        }

        localStorage.setItem(key, value);
    }

    function localRemoveItem(key: string) {
        if (!localStorage) {
            return;
        }

        localStorage.removeItem(key);
    }

    // Returns the distance in pixels from the bottom of the screen to the bottom of the document
    function scrollDistanceToBottom(): number {
        // See https://learnersbucket.com/examples/javascript/detect-if-window-is-scrolled-to-the-bottom/

        const distance: number = document.body.offsetHeight - (window.innerHeight + window.pageYOffset);
        return distance;
    }

    function getMainMenuElementHeight(): number {
        const boundingRectangle = _mainMenuElement.getBoundingClientRect();
        return boundingRectangle.height;
    }

    // Sets the formmenu-scrolled-to-menu-height class on the main menu div
    // if the distance from bottom of the window to the bottom of the document is less than
    // the height of the menu.
    // 
    // Use this when using the menu as a button bar fixed at the bottom of the page.
    // The class will be added when the user scrolls so far down the document that the button bar starts to obscure
    // the very bottom of the document. If you don't remove the button bar then, the user will not be able to see 
    // the very bottom of the document.
    function setScrolledToMenuHeightClass(): void {
        const scrollBottomWithinMenuHeight = scrollDistanceToBottom() <= _mainMenuElementHeight;
        setClass(_mainMenuElement, 'formmenu-scrolled-to-menu-height', scrollBottomWithinMenuHeight);
    }

    // Finds a MenuElementInfo given the DOM element it points at.
    // If no such MenuElementInfo is found, returns null.
    function menuElementInfoByDomElement(domElement: HTMLElement): MenuElementInfo {
        for (let i = 0; i < _menuElementInfos.length; i++) {
            let menuElementInfo = _menuElementInfos[i];
            if (menuElementInfo.domElement === domElement) {
                return menuElementInfo;
            }
        }

        return null;
    }

    // Finds a ButtonElementInfo given the DOM element it points at.
    // If no such ButtonElementInfo is found, returns null.
    function buttonElementInfoByDomButton(domButton: HTMLButtonElement): ButtonElementInfo {
        for (let i = 0; i < _buttonElementInfos.length; i++) {
            let buttonElementInfo = _buttonElementInfos[i];
            if (buttonElementInfo.domButton === domButton) {
                return buttonElementInfo;
            }
        }

        return null;
    }

    function searchFilterIsActive(): boolean {
        const filterValue = _searchTerm;
        const filterMinimumCharacters: number = getConfigValue("filterMinimumCharacters");

        // Filter is active if there is a filter value, and there are enough filter characters.
        const filterIsActive = (filterValue && (filterValue.length >= filterMinimumCharacters));

        return filterIsActive;
    }

    function getInputElementDefaultMethod(domElement: HTMLElement): HTMLInputElement {
        if (domElement.tagName.toLowerCase() !== 'label') { return null; }
        let labelElement: HTMLLabelElement = domElement as HTMLLabelElement;
        let inputElementId = labelElement.htmlFor;

        if (inputElementId) {
            let inputElement: HTMLInputElement = document.getElementById(inputElementId) as HTMLInputElement;
            return inputElement;
        }

        return null;
    }

    function tagNameToLevel(tagName: string): number {
        let tagNameToLevelMethod: (tagName: string) => number = getConfigValue("tagNameToLevelMethod");
        let level: number = tagNameToLevelMethod(tagName);
        return level;
    }

    function getInputElement(domElement: HTMLElement): HTMLInputElement {
        let getInputElementMethod: (domElement: HTMLElement) => HTMLInputElement = getConfigValue("getInputElementMethod");
        let inputElement: HTMLInputElement = getInputElementMethod(domElement);
        return inputElement;
    }

    function getConfigValue(itemName: string): any {
        // formMenuConfiguration may have been created by loading .js file that defines that variable.
        // First try to get the value from there. Otherwise get it from the default config.
        // Note that you want to check against undefined specifically, because for example false
        // is a valid value.

        // Do not use "if (formMenuConfiguration)", because then you'll get a run time reference error
        // if the variable does not exist already.
        if (typeof formMenuConfiguration !== 'undefined') {
            if (typeof formMenuConfiguration[itemName] !== 'undefined') {
                return formMenuConfiguration[itemName];
            }
        }

        return defaultConfiguration[itemName];
    }

    // Returns all dom elements to be represented in the menu
    function getAllDomElements(): DomElementInfo[] {
        let domElementInfos: DomElementInfo[] = [];
        let domElementClasses: iDomElementClass[] = getConfigValue("domElementClasses");

        for (let i = 0; i < domElementClasses.length; i++) {
            let domElements = document.querySelectorAll(domElementClasses[i].cssSelector);

            for (let j = 0; j < domElements.length; j++) {
                const element = domElements[j] as HTMLElement;
                const boundingRectangle = element.getBoundingClientRect();

                domElementInfos.push(new DomElementInfo(element, domElementClasses[i], boundingRectangle.top));
            }
        }

        // Sort the menu elements by how far the associated DOM elements are from the top of the screen.
        domElementInfos.sort(function (e1, e2) { return e1.top - e2.top });

        return domElementInfos;
    }

    // Returns true if all dom elements are visible.
    // See notes for hideForSmallForms option.
    function allDomElementsVisible(domElements: DomElementInfo[]): boolean {
        for (let i = 0; i < domElements.length; i++) {
            let visibilityResult = elementIsVisible(domElements[i].element as HTMLElement);

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
    function domElementsToMenuElements(domElements: DomElementInfo[]): MenuElementInfo[] {
        let _menuElementInfos: MenuElementInfo[] = [];

        let count = domElements.length;
        for (let i = 0; i < count; i++) {
            let value = domElements[i];

            let menuElement = domElementToMenuElement(value);
            if (menuElement) {
                _menuElementInfos.push(menuElement);
            }
        }

        return _menuElementInfos;
    }

    // Create a flash against the given DOM element, to attract the user's attention to it.
    function flashElement(domElement: HTMLElement) {
        // See https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Animations/Using_CSS_animations
        domElement.addEventListener("animationend",
            function () { domElement.classList.remove('formmenu-highlighted-dom-item'); }, false);
        domElement.classList.add('formmenu-highlighted-dom-item');
    }

    function scrollDomElementIntoView(domElement: HTMLElement) {
        _domScrolling = true;
        domElement.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });

        // The scroll is asynchronous, so when scrollIntoView returns, it is still scrolling.
        // And time taken to scroll is browser specific.
        // See https://stackoverflow.com/questions/46795955/how-to-know-scroll-to-element-is-done-in-javascript
        // Guess that it will take no more than 500 ms.

        setTimeout(function () { _domScrolling = false; }, 500);
    }

    function showAndFlashElement(domElement: HTMLElement) {
        let isVisibleResult = elementIsVisible(domElement);
        if (isVisibleResult.isShown) {
            if (!isVisibleResult.isVisible) {
                scrollDomElementIntoView(domElement);

                // Delay the flash a little bit, to allow for the element to smooth scroll into view.
                setTimeout(function () { flashElement(domElement); }, 500);
            } else {
                flashElement(domElement);
            }
        }
    }

    function setHasFocus(menuElementInfo: MenuElementInfo) {
        // Reset the flag of the last item that received the focus
        for (let i = 0; i < _menuElementInfos.length; i++) {
            _menuElementInfos[i].lastHadFocus = false;
        }

        menuElementInfo.lastHadFocus = true;
    }

    // Call this method when an input element associated with the given menu element gains or loses the focus.
    function onFocused(menuElementInfo: MenuElementInfo, hasFocus: boolean) {
        if (hasFocus) {
            setHasFocus(menuElementInfo);
        }

        setClass(menuElementInfo.menuElement, 'formmenu-has-caption', hasFocus);
    }

    function setOnFocusHandlers(menuElementInfo: MenuElementInfo) {
        const inputElement: HTMLInputElement = getInputElement(menuElementInfo.domElement);

        if (!inputElement) { return; }

        inputElement.addEventListener("focus", function () {
            onFocused(menuElementInfo, true);
        });

        inputElement.addEventListener("blur", function () {
            onFocused(menuElementInfo, false);
        });
    }

    // Gives the focus to the input element associated with the given menu item.
    function setFocused(menuElementInfo: MenuElementInfo) {

        // Set lastHadFocus explicitly instead of relying on the focus event to fire on the control
        // when it it given the focus further down. This to deal with controls that somehow do not
        // fire the focus event.
        setHasFocus(menuElementInfo);

        const inputElement: HTMLInputElement = getInputElement(menuElementInfo.domElement);
        if (!inputElement) { return; }

        showAndFlashElement(menuElementInfo.domElement);
        inputElement.focus();
    }

    // Returns the index in the _menuElementInfos array of the item associated with an input that last received the focus.
    // Returns null if there is no such item.
    function lastFocusedItemIndex(): number {
        for (let i = 0; i < _menuElementInfos.length; i++) {
            if (_menuElementInfos[i].lastHadFocus) { return i; }
        }

        return null;
    }

    function domElementToMenuElement(domElement: DomElementInfo): MenuElementInfo {
        let element = domElement.element;
        let getItemCaption = domElement.domElementClass.getItemCaption;

        let caption;

        if (getItemCaption) {
            caption = getItemCaption(element);
        } else {
            caption = element.innerText;
        }

        if (!caption) {
            return null;
        }

        let menuElementClass = 'formmenu-' + element.tagName;

        // If a menu item gets clicked, scroll the associated dom element into view if it is not already
        // visible. If it is already visible, do not scroll it.
        //
        // Also give it the formmenu-highlighted-dom-item for a short time, to point out where
        // it is.
        let onClickHandler = (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
             
            showAndFlashElement(element);
            return false;
        };

        let level: number = domElement.domElementClass.level || _levelNonHeadingMenuItem;
        let menuElementInfo = new MenuElementInfo(
            element,
            caption,
            level,
            domElement.domElementClass.cssSelector);

        let getForceExpandable = domElement.domElementClass.getForceExpandable;
        menuElementInfo.forceExpandable = false;

        if (getForceExpandable) {
            menuElementInfo.forceExpandable = getForceExpandable(element);
        }

        let menuElementDiv = createMenuElementDiv(menuElementInfo, menuElementClass,
            domElement.domElementClass.anchorCssClass, onClickHandler);
        menuElementInfo.menuElement = menuElementDiv;

        let defaultOpen: boolean = openByDefault(menuElementInfo, "defaultOpenAtLevel");
        menuElementInfo.isExpanded = defaultOpen;

        setOnFocusHandlers(menuElementInfo);

        return menuElementInfo;
    }

    // Sets the parent property in all elements in _menuElementInfos.
    // parent: set to _menuElementInfosRoot
    // i: set to 0
    function setParents(parent: MenuElementInfo, i: { value: number }, _menuElementInfos: MenuElementInfo[]): void {
        const parentLevel: number = parent.level;

        while ((i.value < _menuElementInfos.length) && (_menuElementInfos[i.value].level > parentLevel)) {

            let currentMenuElementInfo = _menuElementInfos[i.value];
            currentMenuElementInfo.parent = parent;

            if (parent) { parent.children.push(currentMenuElementInfo); }

            // Point to first potential child item
            i.value = i.value + 1;

            setParents(currentMenuElementInfo, i, _menuElementInfos);
        }
    }

    // If the element has cssClass, remove it. Otherwise add it.
    function toggleClass(htmlElement: HTMLElement, cssClass: string): void {
        if (htmlElement.classList.contains(cssClass)) {
            htmlElement.classList.remove(cssClass);
        } else {
            htmlElement.classList.add(cssClass);
        }
    }

    // Adds the given class to the given element.
    // cssClass - one or more classes, separated by space
    // setIt - if true, the classes are added. If false, the classes are removed.
    function setClass(htmlElement: HTMLElement, cssClass: string, setIt: boolean = true): void {
        if (cssClass) {
            const cssClasses: string[] = cssClass.split(' ');
            for (let i = 0; i < cssClasses.length; i++) {
                if (cssClasses[i] && (cssClasses[i] !== ' ')) {
                    if (!setIt) {
                        htmlElement.classList.remove(cssClasses[i]);
                    } else {
                        htmlElement.classList.add(cssClasses[i]);
                    }
                }
            }
        }
    }

    // If there is a local storage item with the given key, removes it.
    // Otherwise adds it with a non-falsy value.
    function toggleLocalStorage(key: string) {
        if (localGetItem(key)) {
            localRemoveItem(key);
        } else {
            localSetItem(key, "1");
        }
    }

    // Returns if by default the menu item should be open, false otherwise.
    // levelConfigItemName - name of config item that has the level at which the item should be open
    function openByDefault(menuElementInfo: MenuElementInfo, levelConfigItemName: string): boolean {
        const levelConfig: number = getConfigValue(levelConfigItemName);
        const result = ((menuElementInfo.level <= levelConfig) || (levelConfig == -1));

        return result;
    }

    function onExpandClicked(menuElementInfo: MenuElementInfo) {
        toggleClass(menuElementInfo.menuElement, 'formmenu-item-open')
        menuElementInfo.isExpanded = !menuElementInfo.isExpanded;
        ensureMenuBottomVisible();
        return false;
    }

    function createMenuElementDiv(menuElementInfo: MenuElementInfo, cssClass: string, anchorCssClass: string, onClickHandler: (e: MouseEvent) => void): HTMLElement {
        let menuElement: HTMLElement = document.createElement("div");

        let expandElement: HTMLAnchorElement = document.createElement("a");
        expandElement.href = "#";
        expandElement.classList.add("formmenu-expand");
        expandElement.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            onExpandClicked(menuElementInfo);
        }
        menuElement.appendChild(expandElement);

        let captionElement: HTMLAnchorElement = document.createElement("a");
        captionElement.href = "#";
        captionElement.classList.add("formmenu-caption");
        if (anchorCssClass) { captionElement.classList.add(anchorCssClass); }
        captionElement.innerHTML = menuElementInfo.caption;
        captionElement.onclick = onClickHandler;
        menuElement.appendChild(captionElement);

        setClass(menuElement, cssClass);
        menuElement.classList.add("formmenu-item");

        return menuElement;
    }

    // Gets the span with the caption from a MenuElementInfo
    function getCaptionElement(menuElementInfo: MenuElementInfo): HTMLElement {
        const divElement: HTMLElement = menuElementInfo.menuElement;
        const captionSpanElement: HTMLElement = <HTMLElement>(divElement.children[1]);

        return captionSpanElement;
    }

    // Sets the formmenu-matching-filter-dom-element class on all DOM elements that match the current filter.
    // Scrolls the first matching DOM element into view if the filter is active.
    //
    // Resets it on those that do not match the filter.
    // Resets it on all elements if the filter is not active.
    function doHighlightFilteredDomElements(): void {
        let firstFound = false;
        const filterIsActive = searchFilterIsActive();

        for (let i = 0; i < _menuElementInfos.length; i++) {
            let highlightDomElement = filterIsActive && (matchesSearchFilter(_menuElementInfos[i]) !== -1);
            let domElement = _menuElementInfos[i].domElement;

            setClass(domElement, 'formmenu-matching-filter-dom-element', highlightDomElement);

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
    // ab<span class='formmenu-matching-filter-text'>cde</span>fgi
    function insertMatchingFilterTextSpan(s: string, startIndex: number, spanLength: number): string {
        const part1 = s.substring(0, startIndex);
        const part2 = s.substring(startIndex, startIndex + spanLength);
        const part3 = s.substring(startIndex + spanLength);

        const result = part1 + "<span class='formmenu-matching-filter-text'>" + part2 + "</span>" + part3;
        return result;
    }

    function onChangeFilter(e: Event): void {
        _searchTerm = (<HTMLInputElement>(e.currentTarget)).value;

        setClass(_mainMenuElement, 'formmenu-textmatch-filter-is-active', searchFilterIsActive());

        let highlightFilteredDomElements = getConfigValue("highlightFilteredDomElements") as boolean;
        if (highlightFilteredDomElements) {
            doHighlightFilteredDomElements();
        }

        rebuildMenuList(false);
    }

    function createFilterInput(): HTMLInputElement {
        let menuElement: HTMLInputElement = document.createElement("input");

        menuElement.type = "search";
        menuElement.className = 'formmenu-filter';

        let filterPlaceholder = getConfigValue("filterPlaceholder");
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

    function setMenuHeight(height: number): void {
        const widthResizeOnly: boolean = getConfigValue('widthResizeOnly');
        if (widthResizeOnly) { return; }

        _mainMenuElement.style.height = height + "px";
    }

    function storeDimensions(width: number, height: number): void {
        localSetItem('formmenu-width', width.toString());
        localSetItem('formmenu-height', height.toString());
    }

    function storeWidth(width: number): void {
        localSetItem('formmenu-width', width.toString());
    }

    function storeHeight(height: number): void {
        localSetItem('formmenu-height', height.toString());
    }

    function getDimensions(): { width: number, height: number } {
        const result = {
            width: parseInt(localGetItem('formmenu-width')),
            height: parseInt(localGetItem('formmenu-height'))
        };

        return result;
    }

    function setDimensionsFromLocalStorage(): void {
        let dimensions = getDimensions();

        if (!isNaN(dimensions.width)) {
            _mainMenuElement.style.width = dimensions.width + "px";
        }

        if (!isNaN(dimensions.height)) {
            _mainMenuElement.style.height = dimensions.height + "px";
        }
    }

    // If formmenu-bottom has not been set, figures out the distance between the bottom of the
    // menu and the bottom of the screen and stores that under formmenu-bottom.
    function storeMenuBottom(): void {

        if (localGetItem("formmenu-bottom") !== null) { return; }

        const boundingRectangle = _mainMenuElement.getBoundingClientRect();
        const windowHeight = (window.innerHeight || document.documentElement.clientHeight);
        const formBottom = windowHeight - boundingRectangle.bottom;

        localSetItem('formmenu-bottom', formBottom.toString());
    }

    // If the user resizes the window, reducing it height, at some point the menu
    // will start extending below the bottom of the window. So its bottom is no longer
    // visible. Ensures this doesn't happen by removing
    // the height or max-height property; and
    // the bottom: auto property.
    // This allows the stylesheet to take over. If this sets top and bottom of the main menu
    // element, that will lead to both top and bottom of the menu being visible.
    function ensureMenuBottomVisible(): void {

        // If menu has never been resized, nothing that can be done here
        const storedHeightString = localGetItem('formmenu-height');
        if (storedHeightString === null) { return; }

        // formBottom should always be there, seeing it is set when the component is loaded.
        const formBottom = parseInt(localGetItem('formmenu-bottom'));

        const boundingRectangle = _mainMenuElement.getBoundingClientRect();
        const menuHeightWanted = boundingRectangle.top + parseInt(storedHeightString) + formBottom;
        const windowHeight = (window.innerHeight || document.documentElement.clientHeight);

        if (windowHeight < menuHeightWanted) {
            // Heigth stored in local storage is too high for the window.
            // Remove the bottom and height / max-height styles (which were set during menu resizes), 
            // so the stylesheet can take over 
            // sizing the heigth of the menu

            _mainMenuElement.style.height = null;
            _mainMenuElement.style.maxHeight = null;
            _mainMenuElement.style.bottom = null;
        } else {
            // window has grown higher to the point that the stored height can be used again
            setDimensionsFromLocalStorage();
        }
    }

    function hideMenu(): void {
        _mainMenuElement.classList.add('formmenu-hidden');
        localSetItem('formmenu-hidden', "1");
    }

    function showMenu(): void {
        _mainMenuElement.classList.remove('formmenu-hidden');
        localRemoveItem('formmenu-hidden');
    }

    function onMenuHideButtonClicked(e: MouseEvent): void {
        e.preventDefault();
        e.stopPropagation();
        hideMenu();
    }

    function onMenuShowButtonClicked(e: MouseEvent): void {
        e.preventDefault();
        e.stopPropagation();
        showMenu();
    }

    function onExpandAllMenuClicked(e: MouseEvent): void {
        let count = _menuElementInfos.length;
        for (let i = 0; i < count; i++) {
            let menuElementInfo = _menuElementInfos[i];
            menuElementInfo.isExpanded = true;
        }

        rebuildMenuList(false);
    }

    function onCollapseAllMenuClicked(e: MouseEvent): void {
        let count = _menuElementInfos.length;
        for (let i = 0; i < count; i++) {
            let menuElementInfo = _menuElementInfos[i];
            let defaultOpen: boolean = openByDefault(menuElementInfo, "collapseOpenAtLevel");

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

    function onPreviousSection(e: MouseEvent): void {
        // If the currently focused element is not already a header,
        // first find the header above the currently focused element. This is the "current" header.

        let itemIndex = lastFocusedItemIndex();
        if (itemIndex == null) { itemIndex = 0; }

        let indexCurrentHeader = itemIndex;
        if (!elementIsHeaderByIndex(itemIndex)) {
            indexCurrentHeader = findPreviousNextItem(itemIndex, -1, elementIsHeaderByIndex);
        }

        if (indexCurrentHeader == null) { return; }

        // Some sections may not have input elements at all, so first find an input element above the current header, then
        // find its header, then find the first input element below that header.

        // Find the first input element above the current header.
        let indexInputBeforeCurrentHeader = findPreviousNextItem(indexCurrentHeader, -1, elementIsInputByIndex);
        if (indexInputBeforeCurrentHeader == null) { return; }

        // Find the header before the first found input element
        let indexPreviousHeader = findPreviousNextItem(indexInputBeforeCurrentHeader, -1, elementIsHeaderByIndex);
        if (indexPreviousHeader == null) { return; }

        // Find the first input box after the previous header and give that the focus
        focusPreviousNextItemFromIndex(indexPreviousHeader, 1, elementIsInputByIndex);
    }

    function onNextSection(e: MouseEvent): void {

        let itemIndex = lastFocusedItemIndex();
        if (itemIndex == null) { itemIndex = 0; }

        // Find header after the dom element with the focus

        let indexNextHeader = itemIndex;
        if (!elementIsHeaderByIndex(itemIndex)) {
            indexNextHeader = findPreviousNextItem(itemIndex, 1, elementIsHeaderByIndex);
        }

        // Find the first input box after the next header and give that the focus

        focusPreviousNextItemFromIndex(indexNextHeader, 1, elementIsInputByIndex);
    }

    // Add a filter button to the filter bar (the bit of space left of the filter).
    // cssClassConfigName - name of config item holding css class of the button.
    // onClickHandler - runs when button is clicked.
    // parent - filter button will be added to this element.
    //
    function addFilterButton(cssClassConfigName: string, onClickHandler: (e: MouseEvent) => void,
        titleConfigName: string, parent: HTMLElement) {

        let cssClass;
        if (cssClassConfigName) {
            cssClass = getConfigValue(cssClassConfigName);
        }

        let title;
        if (titleConfigName) {
            title = getConfigValue(titleConfigName);
        }

        let filterButton: HTMLElement = createFilterButton(cssClass, title, onClickHandler);
        parent.appendChild(filterButton);
    }

    function createFilterButton(cssClass: string, title: string, onClickHandler: (e: MouseEvent) => void): HTMLButtonElement {
        let filterButton: HTMLButtonElement = document.createElement("button");
        filterButton.type = "button";

        setClass(filterButton, cssClass);
        filterButton.classList.add('formmenu-filter-button');

        if (title) {
            filterButton.title = title;
        }

        filterButton.onclick = onClickHandler;

        return filterButton;
    }

    function createMainMenuElement(): HTMLElement {
        let menuElement: HTMLElement = document.createElement("div");
        menuElement.classList.add('formmenu');
        menuElement.id = 'formmenu';

        return menuElement;
    }

    function addMenuBody(_mainMenuElement: HTMLElement, menuElementInfos: MenuElementInfo[]): void {

        _mainMenuElement.appendChild(verticalResizeDiv());
        _mainMenuElement.appendChild(horizontalResizeDiv('formmenu-left-horizontal-resizer', 1));
        _mainMenuElement.appendChild(horizontalResizeDiv('formmenu-right-horizontal-resizer', -1));

        let openButtonBar: HTMLElement = document.createElement("div");
        openButtonBar.classList.add('formmenu-open-button-bar');

        addFilterButton('classMenuShowButton', onMenuShowButtonClicked,
            "titleMenuShowButton", openButtonBar);

        _mainMenuElement.appendChild(openButtonBar);

        let filterBar: HTMLElement = document.createElement("div");
        filterBar.classList.add('formmenu-filter-bar');

        addFilterButton('classMenuHideButton', onMenuHideButtonClicked,
            "titleMenuHideButton", filterBar);

        addFilterButton('classExpandAllMenuButton', onExpandAllMenuClicked,
            'titleExpandAllMenuButton', filterBar);

        addFilterButton('classCollapseAllMenuButton', onCollapseAllMenuClicked,
            'titleCollapseAllMenuButton', filterBar);

        addFilterButton('classPreviousHeadingBox', onPreviousSection,
            'titlePreviousHeadingBox', filterBar);

        addFilterButton('classNextHeadingBox', onNextSection,
            'titleNextHeadingBox', filterBar);

        // Create the buttons area very early on, in case processing of the item state infos
        // or the rebuilding of the menu itself
        // has a dependency on the buttons.
        const buttonsArea: HTMLDivElement = createButtonsArea();

        processAllItemStateInfos(filterBar, menuElementInfos);

        let filterInput = createFilterInput();
        filterBar.appendChild(filterInput);

        _mainMenuElement.appendChild(filterBar);

        _mainUlElement = document.createElement("ul");
        _mainMenuElement.appendChild(_mainUlElement);

        // Create buttons area
        _mainMenuElement.appendChild(buttonsArea);

        rebuildMenuList(false);
    }

    function visitAllItemStateInfos(callback: (itemStateInfo: iItemStateInfo) => void): void {
        visitKeyedConfigItems<iItemStateInfo>("itemStateInfos", callback);
    }

    function visitAllMenuButtonInfos(callback: (menuButtonInfo: iMenuButton) => void): void {
        visitKeyedConfigItems<iMenuButton>("menuButtons", callback);
    }

    function visitKeyedConfigItems<T>(configValueName: string, callback: (configItem: T) => void): void {
        let configItems: { [key: string]: T } = getConfigValue(configValueName);
        let keys = Object.keys(configItems);

        let count = keys.length;
        for (let i = 0; i < count; i++) {
            let key = keys[i];
            callback(configItems[key]);
        }
    }

    // Creates a button area div. Visits all menu button infos
    // and adds the button to the button area div. Returns the button area div.
    function createButtonsArea(): HTMLDivElement {

        let buttonArea: HTMLDivElement = document.createElement("div");
        buttonArea.classList.add('formmenu-buttonarea');
        buttonArea.id = 'formmenu-buttonarea';

        visitAllMenuButtonInfos((menuButtonInfo: iMenuButton) => {

            if (menuButtonInfo.cssSelector) {
                let allButtonElements = document.querySelectorAll(menuButtonInfo.cssSelector);

                for (let i = 0; i < allButtonElements.length; i++) {
                    let currentButtonElement = allButtonElements[i] as HTMLButtonElement;
                    let caption = currentButtonElement.innerHTML;
                    let onClick = () => { currentButtonElement.click(); };
                    let cssClass = currentButtonElement.className;

                    createButton(buttonArea, menuButtonInfo, caption, onClick, cssClass, currentButtonElement);
                }
            } else {
                createButton(buttonArea, menuButtonInfo);
            }
        })

        return buttonArea;
    }

    function buttonIntersectionHandler(entries: IntersectionObserverEntry[], observer: IntersectionObserver) {
        const nbrEntries = entries.length;

        for (let i = 0; i < nbrEntries; i++) {
            const buttonElementInfo: ButtonElementInfo = buttonElementInfoByDomButton(entries[i].target as HTMLButtonElement);
            buttonElementInfo.isVisible = entries[i].isIntersecting;
        }

        let allButtonsVisible = true;
        for (let i = 0; i < _buttonElementInfos.length; i++) {
            if (!_buttonElementInfos[i].isVisible) {
                allButtonsVisible = false;
                break;
            }
        }

        setClass(_mainMenuElement, "formmenu-all-buttons-visible", allButtonsVisible);
    }

    function createButton(buttonArea: HTMLDivElement, menuButtonInfo: iMenuButton,
        caption?: string, onClick?: () => void, cssClass?: string, domButton?: HTMLButtonElement) {

        let button: HTMLButtonElement = document.createElement("button");

        button.type = "button";
        button.innerHTML = menuButtonInfo.caption || caption;
        button.onclick = menuButtonInfo.onClick || onClick;
        setClass(button, menuButtonInfo.cssClass || cssClass);

        const currentDomButton = menuButtonInfo.domButton || domButton;

        let generateButton = true;

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
    function horizontalResizeDiv(cssClass: string, direction: number): HTMLDivElement {
        let resizeDiv: HTMLDivElement = document.createElement("div");
        resizeDiv.classList.add(cssClass);
        resizeDiv.innerHTML = "&nbsp;";

        resizeDiv.addEventListener('mousedown', function (e) {
            e.preventDefault();

            const boundingRect = _mainMenuElement.getBoundingClientRect();
            const preMoveWidth = boundingRect.right - boundingRect.left;
            const preMoveMouseX = e.pageX;

            const resizeMenuHorizontally = (e) => {

                let newWidth = preMoveWidth - ((e.pageX - preMoveMouseX) * direction);

                storeWidth(newWidth);

                const minimumMenuWidth: number = getConfigValue('minimumMenuWidth');

                if (newWidth < minimumMenuWidth) {
                    window.removeEventListener('mousemove', resizeMenuHorizontally);
                    hideMenu();
                    return;
                }

                _mainMenuElement.style.width = newWidth + "px";
            };

            window.addEventListener('mousemove', resizeMenuHorizontally);

            window.addEventListener('mouseup', () => {
                window.removeEventListener('mousemove', resizeMenuHorizontally);
            });
        });

        return resizeDiv;
    }

    function verticalResizeDiv(): HTMLDivElement {
        let resizeDiv: HTMLDivElement = document.createElement("div");
        resizeDiv.classList.add('formmenu-vertical-resizer');
        resizeDiv.innerHTML = "&nbsp;";

        resizeDiv.addEventListener('mousedown', function (e) {
            e.preventDefault();

            const boundingRect = _mainMenuElement.getBoundingClientRect();
            const preMoveHeight = boundingRect.bottom - boundingRect.top;
            const preMoveMouseY = e.pageY;

            const resizeMenuVertically = (e) => {

                let newHeight = preMoveHeight + (e.pageY - preMoveMouseY);

                storeHeight(newHeight);

                const minimumMenuHeigth: number = getConfigValue('minimumMenuHeigth');

                if (newHeight < minimumMenuHeigth) {
                    window.removeEventListener('mousemove', resizeMenuVertically);
                    hideMenu();
                    return;
                }

                _mainMenuElement.style.height = newHeight + "px";
            };

            window.addEventListener('mousemove', resizeMenuVertically);

            window.addEventListener('mouseup', () => {
                window.removeEventListener('mousemove', resizeMenuVertically);
            });
        });

        return resizeDiv;
    }

    // Visits all item state infos, processes the menu element infos for each
    // and adds a filter button for each to the passed in filter bar. 
    function processAllItemStateInfos(filterBar: HTMLElement, menuElementInfos: MenuElementInfo[]): void {
        visitAllItemStateInfos((itemStateInfo: iItemStateInfo) => {
            processItemStateInfo(itemStateInfo, filterBar, menuElementInfos);
        });
    }

    // Returns true if the given item state is active
    function getItemStateStatus(itemStateInfo: iItemStateInfo): boolean {
        const idx: number = _itemStateInfoActiveFilters.indexOf(itemStateInfo);
        return (idx !== -1);
    }

    // Sets the state of the given item state filter.
    // active - true to set active (so menu items are filtered), false to set inactive
    // filterButton - filter button associated with the item state
    function setItemStateStatus(active: boolean, itemStateInfo: iItemStateInfo, filterButton: HTMLElement): void {
        setClass(_mainMenuElement, itemStateInfo.stateFilterActiveClass, active);
        setClass(filterButton, 'formmenu-filter-button-depressed', active);

        // Update _itemStateInfoActiveFilters array

        let idx: number = _itemStateInfoActiveFilters.indexOf(itemStateInfo);

        if (idx != -1) {
            _itemStateInfoActiveFilters.splice(idx, 1);
        }

        if (active) {
            _itemStateInfoActiveFilters.push(itemStateInfo);
        }
    }

    function onItemStateFilterButtonClicked(e: MouseEvent, itemStateInfo: iItemStateInfo): void {
        e.preventDefault();
        e.stopPropagation();

        let clickedElement: HTMLElement = (<any>(e.currentTarget));

        const itemStateActive: boolean = getItemStateStatus(itemStateInfo);
        setItemStateStatus(!itemStateActive, itemStateInfo, clickedElement);

        rebuildMenuList(false);
    }

    // Called when the item state of a menu item is updated
    function setItemStateActive(active: boolean, itemStateInfo: iItemStateInfo, filterButton: HTMLButtonElement,
        nextButton: HTMLButtonElement, previousButton: HTMLButtonElement,
        menuElementInfo: MenuElementInfo): void {

        let itemStates = menuElementInfo.itemStates;
        let idx: number = itemStates.indexOf(itemStateInfo);

        if (idx != -1) {
            itemStates.splice(idx, 1);
        }

        if (active) {
            itemStates.push(itemStateInfo);
        }

        // Update the menu element
        setClass(menuElementInfo.menuElement, itemStateInfo.hasActiveStateClass, active);

        // Update filter button style

        let existsActiveItem = active;
        if (!existsActiveItem) {

            let count = _menuElementInfos.length;
            for (let i = 0; i < count; i++) {
                let menuElementInfo = _menuElementInfos[i];
                if (menuElementInfo.itemStates.indexOf(itemStateInfo) != -1) {
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

    // Starting at the item that has the focus, searches for the previous or next item of interest
    // and returns the index of that item. If not item of interest is found, returns null
    //
    // increment - 1 to go forward, -1 to go backward. Will wrap.
    // itemFoundMethod - takes an index into the _menuElementInfos. Returns true if that item is the item of interest.
    function findPreviousNextItem(itemIndex: number, increment: number, itemFoundMethod: (itemIndex: number) => boolean): number {
        if (itemIndex == null) { itemIndex = -1; }

        const nbrElementInfos = _menuElementInfos.length;
        let nbrItemsVisited = 0;

        do {
            itemIndex += increment;
            if (itemIndex < 0) {
                itemIndex = nbrElementInfos - 1;
            } else if (itemIndex >= nbrElementInfos) {
                itemIndex = 0;
            }

            if (nbrItemsVisited >= nbrElementInfos) { return null; }

            // Skip items that are not displayed (display: none)
            if (!elementIsDisplayed(_menuElementInfos[itemIndex].domElement)) { continue; }

            if (itemFoundMethod(itemIndex)) {
                return itemIndex;
            }

            nbrItemsVisited++;
        } while (true);
    }

    // Starting at the item that has the focus, searches for the previous or next item of interest
    // and sets the focus on that item. If not item of interest is found, does nothing.
    //
    // increment - 1 to go forward, -1 to go backward. Will wrap.
    // itemFoundMethod - takes an index into the _menuElementInfos. Returns true if that item is the item of interest.
    function focusPreviousNextItem(increment: number, itemFoundMethod: (itemIndex: number) => boolean): void {
        let itemIndex = lastFocusedItemIndex();
        focusPreviousNextItemFromIndex(itemIndex, increment, itemFoundMethod);
    }

    function focusPreviousNextItemFromIndex(itemIndex: number, increment: number, itemFoundMethod: (itemIndex: number) => boolean): void {
        let foundIndex = findPreviousNextItem(itemIndex, increment, itemFoundMethod);

        if (foundIndex != null) {
            setFocused(_menuElementInfos[foundIndex]);
        }
    }

    function onItemStatePreviousNextButtonClicked(itemStateInfo: iItemStateInfo, increment: number): void {
        focusPreviousNextItem(increment, function (itemIndex: number) { return (_menuElementInfos[itemIndex].itemStates.indexOf(itemStateInfo) != -1); })
    }

    function processItemStateInfo(itemStateInfo: iItemStateInfo, filterBar: HTMLElement,
        menuElementInfos: MenuElementInfo[]): void {

        let filterButton: HTMLButtonElement = createFilterButton(
            itemStateInfo.stateFilterButtonClass, itemStateInfo.buttonTitle, (e: MouseEvent) => { onItemStateFilterButtonClicked(e, itemStateInfo); });
        filterButton.disabled = true;
        filterBar.appendChild(filterButton);

        let previousButton: HTMLButtonElement = createFilterButton(
            itemStateInfo.statePreviousButtonClass, itemStateInfo.buttonTitlePrevious, (e: MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                onItemStatePreviousNextButtonClicked(itemStateInfo, -1);
            });
        previousButton.disabled = true;
        filterBar.appendChild(previousButton);

        let nextButton: HTMLButtonElement = createFilterButton(
            itemStateInfo.stateNextButtonClass, itemStateInfo.buttonTitleNext, (e: MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                onItemStatePreviousNextButtonClicked(itemStateInfo, 1);
            });
        nextButton.disabled = true;
        filterBar.appendChild(nextButton);

        let count = menuElementInfos.length;
        for (let i = 0; i < count; i++) {
            let menuElementInfo = _menuElementInfos[i];
            itemStateInfo.wireUp(menuElementInfo.domElement,
                (active: boolean) => setItemStateActive(active, itemStateInfo, filterButton, nextButton, previousButton, menuElementInfo));
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
    function elementIsVisible(element: HTMLElement): { isVisible: boolean, isShown: boolean, top: number } {
        const boundingRectangle = element.getBoundingClientRect();

        const isVisible = (
            (boundingRectangle.top >= 0) &&
            (boundingRectangle.left >= 0) &&
            (boundingRectangle.bottom <= (window.innerHeight || document.documentElement.clientHeight)) &&
            (boundingRectangle.right <= (window.innerWidth || document.documentElement.clientWidth))
        );

        // If the element is not shown (display none, etc), top, left, bottom, right will all be 0.
        const isShown: boolean = !!(boundingRectangle.top || boundingRectangle.left || boundingRectangle.bottom || boundingRectangle.right);

        return { isVisible: isVisible, isShown: isShown, top: boundingRectangle.top };
    }

    // Returns true if the element is not hidden via display:none, visibility:hidden, etc. 
    // Does not look at whether the element is visible in the viewport.
    function elementIsDisplayed(element: HTMLElement): boolean {

        if (!(element.offsetWidth || element.offsetHeight || element.getClientRects().length)) { return false; }

        const style = getComputedStyle(element);
        return (!((style.display === 'none') || (style.visibility !== 'visible')));
    }

    // Sets a class on this menu item
    function setClassOnMenuItem(menuElement: MenuElementInfo, classThisItem: string): void {
        menuElement.menuElement.classList.add(classThisItem);
    }

    // Sets the formmenu-is-visible of an item.
    // Note that this doesn't reset the formmenu-is-visible etc. classes of items that are not visible.
    function setVisibility(menuElement: MenuElementInfo, setIt: boolean = true): void {
        setClass(menuElement.menuElement, 'formmenu-is-visible', setIt);
    }

    function removeVisibilityForMenu(): void {
        let count = _menuElementInfos.length;
        for (let i = 0; i < count; i++) {
            _menuElementInfos[i].menuElement.classList.remove('formmenu-is-visible');
        }
    }

    // Returns true if the menuElementInfo has passed any filters, and it is not hidden
    // because any of its parents is closed.
    // Even if this returns true, the element could still be invisible because scrolled out of the
    // visible area of the menu.
    function elementIsShownInMenu(menuElementInfo: MenuElementInfo): boolean {
        if (!menuElementInfo.isIncludedInMenu) { return false; }

        for (let e = menuElementInfo.parent; e && (e !== _menuElementInfosRoot); e = e.parent) {
            if (!e.isExpanded) { return false; }
        }

        return true;
    }

    function elementIsHeader(menuElementInfo: MenuElementInfo): boolean {
        return (menuElementInfo.level < _levelNonHeadingMenuItem);
    }

    function elementIsHeaderByIndex(itemIndex: number): boolean {
        return (elementIsHeader(_menuElementInfos[itemIndex]));
    }

    function elementIsInputByIndex(itemIndex: number): boolean {
        let inputElement = getInputElement(_menuElementInfos[itemIndex].domElement);
        return (inputElement != null);
    }

    // Returns true if the given menu item is visible inside the menu box.
    // Assumes the entire menu box is in a fixed location on the page and is entirely visible.
    function menuItemIsVisible(menuElementInfo: MenuElementInfo): boolean {
        const menuItemSpan = getCaptionElement(menuElementInfo);
        const availableXSpace = _mainUlElement.clientHeight - menuItemSpan.clientHeight;
        const isVisible =
            (menuElementInfo.menuElement.offsetTop >= _mainUlElement.scrollTop) &&
            (menuElementInfo.menuElement.offsetTop <= (_mainUlElement.scrollTop + availableXSpace));

        return isVisible;
    }

    function setMenuScrollTopIfNotDomScrolling(offsetTop: number) {
        // Do not scroll the menu while a DOM element is being scrolled into view.
        // When that happens, this method will be called for every DOM element that become visible durin this scroll.
        // If you try to scroll the menu while the DOM elements are being scrolled, the browser gets very confused
        // and the DOM scroll doesn't complete.
        //
        // At the end of the scroll, the scroll handler will call setVisibilityForMenu anyway, which will fix up the
        // scroll of the menu.

        if (_domScrolling) { return; }
        _mainUlElement.scrollTop = offsetTop;
    }

    // If given menu item is not visible inside the menu, scrolls the menu so the item
    // shows at the top.
    function menuItemMakeVisibleAtTop(menuElementInfo: MenuElementInfo): void {
        if (!menuItemIsVisible(menuElementInfo)) {
            setMenuScrollTopIfNotDomScrolling(menuElementInfo.menuElement.offsetTop);
        }
    }

    // If given menu item is not visible inside the menu, scrolls the menu so the item
    // shows at the bottom.
    function menuItemMakeVisibleAtBottom(menuElementInfo: MenuElementInfo): void {
        if (!menuItemIsVisible(menuElementInfo)) {
            const menuItemSpan = getCaptionElement(menuElementInfo);
            const availableXSpace = _mainUlElement.clientHeight - menuItemSpan.clientHeight;

            let newOffsetTop = menuElementInfo.menuElement.offsetTop - availableXSpace;
            if (newOffsetTop < 0) { newOffsetTop = 0; }
            setMenuScrollTopIfNotDomScrolling(newOffsetTop);
        }
    }

    function setVisibilityForMenuDirect(): void {
        if (!_menuElementInfos) { return; }

        removeVisibilityForMenu();
        let count = _menuElementInfos.length;
        let lastWasVisible = false;

        // The element that is 1) above the screen; 2) closest to the screen of all elements above the screen;
        // 3) visible inside the menu (not hidden because a parent is closed).
        let invisibleMenuHeaderAboveVisibleArea: MenuElementInfo;

        // Distance to top of screen of invisibleMenuElementAboveVisibleArea.
        // This is negative. The closer to zero, the closer to the top.
        let closestDistanceToTop: number = Number.NEGATIVE_INFINITY;

        let firstVisibleElement: MenuElementInfo;
        let lastVisibleElement: MenuElementInfo;

        for (let i = 0; i < count; i++) {
            let currentMenuElementInfo = _menuElementInfos[i];
            let visibilityResult = elementIsVisible(currentMenuElementInfo.domElement);

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
                if (lastWasVisible && !visibilityResult.isVisible) { break; }
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
        } else {
            menuItemMakeVisibleAtTop(firstVisibleElement);
        }

        return;
    }

    // Returns index of the current filter in the caption of the given menu item.
    // Assumes the search filter is active.
    // If there is no match, returns -1.
    function matchesSearchFilter(menuElementInfo: MenuElementInfo): number {
        const filterValueLc = _searchTerm.toLowerCase();
        const foundIndex = menuElementInfo.caption.toLowerCase().indexOf(filterValueLc);
        return foundIndex;
    }

    // Finds out if the menu element in the menuElementInfo passes the search filter.
    // If so, updates the caption to highlight the matched bit and returns true.
    // Otherwise returns false.
    function passesSearchFilter(menuElementInfo: MenuElementInfo): boolean {
        const captionElement = getCaptionElement(menuElementInfo);

        // Restore the caption to its original state
        captionElement.innerHTML = menuElementInfo.caption;
        menuElementInfo.menuElement.classList.remove('formmenu-is-textmatch');

        if (!searchFilterIsActive()) {
            return true;
        }

        const foundIndex = matchesSearchFilter(menuElementInfo);
        if (foundIndex === -1) {
            return false;
        }

        const captionWithFilterTextSpan = insertMatchingFilterTextSpan(
            menuElementInfo.caption, foundIndex, _searchTerm.length);
        captionElement.innerHTML = captionWithFilterTextSpan;

        menuElementInfo.menuElement.classList.add('formmenu-is-textmatch');

        return true;
    }

    function passesItemStateFilters(menuElementInfo: MenuElementInfo): boolean {

        for (let i = 0; i < _itemStateInfoActiveFilters.length; i++) {
            if (menuElementInfo.itemStates.indexOf(_itemStateInfoActiveFilters[i]) === -1) {
                return false;
            }
        }

        return true;
    }

    function getMenuElementsUl(menuElementInfo: MenuElementInfo): HTMLUListElement {
        let ulElement: HTMLUListElement = document.createElement("ul");
        ulElement.classList.add('formmenu-top-menuitems');

        for (let i = 0; i < menuElementInfo.children.length; i++) {
            const childMenuElement = menuElementInfo.children[i];
            childMenuElement.isIncludedInMenu = false;

            const liElement = getMenuElementLi(childMenuElement);

            if (liElement) {
                ulElement.appendChild(liElement);
                childMenuElement.isIncludedInMenu = true;
            }
        }

        return ulElement;
    }

    // Gets the li element representing a menu element from the corresponding menuElementInfo.
    // Returns falsy if the menu element should not be shown (because it doesn't pass a filter).
    function getMenuElementLi(menuElementInfo: MenuElementInfo): HTMLElement {
        const ulElement: HTMLUListElement = getMenuElementsUl(menuElementInfo);
        let hasChildren = (ulElement.children.length > 0) || menuElementInfo.forceExpandable;

        setClass(menuElementInfo.menuElement, 'formmenu-has-children', hasChildren);

        if ((!passesSearchFilter(menuElementInfo)) && (!hasChildren)) { return null; }
        if ((!passesItemStateFilters(menuElementInfo)) && (!hasChildren)) { return null; }
        if ((!elementIsDisplayed(menuElementInfo.domElement)) && (!hasChildren)) { return null; }

        let liElement: HTMLLIElement = document.createElement("li");
        liElement.appendChild(menuElementInfo.menuElement);

        if (hasChildren) {
            liElement.appendChild(ulElement);

            setClass(menuElementInfo.menuElement, "formmenu-item-open", menuElementInfo.isExpanded)
        }

        return liElement;
    }

    // Debounces calls to a method.
    // timerId - store this between calls. Will be updated by the method. Initialise to a { id: 0 }
    // bounceMs - the method will not be called more often than once every bounceMs milliseconds.
    // callback - method to be called.
    function debounce(timerId: { id: number }, bounceMs: number, callback: () => void) {
        if (timerId.id) { clearTimeout(timerId.id); }
        timerId.id = setTimeout(callback, bounceMs);
    }

    let rebuildMenuDebounceTimer = {
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
    function rebuildMenuList(keepScroll: boolean): void {

        rebuildMenuDebounceTimer.keepScroll = (rebuildMenuDebounceTimer.keepScroll && keepScroll);
        rebuildMenuDebounceTimer.rebuildMenuList = true;
        scheduleDebouncedAction();
    }

    function setVisibilityForMenu(): void {
        scheduleDebouncedAction();
    }

    function scheduleDebouncedAction() {
        debounce(rebuildMenuDebounceTimer, 50, function () {
            let keepScroll = rebuildMenuDebounceTimer.keepScroll;
            rebuildMenuDebounceTimer.keepScroll = true;

            let rebuildMenuList = rebuildMenuDebounceTimer.rebuildMenuList;
            rebuildMenuDebounceTimer.rebuildMenuList = false;

            if (rebuildMenuList) {
                let scrollBuffer: number = _mainUlElement.scrollTop;

                const ulElement = getMenuElementsUl(_menuElementInfosRoot);

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
            } else {
                setVisibilityForMenuDirect();
                setScrolledToMenuHeightClass();
            }
        });
    }

    function handleSingleIntersection(entry: IntersectionObserverEntry) {

        if (entry.isIntersecting) {
            // Entry is now intersecting. If currently it is not in the menu, rebuild the menu.
            // Otherwise highlight the associated menu item.
            const menuElementInfo = menuElementInfoByDomElement(entry.target as HTMLElement);
            if (menuElementInfo) {
                if (menuElementInfo.isIncludedInMenu) {

                    if (_scrollingDown) {
                        menuItemMakeVisibleAtBottom(menuElementInfo);
                    } else {
                        menuItemMakeVisibleAtTop(menuElementInfo);
                    }
                    setVisibility(menuElementInfo);

                } else {
                    rebuildMenuList(true);
                }
            }

            return;
        }

        // Entry is not intersecting anymore. If this is because it is no longer displayed (display none),
        // then rebuild the menu. Otherwise remove the highlighted class.

        if (elementIsDisplayed(entry.target as HTMLElement)) {
            const menuElementInfo = menuElementInfoByDomElement(entry.target as HTMLElement);
            setVisibility(menuElementInfo, false);
        } else {
            rebuildMenuList(true);
        }
    }

    function intersectionHandler(entries: IntersectionObserverEntry[], observer: IntersectionObserver) {
        const nbrEntries = entries.length;

        for (let i = 0; i < nbrEntries; i++) {
            handleSingleIntersection(entries[i]);
        }
    }

    function loadDomElements(domElements: DomElementInfo[]): void {
        _menuElementInfosRoot = new MenuElementInfo(null, null, 0, null);
        _menuElementInfos = domElementsToMenuElements(domElements);

        let skipFirstHeading: boolean = getConfigValue("skipFirstHeading");
        let firstIndex = skipFirstHeading ? 1 : 0;
        setParents(_menuElementInfosRoot, { value: firstIndex }, _menuElementInfos);
    }

    function clickedElementHandler(): void {

        // Some other JavaScript may still be running and adding/removing stuff from the DOM.
        // So delay running a bit.

        setTimeout(function () {

            // Reload the menu items from the DOM. The application may have added elements to the DOM
            // dynamically (such as React applications).
            let allDomElements = getAllDomElements();
            loadDomElements(allDomElements);

            rebuildMenuList(true);
        }, 50);
    }

    // Raises an event against the main div, as referred to in _mainMenuElement.
    // Before calling this:
    // 1) _mainMenuElement must have been set to refer to the top level div;
    // 2) the top level div must have been added to the DOM.
    function raiseEvent(eventName: string, eventSubName?: string, details?: any) {
        let fullName = "formmenu-" + eventName;
        if (eventSubName) { fullName += "-" + eventSubName; }

        let event = new CustomEvent(fullName, {
            bubbles: true,
            detail: details
        });

        _mainMenuElement.dispatchEvent(event);
    }

    export function scrollHandler(): void {

        let currentYOffset = window.pageYOffset;
        _scrollingDown = (currentYOffset > _lastPageYOffset);
        _lastPageYOffset = (currentYOffset < 0) ? 0 : currentYOffset;

        setVisibilityForMenu();
    }

    export function resizeHandler(): void {
        setVisibilityForMenu();
        ensureMenuBottomVisible();
    }

    export function pageLoadedHandler(): void {

        // CustomEvent polyfill for IE. See https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent
        if (typeof window.CustomEvent !== "function") {
            function CustomEvent(event, params) {
                params = params || { bubbles: false, cancelable: false, detail: null };
                var evt = document.createEvent('CustomEvent');
                evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
                return evt;
            }

            (<any>window).CustomEvent = CustomEvent;
        }

        _lastPageYOffset = window.pageYOffset;

        let allDomElements = getAllDomElements();

        let hideForSmallForms = getConfigValue('hideForSmallForms') as boolean;
        if (hideForSmallForms) {
            if (allDomElementsVisible(allDomElements)) {

                // If all DOM elements (that is, fields in the form) are visible now, then this is a small form
                // and we won't add the menu to the DOM.
                return;
            }
        }

        // Set _mainMenuElement early, because it will be used if setActive is called (part of itemStateInfo).
        // setActive may be called while the menu is being created.
        _mainMenuElement = createMainMenuElement();

        // Add main menu element (the top level div) to the DOM before firing any events.
        // If you don't, the event will not make it to any listeners.
        let bodyElement = document.getElementsByTagName("BODY")[0];
        bodyElement.appendChild(_mainMenuElement);

        raiseEvent("loading");

        loadDomElements(allDomElements);

        if (localGetItem('formmenu-hidden')) {
            _mainMenuElement.classList.add('formmenu-hidden');
        }

        if (runningIE()) {
            _mainMenuElement.classList.add('formmenu-ie');
        }

        addMenuBody(_mainMenuElement, _menuElementInfos);

        setDimensionsFromLocalStorage();

        storeMenuBottom();

        _mainMenuElementHeight = getMainMenuElementHeight();

        // IE11 does not support IntersectionObserver
        if (!!window.IntersectionObserver) {
            _intersectionObserver = new IntersectionObserver(intersectionHandler, { threshold: 1.0 });

            for (let i = 0; i < _menuElementInfos.length; i++) {
                _intersectionObserver.observe(_menuElementInfos[i].domElement);
            }

            // Threshold 0 means invoke the handler if even one pixel becomes visible
            _buttonsIntersectionObserver = new IntersectionObserver(buttonIntersectionHandler, { threshold: 0 });

            for (let i = 0; i < _buttonElementInfos.length; i++) {
                _buttonsIntersectionObserver.observe(_buttonElementInfos[i].domButton);
            }
        }

        const rebuildOnClickedSelector: string = getConfigValue("rebuildOnClickedSelector");
        if (rebuildOnClickedSelector) {
            const rebuildOnClickedElements = document.querySelectorAll(rebuildOnClickedSelector);

            for (let i = 0; i < rebuildOnClickedElements.length; i++) {
                rebuildOnClickedElements[i].addEventListener("click", function () {
                    clickedElementHandler();
                });
            }
        }

        document.addEventListener('scroll', function (e: Event) {
            // IE will fire the scroll event if anything inside the document (such as the menu) is scrolled,
            // not only when the document itself is scrolled. So only take action if the target of the event is the document.

            if (e.target !== document) { return; }
            FormMenu.scrollHandler();
        }, {
            passive: true
        });

        // The resize event only gets triggered on the window object, and doesn't bubble.
        // See https://developer.mozilla.org/en-US/docs/Web/API/Window/resize_event
        window.addEventListener("resize", function () {
            FormMenu.resizeHandler();
        });

        raiseEvent("loaded");
    }
}
