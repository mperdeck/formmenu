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
    var defaultConfiguration = {
        skipFirstHeading: false,
        // Items with level equal or lower than this will be open initially. -1 to open everything. 0 to open nothing.
        defaultOpenAtLevel: 1,
        // Same as defaultOpenAtLevel, but applies when user clicks the collapse filter button.
        collapseOpenAtLevel: 1,
        domItemHighlightPeriodMS: 500,
        showFilterInput: true,
        filterPlaceholder: 'filter',
        filterMinimumCharacters: 2,
        showMenuHideShowButton: true,
        showExpandAllMenuButton: true,
        showCollapseAllMenuButton: true,
        // Note that HTML only has these heading tags. There is no h7, etc.
        querySelector: "h1,h2,h3,h4,h5,h6",
        tagNameToLevelMethod: tagNameToLevelDefaultMethod,
        itemStateInfos: {}
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
    // The current content of the search box
    var _searchTerm = '';
    // Holds references to all iItemStateInfos whose filers are active
    var _itemStateInfoActiveFilters = [];
    var _levelNonHeadingMenuItem = 9000;
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
        var domItemHighlightPeriodMS = getConfigValue("domItemHighlightPeriodMS");
        // If a menu item gets clicked, scroll the associated dom element into view if it is not already
        // visible. If it is already visible, do not scroll it.
        //
        // Also give it the formmenu-highlighted-dom-item for a short time, to point out where
        // it is.
        var onClickHandler = function (e) {
            if (!elementIsVisible(domElement)) {
                domElement.scrollIntoView();
            }
            domElement.classList.add('formmenu-highlighted-dom-item');
            setTimeout(function () { domElement.classList.remove('formmenu-highlighted-dom-item'); }, domItemHighlightPeriodMS);
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
    // If the element has class1, sets class2 instead. And vice versa.
    function toggleClasses(htmlElement, class1, class2) {
        if (htmlElement.classList.contains(class1)) {
            htmlElement.classList.remove(class1);
            htmlElement.classList.add(class2);
        }
        else if (htmlElement.classList.contains(class2)) {
            htmlElement.classList.remove(class2);
            htmlElement.classList.add(class1);
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
    // Removes the given class from all given menu elements
    function removeClass(_menuElementInfos, cssClass) {
        _menuElementInfos.forEach(function (menuElementInfo) {
            menuElementInfo.menuElement.classList.remove(cssClass);
        });
    }
    function parentOfEventTarget(e) {
        // See https://developer.mozilla.org/en-US/docs/Web/API/Event/currentTarget
        // currentTarget will return the span containing the caption.
        var parent = (e.currentTarget).parentNode;
        return parent;
    }
    // Returns if by default the menu item should be open, false otherwise.
    // levelConfigItemName - name of config item that has the level at which the item should be open
    function openByDefault(menuElementInfo, levelConfigItemName) {
        var levelConfig = getConfigValue(levelConfigItemName);
        var result = ((menuElementInfo.level <= levelConfig) || (levelConfig == -1));
        return result;
    }
    // If the menu item has oldClass, then replace that with newClass.
    // Otherwise to nothing.
    function transitionMenuItemHasClass(menuElementInfo, oldClass, newClass) {
        var classList = menuElementInfo.menuElement.classList;
        if (classList.contains(oldClass)) {
            classList.remove(oldClass);
            classList.add(newClass);
        }
    }
    function openMenuItem(menuElementInfo) {
        transitionMenuItemHasClass(menuElementInfo, 'formmenu-item-closed', 'formmenu-item-open');
    }
    function closeMenuItem(menuElementInfo) {
        transitionMenuItemHasClass(menuElementInfo, 'formmenu-item-open', 'formmenu-item-closed');
    }
    function onExpandClicked(menuElementInfo) {
        toggleClasses(menuElementInfo.menuElement, 'formmenu-item-closed', 'formmenu-item-open');
        menuElementInfo.isExpanded = !menuElementInfo.isExpanded;
    }
    function createMenuElementDiv(menuElementInfo, cssClass, onClickHandler) {
        var menuElement = document.createElement("div");
        var expandElement = document.createElement("span");
        expandElement.classList.add("formmenu-expand");
        expandElement.onclick = function (e) { return onExpandClicked(menuElementInfo); };
        menuElement.appendChild(expandElement);
        var captionElement = document.createElement("span");
        captionElement.classList.add("formmenu-caption");
        captionElement.innerHTML = menuElementInfo.caption;
        captionElement.onclick = onClickHandler;
        menuElement.appendChild(captionElement);
        menuElement.classList.add(cssClass);
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
    function onMenuHideShowButtonClicked(e) {
        // The span with the hide/show will have been clicked.
        // Its parent is the formmenu div.
        var parentDiv = parentOfEventTarget(e);
        toggleClasses(parentDiv, 'formmenu-hidden', 'formmenu-shown');
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
    // cssClass - css class of the span representing the button.
    // onClickHandler - runs when button is clicked.
    // showHideConfigName - name of a config item. If blank, button is always created.
    //                      If not blank, config item has to be true for button to be created.
    // parent - filter button will be added to this element.
    //
    function addFilterButton(cssClass, onClickHandler, showHideConfigName, parent) {
        var showButton = true;
        if (showHideConfigName) {
            showButton = getConfigValue(showHideConfigName);
        }
        if (!showButton) {
            return;
        }
        var filterButton = createFilterButton(cssClass, onClickHandler);
        parent.appendChild(filterButton);
    }
    function createFilterButton(cssClass, onClickHandler) {
        var filterButton = document.createElement("span");
        filterButton.classList.add(cssClass);
        filterButton.classList.add('formmenu-filter-button');
        filterButton.onclick = onClickHandler;
        return filterButton;
    }
    function createMainMenuElement() {
        var menuElement = document.createElement("div");
        menuElement.classList.add('formmenu');
        menuElement.classList.add('formmenu-shown');
        menuElement.id = 'formmenu';
        return menuElement;
    }
    function addMenuBody(_mainMenuElement, _menuElementInfos) {
        addFilterButton('formmenu-menu-hide-show', onMenuHideShowButtonClicked, "showMenuHideShowButton", _mainMenuElement);
        var filterBar = document.createElement("span");
        filterBar.classList.add('formmenu-filter-bar');
        addFilterButton('formmenu-expand-all-menu-button', onExpandAllMenuClicked, "showExpandAllMenuButton", filterBar);
        addFilterButton('formmenu-collapse-all-menu-button', onCollapseAllMenuClicked, "showCollapseAllMenuButton", filterBar);
        processAllItemStateInfos(filterBar, _menuElementInfos);
        var showFilterInput = getConfigValue("showFilterInput");
        if (showFilterInput) {
            var filterInput = createFilterInput();
            filterBar.appendChild(filterInput);
        }
        _mainMenuElement.appendChild(filterBar);
        rebuildMenuList();
    }
    // Visits all item state infos, processes the menu element infos for each
    // and adds a filter button for each to the passed in filter bar. 
    function processAllItemStateInfos(filterBar, _menuElementInfos) {
        var itemStateInfos = getConfigValue("itemStateInfos");
        Object.keys(itemStateInfos).forEach(function (key) {
            processItemStateInfo(itemStateInfos[key], filterBar, _menuElementInfos);
        });
    }
    function onItemStateFilterButtonClicked(e, itemStateInfo) {
        var clickedElement = (e.currentTarget);
        if (clickedElement.classList.contains('formmenu-filter-button-disabled')) {
            return;
        }
        toggleClass(_mainMenuElement, itemStateInfo.stateFilterActiveClass);
        // Update _itemStateInfoActiveFilters array
        var idx = _itemStateInfoActiveFilters.indexOf(itemStateInfo);
        // If the item state info was found in the array, remove it. Otherwise add it.
        if (idx != -1) {
            _itemStateInfoActiveFilters.splice(idx, 0);
        }
        else {
            _itemStateInfoActiveFilters.push(itemStateInfo);
        }
        rebuildMenuList();
    }
    function setItemStateActive(active, itemStateInfo, filterButton, menuElementInfo) {
        var itemStates = menuElementInfo.itemStates;
        var idx = itemStates.indexOf(itemStateInfo);
        if (idx != -1) {
            itemStates.splice(idx, 0);
        }
        if (active) {
            itemStates.push(itemStateInfo);
        }
        // Update filter button style
        var existsActiveItem = active;
        if (!existsActiveItem) {
            _menuElementInfos.forEach(function (menuElementInfo) {
                if (menuElementInfo.itemStates.indexOf(itemStateInfo) != -1) {
                    existsActiveItem = true;
                }
            });
        }
        if (existsActiveItem) {
            filterButton.classList.remove('formmenu-filter-button-disabled');
        }
        else {
            filterButton.classList.add('formmenu-filter-button-disabled');
        }
        rebuildMenuList();
    }
    function processItemStateInfo(itemStateInfo, filterBar, _menuElementInfos) {
        var filterButton = createFilterButton(itemStateInfo.stateFilterButtonClass, function (e) { onItemStateFilterButtonClicked(e, itemStateInfo); });
        filterButton.classList.add('formmenu-filter-button-disabled');
        filterBar.appendChild(filterButton);
        _menuElementInfos.forEach(function (menuElementInfo) {
            itemStateInfo.wireUp(menuElementInfo.domElement, function (active) { return setItemStateActive(active, itemStateInfo, filterButton, menuElementInfo); });
        });
    }
    function elementIsVisible(element) {
        var boundingRectangle = element.getBoundingClientRect();
        return ((boundingRectangle.top >= 0) &&
            (boundingRectangle.left >= 0) &&
            (boundingRectangle.bottom <= (window.innerHeight || document.documentElement.clientHeight)) &&
            (boundingRectangle.right <= (window.innerWidth || document.documentElement.clientWidth)));
    }
    // Sets a class on this menu item, and another class on the parent of the item, its parents, etc.
    function setClassOnMenuItem(menuElement, classThisItem, classParents) {
        menuElement.menuElement.classList.add(classThisItem);
        setClassOnMenuItemParents(menuElement, classParents);
    }
    // Sets a class on the parent of the given item, its parents, etc.
    function setClassOnMenuItemParents(menuElement, classParents) {
        var currentElement = menuElement.parent;
        while (currentElement) {
            // If the class for parents has already been set on a parent, it will have been set on that
            // parent's parents as well. So can stop here.
            if (currentElement.menuElement.classList.contains(classParents)) {
                break;
            }
            currentElement.menuElement.classList.add(classParents);
            currentElement = currentElement.parent;
        }
    }
    // Removes a class on this menu item, and another class on the parent of the item, its parents, etc.
    function removeClassFromMenuItem(menuElement, classThisItem, classParents) {
        menuElement.menuElement.classList.remove(classThisItem);
        var currentElement = menuElement.parent;
        while (currentElement) {
            currentElement.menuElement.classList.remove(classParents);
            currentElement = currentElement.parent;
        }
    }
    // Sets the formmenu-is-visible of an item, and the formmenu-is-parent-of-visible
    // class on its parents.
    // Note that this doesn't reset the formmenu-is-visible etc. classes of items that are not visible.
    function setVisibility(menuElement) {
        setClassOnMenuItem(menuElement, 'formmenu-is-visible', 'formmenu-is-parent-of-visible');
    }
    function removeVisibilityForMenu() {
        var count = _menuElementInfos.length;
        for (var i = 0; i < count; i++) {
            _menuElementInfos[i].menuElement.classList.remove('formmenu-is-visible');
            _menuElementInfos[i].menuElement.classList.remove('formmenu-is-parent-of-visible');
        }
    }
    function setVisibilityForMenu() {
        if (!_menuElementInfos) {
            return;
        }
        removeVisibilityForMenu();
        var count = _menuElementInfos.length;
        var lastWasVisible = false;
        for (var i = 0; i < count; i++) {
            var currrentMenuElementInfo = _menuElementInfos[i];
            var isVisible = elementIsVisible(currrentMenuElementInfo.domElement);
            // If we just got past the items that were visible, then the rest will be invisible,
            // so no need to visit any more items.
            if (lastWasVisible && !isVisible) {
                break;
            }
            lastWasVisible = isVisible;
            if (isVisible) {
                setVisibility(currrentMenuElementInfo);
            }
        }
    }
    function rebuildMenuList() {
    }
    function scrollHandler() {
        setVisibilityForMenu();
    }
    FormMenu.scrollHandler = scrollHandler;
    function resizeHandler() {
        setVisibilityForMenu();
    }
    FormMenu.resizeHandler = resizeHandler;
    function pageLoadedHandler() {
        _menuElementInfos = domElementsToMenuElements(getAllDomElements());
        setParents(_menuElementInfosRoot, { value: 0 }, _menuElementInfos);
        // Set _mainMenuElement early, because it will be used if setActive is called (part of itemStateInfo).
        // setActive may be called while the menu is being created.
        _mainMenuElement = createMainMenuElement();
        addMenuBody(_mainMenuElement, _menuElementInfos);
        setVisibilityForMenu();
        var bodyElement = document.getElementsByTagName("BODY")[0];
        bodyElement.appendChild(_mainMenuElement);
    }
    FormMenu.pageLoadedHandler = pageLoadedHandler;
})(FormMenu || (FormMenu = {}));
//# sourceMappingURL=formmenu.js.map