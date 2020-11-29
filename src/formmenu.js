///<reference path="formmenu.d.ts" />
// "DOMContentLoaded" fires when the html has loaded, even if the stylesheets, javascript, etc are still being loaded.
// "load" fires when the entire page has loaded, including stylesheets, etc.
document.addEventListener("DOMContentLoaded", function () {
    FormMenu.pageLoadedHandler();
});
document.addEventListener('scroll', function () {
    FormMenu.scrollHandler();
}, {
    passive: true
});
// The resize event only gets triggered on the window object, and doesn't bubble.
// See https://developer.mozilla.org/en-US/docs/Web/API/Window/resize_event
window.addEventListener("resize", function () {
    FormMenu.resizeHandler();
});
var FormMenu;
(function (FormMenu) {
    var _levelNonHeadingMenuItem = 9000;
    var defaultConfiguration = {
        skipFirstHeading: false,
        defaultOpenAtLevel: _levelNonHeadingMenuItem + 1,
        collapseOpenAtLevel: 1,
        minimumMenuWidth: 160,
        minimumMenuHeigth: 100,
        showFilterInput: true,
        filterPlaceholder: 'filter',
        filterMinimumCharacters: 2,
        showMenuHideShowButton: true,
        showExpandAllMenuButton: true,
        showCollapseAllMenuButton: true,
        classMenuShowButton: 'formmenu-menu-show',
        classMenuHideButton: 'formmenu-menu-hide',
        classExpandAllMenuButton: 'formmenu-expand-all-menu-button',
        classCollapseAllMenuButton: 'formmenu-collapse-all-menu-button',
        // Note that HTML only has these heading tags. There is no h7, etc.
        querySelector: "h1,h2,h3,h4,h5,h6",
        tagNameToLevelMethod: tagNameToLevelDefaultMethod,
        itemStateInfos: {},
        menuButtons: {}
    };
    // Create empty formMenuConfiguration here, to make it easier to write
    // ...formmenu.config.js files that set properties on this object.
    //
    // Do not use let here, because that doesn't allow you to declare a variable 
    // multiple times.
    FormMenu.formMenuConfiguration = {};
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
            // true if the menuElement (the dom menu item) is included in the menu. That is, if any filters are active,
            // it passed those filters. 
            // Note that the menu item could be still not visible to the user even if this is true, because its parent was closed,
            // because it is scrolled out of the menu div visible area.
            this.isIncludedInMenu = false;
            // Contains all item state infos that are active for this element
            this.itemStates = [];
        }
        return MenuElementInfo;
    }());
    var _menuElementInfos;
    // Acts as the parent of menu elements with the lowest level (typically the h1)
    // Use the children property of this element to easily generate the ul tag
    // containing the menu items.
    // Must have a level lower than 1.
    var _menuElementInfosRoot = new MenuElementInfo(null, null, 0);
    // The div that contains the entire menu
    var _mainMenuElement;
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
    function tagNameToLevel(tagName) {
        var tagNameToLevelMethod = getConfigValue("tagNameToLevelMethod");
        var level = tagNameToLevelMethod(tagName);
        return level;
    }
    function getConfigValue(itemName) {
        // formMenuConfiguration may have been created by loading .js file that defines that variable.
        // First try to get the value from there. Otherwise get it from the default config.
        // Note that you want to check against undefined specifically, because for example false
        // is a valid value.
        // Do not use "if (formMenuConfiguration)", because then you'll get a run time reference error
        // if the variable does not exist already.
        if (typeof FormMenu.formMenuConfiguration !== 'undefined') {
            if (typeof FormMenu.formMenuConfiguration[itemName] !== 'undefined') {
                return FormMenu.formMenuConfiguration[itemName];
            }
        }
        return defaultConfiguration[itemName];
    }
    // Returns all dom elements to be represented in the menu
    function getAllDomElements() {
        var querySelector = getConfigValue("querySelector");
        var allDomElements = document.querySelectorAll(querySelector);
        return allDomElements;
    }
    // Converts a list of heading tags to MenuElements.
    // Skips the first heading if config item skipFirstHeading is true.
    function domElementsToMenuElements(domElements) {
        var _menuElementInfos = [];
        var includeElement = !getConfigValue("skipFirstHeading");
        domElements.forEach(function (value) {
            if (includeElement) {
                _menuElementInfos.push(domElementToMenuElement(value));
            }
            includeElement = true;
        });
        return _menuElementInfos;
    }
    function domElementToMenuElement(domElement) {
        var menuElementClass = 'formmenu-' + domElement.tagName;
        var caption = domElement.innerText;
        // If a menu item gets clicked, scroll the associated dom element into view if it is not already
        // visible. If it is already visible, do not scroll it.
        //
        // Also give it the formmenu-highlighted-dom-item for a short time, to point out where
        // it is.
        var onClickHandler = function (e) {
            if (elementIsVisible(domElement) !== 0) {
                domElement.scrollIntoView();
            }
            // See https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Animations/Using_CSS_animations
            domElement.addEventListener("animationend", function () { domElement.classList.remove('formmenu-highlighted-dom-item'); }, false);
            domElement.classList.add('formmenu-highlighted-dom-item');
        };
        var level = tagNameToLevel(domElement.tagName);
        var menuElementInfo = new MenuElementInfo(domElement, caption, level);
        var menuElementDiv = createMenuElementDiv(menuElementInfo, menuElementClass, onClickHandler);
        menuElementInfo.menuElement = menuElementDiv;
        var defaultOpen = openByDefault(menuElementInfo, "defaultOpenAtLevel");
        menuElementInfo.isExpanded = defaultOpen;
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
        if (localStorage.getItem(key)) {
            localStorage.removeItem(key);
        }
        else {
            localStorage.setItem(key, "1");
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
        toggleClass(menuElementInfo.menuElement, 'formmenu-item-open');
        menuElementInfo.isExpanded = !menuElementInfo.isExpanded;
        ensureMenuBottomVisible();
    }
    function createMenuElementDiv(menuElementInfo, cssClass, onClickHandler) {
        var menuElement = document.createElement("div");
        var expandElement = document.createElement("a");
        expandElement.href = "#";
        expandElement.classList.add("formmenu-expand");
        expandElement.onclick = function (e) { return onExpandClicked(menuElementInfo); };
        menuElement.appendChild(expandElement);
        var captionElement = document.createElement("span");
        captionElement.classList.add("formmenu-caption");
        captionElement.innerHTML = menuElementInfo.caption;
        captionElement.onclick = onClickHandler;
        menuElement.appendChild(captionElement);
        setClass(menuElement, cssClass);
        menuElement.classList.add("formmenu-item");
        return menuElement;
    }
    // Gets the span with the caption from a MenuElementInfo
    function getCaptionElement(menuElementInfo) {
        var divElement = menuElementInfo.menuElement;
        var captionSpanElement = (divElement.children[1]);
        return captionSpanElement;
    }
    // Inserts span tags into a string. The start tag will be at startIndex and the end tag
    // spanLength characters later.
    // For example:
    // s: abcdefgi, startIndex: 2, spanLength: 3
    // Result:
    // ab<span class='formmenu-matching-filter-text'>cde</span>fgi
    function insertMatchingFilterTextSpan(s, startIndex, spanLength) {
        var part1 = s.substring(0, startIndex);
        var part2 = s.substring(startIndex, startIndex + spanLength);
        var part3 = s.substring(startIndex + spanLength);
        var result = part1 + "<span class='formmenu-matching-filter-text'>" + part2 + "</span>" + part3;
        return result;
    }
    function onChangeFilter(e) {
        _searchTerm = (e.currentTarget).value;
        setClass(_mainMenuElement, 'formmenu-textmatch-filter-is-active', searchFilterIsActive());
        rebuildMenuList();
    }
    function createFilterInput() {
        var menuElement = document.createElement("input");
        menuElement.type = "search";
        menuElement.className = 'formmenu-filter';
        var filterPlaceholder = getConfigValue("filterPlaceholder");
        if (filterPlaceholder) {
            menuElement.placeholder = filterPlaceholder;
        }
        // onChange only fires after you've clicked outside the input box.
        // onKeypress fires before the value has been updated, so you get the old value, not the latest value
        menuElement.onkeyup = onChangeFilter;
        // onfilter fires when the little clear icon is clicked
        menuElement.onsearch = onChangeFilter;
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
        localStorage.setItem('formmenu-width', width.toString());
        localStorage.setItem('formmenu-height', height.toString());
    }
    function storeWidth(width) {
        localStorage.setItem('formmenu-width', width.toString());
    }
    function storeHeight(height) {
        localStorage.setItem('formmenu-height', height.toString());
    }
    function getDimensions() {
        var result = {
            width: parseInt(localStorage.getItem('formmenu-width')),
            height: parseInt(localStorage.getItem('formmenu-height'))
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
    // If formmenu-bottom has not been set, figures out the distance between the bottom of the
    // menu and the bottom of the screen and stores that under formmenu-bottom.
    function storeMenuBottom() {
        if (localStorage.getItem("formmenu-bottom") !== null) {
            return;
        }
        var boundingRectangle = _mainMenuElement.getBoundingClientRect();
        var windowHeight = (window.innerHeight || document.documentElement.clientHeight);
        var formBottom = windowHeight - boundingRectangle.bottom;
        localStorage.setItem('formmenu-bottom', formBottom.toString());
    }
    // If the user resizes the windows, reducing it height, at some point the menu
    // will start extending below the bottom of the window. So its bottom is no longer
    // visible. Ensures this doesn't happen by removing
    // the height or max-height property; and
    // the bottom: auto property.
    // This allows the stylesheet to take over. If this sets top and bottom of the main menu
    // element, that will lead to both top and bottom of the menu being visible.
    function ensureMenuBottomVisible() {
        // If menu has never been resized, nothing that can be done here
        var storedHeightString = localStorage.getItem('formmenu-height');
        if (storedHeightString === null) {
            return;
        }
        // formBottom should always be there, seeing it is set when the component is loaded.
        var formBottom = parseInt(localStorage.getItem('formmenu-bottom'));
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
        _mainMenuElement.classList.add('formmenu-hidden');
        localStorage.setItem('formmenu-hidden', "1");
    }
    function onMenuHideShowButtonClicked(e) {
        toggleClass(_mainMenuElement, 'formmenu-hidden');
        toggleLocalStorage('formmenu-hidden');
    }
    function onExpandAllMenuClicked(e) {
        _menuElementInfos.forEach(function (menuElementInfo) {
            menuElementInfo.isExpanded = true;
        });
        rebuildMenuList();
    }
    function onCollapseAllMenuClicked(e) {
        _menuElementInfos.forEach(function (menuElementInfo) {
            var defaultOpen = openByDefault(menuElementInfo, "collapseOpenAtLevel");
            // Close the items above the "collapseOpenAtLevel" level
            // Leave alone those items that could be opened. That way, if the user has closed
            // more items than this method would close, clicking collapse won't lead to actually
            // items being opened.
            if (!defaultOpen) {
                menuElementInfo.isExpanded = false;
            }
        });
        rebuildMenuList();
    }
    // Add a filter button to the filter bar (the bit of space left of the filter).
    // cssClassConfigName - name of config item holding css class of the button.
    // onClickHandler - runs when button is clicked.
    // showHideConfigName - name of a config item. If blank, button is always created.
    //                      If not blank, config item has to be true for button to be created.
    // parent - filter button will be added to this element.
    //
    function addFilterButton(cssClassConfigName, onClickHandler, showHideConfigName, parent) {
        var showButton = true;
        if (showHideConfigName) {
            showButton = getConfigValue(showHideConfigName);
        }
        if (!showButton) {
            return;
        }
        var cssClass;
        if (cssClassConfigName) {
            cssClass = getConfigValue(cssClassConfigName);
        }
        var filterButton = createFilterButton(cssClass, onClickHandler);
        parent.appendChild(filterButton);
    }
    function createFilterButton(cssClass, onClickHandler) {
        var filterButton = document.createElement("button");
        filterButton.type = "button";
        setClass(filterButton, cssClass);
        filterButton.classList.add('formmenu-filter-button');
        filterButton.onclick = onClickHandler;
        return filterButton;
    }
    function createMainMenuElement() {
        var menuElement = document.createElement("div");
        menuElement.classList.add('formmenu');
        menuElement.id = 'formmenu';
        return menuElement;
    }
    function addMenuBody(_mainMenuElement, _menuElementInfos) {
        _mainMenuElement.appendChild(verticalResizeDiv());
        _mainMenuElement.appendChild(horizontalResizeDiv());
        var openButtonBar = document.createElement("div");
        openButtonBar.classList.add('formmenu-open-button-bar');
        addFilterButton('classMenuShowButton', onMenuHideShowButtonClicked, "showMenuHideShowButton", openButtonBar);
        _mainMenuElement.appendChild(openButtonBar);
        var filterBar = document.createElement("div");
        filterBar.classList.add('formmenu-filter-bar');
        addFilterButton('classMenuHideButton', onMenuHideShowButtonClicked, "showMenuHideShowButton", filterBar);
        addFilterButton('classExpandAllMenuButton', onExpandAllMenuClicked, "showExpandAllMenuButton", filterBar);
        addFilterButton('classCollapseAllMenuButton', onCollapseAllMenuClicked, "showCollapseAllMenuButton", filterBar);
        // Create the buttons area very early on, in case processing of the item state infos
        // or the rebuilding of the menu itself
        // has a dependency on the buttons.
        var buttonsArea = createButtonsArea();
        processAllItemStateInfos(filterBar, _menuElementInfos);
        var showFilterInput = getConfigValue("showFilterInput");
        if (showFilterInput) {
            var filterInput = createFilterInput();
            filterBar.appendChild(filterInput);
        }
        _mainMenuElement.appendChild(filterBar);
        // The the ul holding the menu items must have the class formmenu-top-menuitems.
        // It will be replaced by rebuildMenuList.
        _mainUlElement = document.createElement("ul");
        _mainMenuElement.appendChild(_mainUlElement);
        // Create buttons area
        _mainMenuElement.appendChild(buttonsArea);
        rebuildMenuList();
    }
    function visitAllItemStateInfos(callback) {
        visitKeyedConfigItems("itemStateInfos", callback);
    }
    function visitAllMenuButtonInfos(callback) {
        visitKeyedConfigItems("menuButtons", callback);
    }
    function visitKeyedConfigItems(configValueName, callback) {
        var configItems = getConfigValue(configValueName);
        Object.keys(configItems).forEach(function (key) {
            callback(configItems[key]);
        });
    }
    // Creates a button area div. Visits all menu button infos
    // and adds the button to the button area div. Returns the button area div.
    function createButtonsArea() {
        var buttonArea = document.createElement("div");
        buttonArea.classList.add('formmenu-buttonarea');
        buttonArea.id = 'formmenu-buttonarea';
        visitAllMenuButtonInfos(function (menuButtonInfo) {
            var button = document.createElement("button");
            button.type = "button";
            button.innerHTML = menuButtonInfo.caption;
            button.onclick = menuButtonInfo.onClick;
            setClass(button, menuButtonInfo.cssClass);
            if (menuButtonInfo.wireUp) {
                menuButtonInfo.wireUp(button);
            }
            buttonArea.appendChild(button);
        });
        return buttonArea;
    }
    function horizontalResizeDiv() {
        var resizeDiv = document.createElement("div");
        resizeDiv.classList.add('formmenu-horizontal-resizer');
        resizeDiv.innerHTML = "&nbsp;";
        resizeDiv.addEventListener('mousedown', function (e) {
            e.preventDefault();
            var boundingRect = _mainMenuElement.getBoundingClientRect();
            var preMoveWidth = boundingRect.right - boundingRect.left;
            var preMoveMouseX = e.pageX;
            var resizeMenuHorizontally = function (e) {
                var newWidth = preMoveWidth - (e.pageX - preMoveMouseX);
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
        resizeDiv.classList.add('formmenu-vertical-resizer');
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
    function processAllItemStateInfos(filterBar, _menuElementInfos) {
        visitAllItemStateInfos(function (itemStateInfo) {
            processItemStateInfo(itemStateInfo, filterBar, _menuElementInfos);
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
        setClass(filterButton, 'formmenu-filter-button-depressed', active);
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
        //###########    if (clickedElement.classList.contains('formmenu-filter-button-disabled')) { return; }
        var itemStateActive = getItemStateStatus(itemStateInfo);
        setItemStateStatus(!itemStateActive, itemStateInfo, clickedElement);
        rebuildMenuList();
    }
    // Called when the item state of a menu item is updated
    function setItemStateActive(active, itemStateInfo, filterButton, menuElementInfo) {
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
            _menuElementInfos.forEach(function (menuElementInfo) {
                if (menuElementInfo.itemStates.indexOf(itemStateInfo) != -1) {
                    existsActiveItem = true;
                }
            });
        }
        if (itemStateInfo.onChangeMenuItemsWithItemStateExist) {
            itemStateInfo.onChangeMenuItemsWithItemStateExist(existsActiveItem);
        }
        filterButton.disabled = !existsActiveItem;
        if (!existsActiveItem) {
            setItemStateStatus(false, itemStateInfo, filterButton);
        }
        rebuildMenuList();
    }
    function processItemStateInfo(itemStateInfo, filterBar, _menuElementInfos) {
        var filterButton = createFilterButton(itemStateInfo.stateFilterButtonClass, function (e) { onItemStateFilterButtonClicked(e, itemStateInfo); });
        filterButton.disabled = true;
        filterBar.appendChild(filterButton);
        _menuElementInfos.forEach(function (menuElementInfo) {
            itemStateInfo.wireUp(menuElementInfo.domElement, function (active) { return setItemStateActive(active, itemStateInfo, filterButton, menuElementInfo); });
        });
    }
    // If the element is visible, returns 0.
    // If it is not visible, returns distance from top of screen to top of element.
    // This will be negative if the element is above the screen. The more negative it is, the higher it is
    // (as in, the further away from the screen.)
    function elementIsVisible(element) {
        var boundingRectangle = element.getBoundingClientRect();
        var isVisible = ((boundingRectangle.top >= 0) &&
            (boundingRectangle.left >= 0) &&
            (boundingRectangle.bottom <= (window.innerHeight || document.documentElement.clientHeight)) &&
            (boundingRectangle.right <= (window.innerWidth || document.documentElement.clientWidth)));
        if (isVisible) {
            return 0;
        }
        return boundingRectangle.top;
    }
    // Sets a class on this menu item
    function setClassOnMenuItem(menuElement, classThisItem) {
        menuElement.menuElement.classList.add(classThisItem);
    }
    // Sets the formmenu-is-visible of an item.
    // Note that this doesn't reset the formmenu-is-visible etc. classes of items that are not visible.
    function setVisibility(menuElement) {
        setClassOnMenuItem(menuElement, 'formmenu-is-visible');
    }
    function removeVisibilityForMenu() {
        var count = _menuElementInfos.length;
        for (var i = 0; i < count; i++) {
            _menuElementInfos[i].menuElement.classList.remove('formmenu-is-visible');
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
    // If given menu item is not visible inside the menu, scrolls the menu so the item
    // shows at the top.
    function menuItemMakeVisibleAtTop(menuElementInfo) {
        if (!menuItemIsVisible(menuElementInfo)) {
            _mainUlElement.scrollTop = menuElementInfo.menuElement.offsetTop;
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
            _mainUlElement.scrollTop = newOffsetTop;
        }
    }
    function setVisibilityForMenu() {
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
            var visibility = elementIsVisible(currentMenuElementInfo.domElement);
            var isVisible = (visibility === 0);
            if (!isVisible) {
                if ((visibility < 0) && (visibility > closestDistanceToTop) &&
                    elementIsHeader(currentMenuElementInfo) &&
                    elementIsShownInMenu(currentMenuElementInfo)) {
                    invisibleMenuHeaderAboveVisibleArea = currentMenuElementInfo;
                }
            }
            // If we just got past the items that were visible, then the rest will be invisible,
            // so no need to visit any more items.
            if (lastWasVisible && !isVisible) {
                break;
            }
            lastWasVisible = isVisible;
            if (isVisible) {
                setVisibility(currentMenuElementInfo);
                if (!firstVisibleElement) {
                    firstVisibleElement = currentMenuElementInfo;
                }
                lastVisibleElement = currentMenuElementInfo;
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
    }
    // Finds out if the menu element in the menuElementInfo passes the search filter.
    // If so, updates the caption to highlight the matched bit and returns true.
    // Otherwise returns false.
    function passesSearchFilter(menuElementInfo) {
        var captionElement = getCaptionElement(menuElementInfo);
        // Restore the caption to its original state
        captionElement.innerHTML = menuElementInfo.caption;
        menuElementInfo.menuElement.classList.remove('formmenu-is-textmatch');
        if (!searchFilterIsActive()) {
            return true;
        }
        var filterValueLc = _searchTerm.toLowerCase();
        var foundIndex = menuElementInfo.caption.toLowerCase().indexOf(filterValueLc);
        // If there is no match, return
        if (foundIndex === -1) {
            return false;
        }
        var captionWithFilterTextSpan = insertMatchingFilterTextSpan(menuElementInfo.caption, foundIndex, filterValueLc.length);
        captionElement.innerHTML = captionWithFilterTextSpan;
        menuElementInfo.menuElement.classList.add('formmenu-is-textmatch');
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
        ulElement.classList.add('formmenu-top-menuitems');
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
        setClass(menuElementInfo.menuElement, 'formmenu-has-children', hasChildren);
        if ((!passesSearchFilter(menuElementInfo)) && (!hasChildren)) {
            return null;
        }
        if ((!passesItemStateFilters(menuElementInfo)) && (!hasChildren)) {
            return null;
        }
        var liElement = document.createElement("li");
        liElement.appendChild(menuElementInfo.menuElement);
        if (hasChildren) {
            liElement.appendChild(ulElement);
            setClass(menuElementInfo.menuElement, "formmenu-item-open", menuElementInfo.isExpanded);
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
    var rebuildMenuDebounceTimer = { id: 0 };
    // Replaces the last child in the main div with a ul holding the menu items
    function rebuildMenuList() {
        debounce(rebuildMenuDebounceTimer, 50, function () {
            var ulElement = getMenuElementsUl(_menuElementInfosRoot);
            // The top level ul must be positioned, so location of menu items within that ul
            // can be determined with offsetTop
            // Make sure ONLY the top level ul is positioned, not lower level ones.
            ulElement.style.position = "relative";
            _mainMenuElement.replaceChild(ulElement, _mainUlElement);
            _mainUlElement = ulElement;
            ensureMenuBottomVisible();
        });
    }
    function scrollHandler() {
        var currentYOffset = window.pageYOffset;
        _scrollingDown = (currentYOffset > _lastPageYOffset);
        _lastPageYOffset = (currentYOffset < 0) ? 0 : currentYOffset;
        setVisibilityForMenu();
    }
    FormMenu.scrollHandler = scrollHandler;
    function resizeHandler() {
        setVisibilityForMenu();
        ensureMenuBottomVisible();
    }
    FormMenu.resizeHandler = resizeHandler;
    function pageLoadedHandler() {
        _lastPageYOffset = window.pageYOffset;
        _menuElementInfos = domElementsToMenuElements(getAllDomElements());
        setParents(_menuElementInfosRoot, { value: 0 }, _menuElementInfos);
        // Set _mainMenuElement early, because it will be used if setActive is called (part of itemStateInfo).
        // setActive may be called while the menu is being created.
        _mainMenuElement = createMainMenuElement();
        if (localStorage.getItem('formmenu-hidden')) {
            _mainMenuElement.classList.add('formmenu-hidden');
        }
        addMenuBody(_mainMenuElement, _menuElementInfos);
        setVisibilityForMenu();
        setDimensionsFromLocalStorage();
        var bodyElement = document.getElementsByTagName("BODY")[0];
        bodyElement.appendChild(_mainMenuElement);
        storeMenuBottom();
    }
    FormMenu.pageLoadedHandler = pageLoadedHandler;
})(FormMenu || (FormMenu = {}));
//# sourceMappingURL=formmenu.js.map