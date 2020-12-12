///<reference path="bigformmenu.d.ts" />

// "DOMContentLoaded" fires when the html has loaded, even if the stylesheets, javascript, etc are still being loaded.
// "load" fires when the entire page has loaded, including stylesheets, etc. 

document.addEventListener("DOMContentLoaded", function(){
    BigFormMenu.pageLoadedHandler();
});

namespace BigFormMenu {
    const _levelNonHeadingMenuItem: number = 9000;

    let defaultConfiguration: iBigFormMenuConfiguration = {
        skipFirstHeading: true,

        defaultOpenAtLevel: _levelNonHeadingMenuItem + 1,

        collapseOpenAtLevel: 1,

        minimumMenuWidth: 60,
        minimumMenuHeigth: 100,

        hideForSmallForms: true,

        showFilterInput: true,
        filterPlaceholder: 'filter',
        filterMinimumCharacters: 2,

        showMenuHideShowButton: true,
        showExpandAllMenuButton: true,
        showCollapseAllMenuButton: true,

        classMenuShowButton: 'bigformmenu-menu-show',
        classMenuHideButton: 'bigformmenu-menu-hide',
        classExpandAllMenuButton: 'bigformmenu-expand-all-menu-button',
        classCollapseAllMenuButton: 'bigformmenu-collapse-all-menu-button',

        titleMenuShowButton: 'Show menu',
        titleMenuHideButton: 'Hide menu',
        titleExpandAllMenuButton: 'Expand all',
        titleCollapseAllMenuButton: 'Collapse all',
        
        // Note that HTML only has these heading tags. There is no h7, etc.
        querySelector: "h1,h2,h3,h4,h5,h6",

        tagNameToLevelMethod: tagNameToLevelDefaultMethod,
        itemStateInfos: {},
        menuButtons: {}
    }

    // Create empty bigFormMenuConfiguration here, to make it easier to write
    // ...bigformmenu.config.js files that set properties on this object.
    //
    // Do not use let here, because that doesn't allow you to declare a variable 
    // multiple times.
    export var bigFormMenuConfiguration: iBigFormMenuConfiguration = {};

    class MenuElementInfo {

        constructor(
            // The heading, etc. in the actual DOM (not in the menu)
            public domElement: HTMLElement,

            // Caption of the menu element
            public caption: string,

            // Level of the menu item. For example, a H1 has level 1, H2 has level 2.
            // Menu items that are not associated with a heading have a very high level.
            public level: number
        ) {}

        // The item in the menu
        public menuElement: HTMLElement;

        // Headings constitute a hierarchy. An H2 below an H1 is the child of that H1.
        // non-headings are children of the heading they sit under.
        public parent: MenuElementInfo;
        public children: MenuElementInfo[] = [];

        // If this element has children, then if true the element is expanded
        public isExpanded: boolean = false;

        // true if the menuElement (the dom menu item) is included in the menu. That is, if any filters are active,
        // it passed those filters. And it is displayed (no display:none).
        // Note that the menu item could be still not visible to the user even if this is true, because its parent was closed,
        // because it is scrolled out of the menu div visible area.
        public isIncludedInMenu: boolean = false;

        // Contains all item state infos that are active for this element
        public itemStates: iItemStateInfo[] = [];
    }

    let _menuElementInfos: MenuElementInfo[];

    // Acts as the parent of menu elements with the lowest level (typically the h1)
    // Use the children property of this element to easily generate the ul tag
    // containing the menu items.
    // Must have a level lower than 1.
    let _menuElementInfosRoot: MenuElementInfo = new MenuElementInfo(null, null, 0);

    // The div that contains the entire menu
    let _mainMenuElement:HTMLElement;

    // The div that contains the entire menu
    let _mainUlElement:HTMLUListElement;

    // The current content of the search box
    let _searchTerm:string = '';

    // Holds references to all iItemStateInfos whose filers are active
    let _itemStateInfoActiveFilters: iItemStateInfo[] = [];

    // Used to determine in which direction the page is scrolling
    let _lastPageYOffset: number = 0;

    // If true, we're scrolling towards the end of the document
    let _scrollingDown = true;

    let _intersectionObserver: IntersectionObserver;

    function allMenuElementInfos(callback: ()=>void) {

    }

    // Finds a MenuElementInfo given the DOM element it points at.
    // If not such MenuElementInfo is found, returns null.
    function menuElementInfoByDomElement(domElement: HTMLElement): MenuElementInfo {
        for (let i = 0; i < _menuElementInfos.length; i++) {
            let menuElementInfo = _menuElementInfos[i];
            if (menuElementInfo.domElement === domElement) {
                return menuElementInfo;
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

    function tagNameToLevelDefaultMethod(tagName: string): number {
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

    function tagNameToLevel(tagName: string): number {
        let tagNameToLevelMethod: (tagName: string) => number = getConfigValue("tagNameToLevelMethod");
        let level:number = tagNameToLevelMethod(tagName);
        return level;
    }

    function getConfigValue(itemName: string): any {
        // bigFormMenuConfiguration may have been created by loading .js file that defines that variable.
        // First try to get the value from there. Otherwise get it from the default config.
        // Note that you want to check against undefined specifically, because for example false
        // is a valid value.

        // Do not use "if (bigFormMenuConfiguration)", because then you'll get a run time reference error
        // if the variable does not exist already.
        if (typeof bigFormMenuConfiguration !== 'undefined') {
            if (typeof bigFormMenuConfiguration[itemName] !== 'undefined') {
                return bigFormMenuConfiguration[itemName];
            }
        }

        return defaultConfiguration[itemName]; 
    }

    // Returns all dom elements to be represented in the menu
    function getAllDomElements(): NodeListOf<Element> {
        let querySelector: string = getConfigValue("querySelector");

        let allDomElements = document.querySelectorAll(querySelector);
        return allDomElements;
    }

    // Returns true if all dom elements are visible.
    // See notes for hideForSmallForms option.
    function allDomElementsVisible(domElements: NodeListOf<Element>): boolean {
        for (let i = 0; i < domElements.length; i++) {
            let visibilityResult = elementIsVisible(domElements[i] as HTMLElement);

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
    function domElementsToMenuElements(domElements: NodeListOf<Element>): MenuElementInfo[] {
        let _menuElementInfos: MenuElementInfo[] = [];

        let includeElement: boolean = !getConfigValue("skipFirstHeading");

        domElements.forEach((value: Element)=>{
            if (includeElement) {
                let menuElement = domElementToMenuElement(value as HTMLElement);
                if (menuElement) {
                    _menuElementInfos.push(menuElement);
                }
            }

            includeElement = true;
        });

        return _menuElementInfos;
    }

    // Create a flash against the given DOM element, to attract the user's attention to it.
    function flashElement(domElement: HTMLElement) {
        // See https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Animations/Using_CSS_animations
        domElement.addEventListener("animationend",
            function () { domElement.classList.remove('bigformmenu-highlighted-dom-item'); }, false);
        domElement.classList.add('bigformmenu-highlighted-dom-item');
    }

    function domElementToMenuElement(domElement: HTMLElement): MenuElementInfo {
        let getItemCaption = getConfigValue("getItemCaption") as (domElement: HTMLElement) => string;
        let caption;

        if (getItemCaption) {
            caption = getItemCaption(domElement);
        } else {
            caption = domElement.innerText;
        }

        if (!caption) {
            return null;
        }

        let menuElementClass = 'bigformmenu-' + domElement.tagName;

        // If a menu item gets clicked, scroll the associated dom element into view if it is not already
        // visible. If it is already visible, do not scroll it.
        //
        // Also give it the bigformmenu-highlighted-dom-item for a short time, to point out where
        // it is.
        let onClickHandler = (e:MouseEvent)=>{
            let isVisibleResult = elementIsVisible(domElement);
            if (isVisibleResult.isShown) {
                if (!isVisibleResult.isVisible) {
                    domElement.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });

                    // Delay the flash a little bit, to allow for the element to smooth scroll into view.
                    setTimeout(function () { flashElement(domElement); }, 500);
                } else {
                    flashElement(domElement);
                }
            }

            return false;
        };

        let level:number = tagNameToLevel(domElement.tagName);
        let menuElementInfo = new MenuElementInfo(
            domElement,
            caption,
            level);

        let menuElementDiv = createMenuElementDiv(menuElementInfo, menuElementClass, onClickHandler);
        menuElementInfo.menuElement = menuElementDiv;

        let defaultOpen: boolean = openByDefault(menuElementInfo, "defaultOpenAtLevel");
        menuElementInfo.isExpanded = defaultOpen;

        return menuElementInfo;
    }

    // Sets the parent property in all elements in _menuElementInfos.
    // parent: set to _menuElementInfosRoot
    // i: set to 0
    function setParents(parent: MenuElementInfo, i: { value:number}, _menuElementInfos: MenuElementInfo[]): void {
        const parentLevel: number = parent.level;

        while((i.value < _menuElementInfos.length) && (_menuElementInfos[i.value].level > parentLevel)) {

            let currentMenuElementInfo = _menuElementInfos[i.value];
            currentMenuElementInfo.parent = parent;

            if (parent) { parent.children.push(currentMenuElementInfo); }

            // Point to first potential child item
            i.value = i.value + 1;

            setParents(currentMenuElementInfo, i, _menuElementInfos);
        }
    }

    // If the element has cssClass, remove it. Otherwise add it.
    function toggleClass(htmlElement:HTMLElement, cssClass: string): void {
        if (htmlElement.classList.contains(cssClass)) {
            htmlElement.classList.remove(cssClass);
        } else {
            htmlElement.classList.add(cssClass);
        }
    }

    // Adds the given class to the given element.
    // cssClass - one or more classes, separated by space
    // setIt - if true, the classes are added. If false, the classes are removed.
    function setClass(htmlElement:HTMLElement, cssClass: string, setIt: boolean = true): void {
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
        if (localStorage.getItem(key)) {
            localStorage.removeItem(key);
        } else {
            localStorage.setItem(key, "1");
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
        toggleClass(menuElementInfo.menuElement, 'bigformmenu-item-open')
        menuElementInfo.isExpanded = !menuElementInfo.isExpanded;
        ensureMenuBottomVisible();
        return false;
    }

    function createMenuElementDiv(menuElementInfo: MenuElementInfo, cssClass: string, onClickHandler: (e:MouseEvent)=>void): HTMLElement {
        let menuElement: HTMLElement = document.createElement("div");

        let expandElement: HTMLAnchorElement = document.createElement("a");
        expandElement.href = "#";
        expandElement.classList.add("bigformmenu-expand");
        expandElement.onclick = (e) => onExpandClicked(menuElementInfo);
        menuElement.appendChild(expandElement);

        let captionElement: HTMLAnchorElement = document.createElement("a");
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
    function getCaptionElement(menuElementInfo: MenuElementInfo): HTMLElement {
        const divElement: HTMLElement = menuElementInfo.menuElement;
        const captionSpanElement: HTMLElement = <HTMLElement>(divElement.children[1]);

        return captionSpanElement;
    }

    // Inserts span tags into a string. The start tag will be at startIndex and the end tag
    // spanLength characters later.
    // For example:
    // s: abcdefgi, startIndex: 2, spanLength: 3
    // Result:
    // ab<span class='bigformmenu-matching-filter-text'>cde</span>fgi
    function insertMatchingFilterTextSpan(s: string, startIndex: number, spanLength: number): string {
        const part1 = s.substring(0, startIndex);
        const part2 = s.substring(startIndex, startIndex + spanLength);
        const part3 = s.substring(startIndex + spanLength);

        const result = part1 + "<span class='bigformmenu-matching-filter-text'>" + part2 + "</span>" + part3;
        return result;
    }

    function onChangeFilter(e: Event): void {
        _searchTerm = (<HTMLInputElement>(e.currentTarget)).value;
        
        setClass(_mainMenuElement, 'bigformmenu-textmatch-filter-is-active', searchFilterIsActive());

        rebuildMenuList(false);
    }

    function createFilterInput(): HTMLInputElement {
        let menuElement: HTMLInputElement = document.createElement("input");
        menuElement.type = "search";
        menuElement.className = 'bigformmenu-filter';

        let filterPlaceholder = getConfigValue("filterPlaceholder");
        if (filterPlaceholder) {
            menuElement.placeholder = filterPlaceholder;
        }

        // onChange only fires after you've clicked outside the input box.
        // onKeypress fires before the value has been updated, so you get the old value, not the latest value
        menuElement.onkeyup = onChangeFilter;

        // onfilter fires when the little clear icon is clicked
        (<any>menuElement).onsearch = onChangeFilter;

        return menuElement;
    }

    function setMenuHeight(height: number): void {
        const widthResizeOnly: boolean = getConfigValue('widthResizeOnly');
        if (widthResizeOnly) { return; }

        _mainMenuElement.style.height = height + "px";
    }

    function storeDimensions(width: number, height: number): void {
        localStorage.setItem('bigformmenu-width', width.toString());
        localStorage.setItem('bigformmenu-height', height.toString());
    }

    function storeWidth(width: number): void {
        localStorage.setItem('bigformmenu-width', width.toString());
    }

    function storeHeight(height: number): void {
        localStorage.setItem('bigformmenu-height', height.toString());
    }

    function getDimensions(): { width: number, height: number } {
        const result = { 
            width: parseInt(localStorage.getItem('bigformmenu-width')), 
            height: parseInt(localStorage.getItem('bigformmenu-height')) 
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

    // If bigformmenu-bottom has not been set, figures out the distance between the bottom of the
    // menu and the bottom of the screen and stores that under bigformmenu-bottom.
    function storeMenuBottom(): void {

        if (localStorage.getItem("bigformmenu-bottom") !== null) { return; }

        const boundingRectangle = _mainMenuElement.getBoundingClientRect();
        const windowHeight = (window.innerHeight || document.documentElement.clientHeight);
        const formBottom = windowHeight - boundingRectangle.bottom;

        localStorage.setItem('bigformmenu-bottom', formBottom.toString());
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
        const storedHeightString = localStorage.getItem('bigformmenu-height');
        if (storedHeightString === null) { return; }

        // formBottom should always be there, seeing it is set when the component is loaded.
        const formBottom = parseInt(localStorage.getItem('bigformmenu-bottom'));

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
        _mainMenuElement.classList.add('bigformmenu-hidden');
        localStorage.setItem('bigformmenu-hidden', "1");
    }

    function showMenu(): void {
        _mainMenuElement.classList.remove('bigformmenu-hidden');
        localStorage.removeItem('bigformmenu-hidden');
    }

    function onMenuHideButtonClicked(e: MouseEvent): void {
        hideMenu();
    }

    function onMenuShowButtonClicked(e: MouseEvent): void {
        showMenu();
    }

    function onExpandAllMenuClicked(e: MouseEvent): void {
        _menuElementInfos.forEach((menuElementInfo:MenuElementInfo) => {
            menuElementInfo.isExpanded = true;
        });

        rebuildMenuList(false);
    }

    function onCollapseAllMenuClicked(e: MouseEvent): void {
        _menuElementInfos.forEach((menuElementInfo:MenuElementInfo) => {
            let defaultOpen: boolean = openByDefault(menuElementInfo, "collapseOpenAtLevel");

            // Close the items above the "collapseOpenAtLevel" level
            // Leave alone those items that could be opened. That way, if the user has closed
            // more items than this method would close, clicking collapse won't lead to actually
            // items being opened.

            if (!defaultOpen) {
                menuElementInfo.isExpanded = false;
            }
        });

        rebuildMenuList(false);
    }

    // Add a filter button to the filter bar (the bit of space left of the filter).
    // cssClassConfigName - name of config item holding css class of the button.
    // onClickHandler - runs when button is clicked.
    // showHideConfigName - name of a config item. If blank, button is always created.
    //                      If not blank, config item has to be true for button to be created.
    // parent - filter button will be added to this element.
    //
    function addFilterButton(cssClassConfigName: string, onClickHandler: (e: MouseEvent) => void,
        showHideConfigName: string, titleConfigName: string, parent: HTMLElement) {

        let showButton: boolean = true;
        if (showHideConfigName) {
            showButton = getConfigValue(showHideConfigName);
        }
        
        if (!showButton) {
            return;
        }
        
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
        filterButton.classList.add('bigformmenu-filter-button');

        if (title) {
            filterButton.title = title;
        }

        filterButton.onclick = onClickHandler;

        return filterButton;
    }

    function createMainMenuElement(): HTMLElement {
        let menuElement: HTMLElement = document.createElement("div");
        menuElement.classList.add('bigformmenu');
        menuElement.id = 'bigformmenu';

        return menuElement;
    }

    function addMenuBody(_mainMenuElement: HTMLElement, _menuElementInfos: MenuElementInfo[]): void {

        _mainMenuElement.appendChild(verticalResizeDiv());
        _mainMenuElement.appendChild(horizontalResizeDiv('bigformmenu-left-horizontal-resizer', 1));
        _mainMenuElement.appendChild(horizontalResizeDiv('bigformmenu-right-horizontal-resizer', -1));

        let openButtonBar: HTMLElement = document.createElement("div");
        openButtonBar.classList.add('bigformmenu-open-button-bar');

        addFilterButton('classMenuShowButton', onMenuShowButtonClicked,
            "showMenuHideShowButton", "titleMenuShowButton", openButtonBar);

        _mainMenuElement.appendChild(openButtonBar);

        let filterBar: HTMLElement = document.createElement("div");
        filterBar.classList.add('bigformmenu-filter-bar');

        addFilterButton('classMenuHideButton', onMenuHideButtonClicked,
            "showMenuHideShowButton", "titleMenuHideButton", filterBar);

        addFilterButton('classExpandAllMenuButton', onExpandAllMenuClicked,
            "showExpandAllMenuButton", 'titleExpandAllMenuButton', filterBar);

        addFilterButton('classCollapseAllMenuButton', onCollapseAllMenuClicked,
            "showCollapseAllMenuButton", 'titleCollapseAllMenuButton', filterBar);

        // Create the buttons area very early on, in case processing of the item state infos
        // or the rebuilding of the menu itself
        // has a dependency on the buttons.
        const buttonsArea:HTMLDivElement = createButtonsArea();

        processAllItemStateInfos(filterBar, _menuElementInfos);

        let showFilterInput: boolean = getConfigValue("showFilterInput");
        if (showFilterInput) {
            let filterInput = createFilterInput();
            filterBar.appendChild(filterInput);
        }

        _mainMenuElement.appendChild(filterBar);

        _mainUlElement = document.createElement("ul");
        _mainMenuElement.appendChild(_mainUlElement);

        // Create buttons area
        _mainMenuElement.appendChild(buttonsArea);

        rebuildMenuList(false);
    }

    function visitAllItemStateInfos(callback: (itemStateInfo: iItemStateInfo)=>void): void {
        visitKeyedConfigItems<iItemStateInfo>("itemStateInfos", callback);
    }

    function visitAllMenuButtonInfos(callback: (menuButtonInfo: iMenuButton)=>void): void {
        visitKeyedConfigItems<iMenuButton>("menuButtons", callback);
    }

    function visitKeyedConfigItems<T>(configValueName: string, callback: (configItem: T)=>void): void {
        let configItems: { [key: string]: T} = getConfigValue(configValueName);

        Object.keys(configItems).forEach(key => {
            callback(configItems[key]);
        });
    }

    // Creates a button area div. Visits all menu button infos
    // and adds the button to the button area div. Returns the button area div.
    function createButtonsArea(): HTMLDivElement {

        let buttonArea: HTMLDivElement = document.createElement("div");
        buttonArea.classList.add('bigformmenu-buttonarea');
        buttonArea.id = 'bigformmenu-buttonarea';

        visitAllMenuButtonInfos((menuButtonInfo: iMenuButton) => {

            if (menuButtonInfo.cssSelector) {
                let allButtonElements = document.querySelectorAll(menuButtonInfo.cssSelector);

                for (let i = 0; i < allButtonElements.length; i++) {
                    let currentElement = allButtonElements[i] as HTMLElement;
                    let caption = currentElement.innerHTML;
                    let onClick = () => { currentElement.click(); };
                    let cssClass = currentElement.className;

                    createButton(buttonArea, menuButtonInfo, caption, onClick, cssClass);
                }
            } else {
                createButton(buttonArea, menuButtonInfo);
            }
        })

        return buttonArea;
    }

    function createButton(buttonArea: HTMLDivElement, menuButtonInfo: iMenuButton,
        caption?: string, onClick?: () => void, cssClass?: string) {

        let button: HTMLButtonElement = document.createElement("button");

        button.type = "button";
        button.innerHTML = menuButtonInfo.caption || caption;
        button.onclick = menuButtonInfo.onClick || onClick;
        setClass(button, menuButtonInfo.cssClass || cssClass);

        let generateButton = true;

        if (menuButtonInfo.wireUp) {
            generateButton = menuButtonInfo.wireUp(button);
        }

        if (generateButton) { buttonArea.appendChild(button); }
    }

    // cssClass - class of the resizer grabber
    // direction - set to 1 if the grabber on the left is created, set to -1 if the one on the right is created. 
    function horizontalResizeDiv(cssClass: string, direction: number): HTMLDivElement {
        let resizeDiv: HTMLDivElement = document.createElement("div");
        resizeDiv.classList.add(cssClass);
        resizeDiv.innerHTML = "&nbsp;";

        resizeDiv.addEventListener('mousedown', function(e) {
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

            window.addEventListener('mouseup', ()=> {
                window.removeEventListener('mousemove', resizeMenuHorizontally);
            });
        });

        return resizeDiv;
    }

    function verticalResizeDiv(): HTMLDivElement {
        let resizeDiv: HTMLDivElement = document.createElement("div");
        resizeDiv.classList.add('bigformmenu-vertical-resizer');
        resizeDiv.innerHTML = "&nbsp;";

        resizeDiv.addEventListener('mousedown', function(e) {
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

            window.addEventListener('mouseup', ()=> {
                window.removeEventListener('mousemove', resizeMenuVertically);
            });
        });

        return resizeDiv;
    }

    // Visits all item state infos, processes the menu element infos for each
    // and adds a filter button for each to the passed in filter bar. 
    function processAllItemStateInfos(filterBar: HTMLElement, _menuElementInfos: MenuElementInfo[]): void {
        visitAllItemStateInfos((itemStateInfo: iItemStateInfo)=>{
            processItemStateInfo(itemStateInfo, filterBar, _menuElementInfos);
        });
    }

    // Returns true if the given item state is active
    function getItemStateStatus(itemStateInfo: iItemStateInfo): boolean {
        const idx:number = _itemStateInfoActiveFilters.indexOf(itemStateInfo);
        return (idx !== -1);
    }

    // Sets the state of the given item state filter.
    // active - true to set active (so menu items are filtered), false to set inactive
    // filterButton - filter button associated with the item state
    function setItemStateStatus(active: boolean, itemStateInfo: iItemStateInfo, filterButton:HTMLElement): void {
        setClass(_mainMenuElement, itemStateInfo.stateFilterActiveClass, active);
        setClass(filterButton, 'bigformmenu-filter-button-depressed', active);

        // Update _itemStateInfoActiveFilters array

        let idx:number = _itemStateInfoActiveFilters.indexOf(itemStateInfo);

        if (idx != -1) {
            _itemStateInfoActiveFilters.splice(idx, 1);
        }
        
        if (active) {
            _itemStateInfoActiveFilters.push(itemStateInfo);
        }
    }

    function onItemStateFilterButtonClicked(e: MouseEvent, itemStateInfo: iItemStateInfo): void {
        let clickedElement:HTMLElement = (<any>(e.currentTarget));

        const itemStateActive: boolean = getItemStateStatus(itemStateInfo);
        setItemStateStatus(!itemStateActive, itemStateInfo, clickedElement);

        rebuildMenuList(false);
    }

    // Called when the item state of a menu item is updated
    function setItemStateActive(active: boolean, itemStateInfo: iItemStateInfo, filterButton: HTMLButtonElement, 
        menuElementInfo: MenuElementInfo): void {

        let itemStates = menuElementInfo.itemStates;
        let idx:number = itemStates.indexOf(itemStateInfo);

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
            _menuElementInfos.forEach((menuElementInfo:MenuElementInfo) => {
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

        rebuildMenuList(true);
    }

    function processItemStateInfo(itemStateInfo: iItemStateInfo, filterBar: HTMLElement, 
        _menuElementInfos: MenuElementInfo[]): void {

        let filterButton: HTMLButtonElement = createFilterButton(
            itemStateInfo.stateFilterButtonClass, itemStateInfo.buttonTitle, (e: MouseEvent) => { onItemStateFilterButtonClicked(e, itemStateInfo); });
        filterButton.disabled = true;
        filterBar.appendChild(filterButton);

        _menuElementInfos.forEach((menuElementInfo:MenuElementInfo) => {
            itemStateInfo.wireUp(menuElementInfo.domElement,
                (active: boolean)=>setItemStateActive(active, itemStateInfo, filterButton, menuElementInfo));
        });
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
    function setClassOnMenuItem(menuElement:MenuElementInfo, classThisItem: string): void {
        menuElement.menuElement.classList.add(classThisItem);
    }

    // Sets the bigformmenu-is-visible of an item.
    // Note that this doesn't reset the bigformmenu-is-visible etc. classes of items that are not visible.
    function setVisibility(menuElement: MenuElementInfo, setIt: boolean = true): void {
        setClass(menuElement.menuElement, 'bigformmenu-is-visible', setIt);
    }

    function removeVisibilityForMenu(): void {
        let count = _menuElementInfos.length;
        for(let i = 0; i < count; i++) {
            _menuElementInfos[i].menuElement.classList.remove('bigformmenu-is-visible');
        }
    }

    // Returns true if the menuElementInfo has passed any filters, and it is not hidden
    // because any of its parents is closed.
    // Even if this returns true, the element could still be invisible because scrolled out of the
    // visible area of the menu.
    function elementIsShownInMenu(menuElementInfo: MenuElementInfo): boolean {
        if (!menuElementInfo.isIncludedInMenu) { return false; }

        for(let e = menuElementInfo.parent; e && (e !== _menuElementInfosRoot); e = e.parent) {
            if (!e.isExpanded) { return false; }
        }

        return true;
    }

    function elementIsHeader(menuElementInfo: MenuElementInfo): boolean {
        return (menuElementInfo.level < _levelNonHeadingMenuItem);
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

    // If given menu item is not visible inside the menu, scrolls the menu so the item
    // shows at the top.
    function menuItemMakeVisibleAtTop(menuElementInfo: MenuElementInfo): void {
        if (!menuItemIsVisible(menuElementInfo)) {
            _mainUlElement.scrollTop = menuElementInfo.menuElement.offsetTop;
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
            _mainUlElement.scrollTop = newOffsetTop;
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

        for(let i = 0; i < count; i++) {
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

    // Finds out if the menu element in the menuElementInfo passes the search filter.
    // If so, updates the caption to highlight the matched bit and returns true.
    // Otherwise returns false.
    function passesSearchFilter(menuElementInfo: MenuElementInfo): boolean {
        const captionElement = getCaptionElement(menuElementInfo);

        // Restore the caption to its original state
        captionElement.innerHTML = menuElementInfo.caption;
        menuElementInfo.menuElement.classList.remove('bigformmenu-is-textmatch');

        if (!searchFilterIsActive()) {
            return true;
        }

        const filterValueLc = _searchTerm.toLowerCase();
        const foundIndex = menuElementInfo.caption.toLowerCase().indexOf(filterValueLc);

        // If there is no match, return
        if (foundIndex === -1) {
            return false;
        }

        const captionWithFilterTextSpan = insertMatchingFilterTextSpan(
            menuElementInfo.caption, foundIndex, filterValueLc.length);
        captionElement.innerHTML = captionWithFilterTextSpan;

        menuElementInfo.menuElement.classList.add('bigformmenu-is-textmatch');

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
        ulElement.classList.add('bigformmenu-top-menuitems');

        for(let i = 0; i < menuElementInfo.children.length; i++) {
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
        let hasChildren = (ulElement.children.length > 0);

        setClass(menuElementInfo.menuElement, 'bigformmenu-has-children', hasChildren);

        if ((!passesSearchFilter(menuElementInfo)) && (!hasChildren)) { return null; }
        if ((!passesItemStateFilters(menuElementInfo)) && (!hasChildren)) { return null; }
        if ((!elementIsDisplayed(menuElementInfo.domElement)) && (!hasChildren)) { return null; }

        let liElement: HTMLLIElement = document.createElement("li");
        liElement.appendChild(menuElementInfo.menuElement);

        if (hasChildren) {
            liElement.appendChild(ulElement);

            setClass(menuElementInfo.menuElement, "bigformmenu-item-open", menuElementInfo.isExpanded)
        }

        return liElement;
    }

    // Debounces calls to a method.
    // timerId - store this between calls. Will be updated by the method. Initialise to a { id: 0 }
    // bounceMs - the method will not be called more often than once every bounceMs milliseconds.
    // callback - method to be called.
    function debounce(timerId: { id: number }, bounceMs: number, callback: ()=>void) {
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

        rebuildMenuDebounceTimer.keepScroll &&= keepScroll;
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

                if (keepScroll) {
                    _mainUlElement.scrollTop = scrollBuffer;
                }
            } else {
                setVisibilityForMenuDirect();
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

            console.log('##########2  ' + i + ' = ' + entries[i].target.innerHTML + ' ' + (entries[i].isIntersecting ? 'showing' : 'hidden'));



            handleSingleIntersection(entries[i]);
        }
    }

    // Rebuild the menu list periodically, so when a dom element becomes visible or invisible somehow,
    // this gets reflected in the menu.
    // Ideally, this would use the Intersection Observer API, but this is not supported by IE11.
    function tick(): void {
        rebuildMenuList(true);
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

        _menuElementInfos = domElementsToMenuElements(allDomElements);
        setParents(_menuElementInfosRoot, { value:0}, _menuElementInfos);

        // Set _mainMenuElement early, because it will be used if setActive is called (part of itemStateInfo).
        // setActive may be called while the menu is being created.
        _mainMenuElement = createMainMenuElement();

        if (localStorage.getItem('bigformmenu-hidden')) {
            _mainMenuElement.classList.add('bigformmenu-hidden');
        }

        addMenuBody(_mainMenuElement, _menuElementInfos);

        setDimensionsFromLocalStorage();

        let bodyElement = document.getElementsByTagName("BODY")[0];
        bodyElement.appendChild(_mainMenuElement);

        storeMenuBottom();

        // IE11 does not support IntersectionObserver
        if (!!window.IntersectionObserver) {
            _intersectionObserver = new IntersectionObserver(intersectionHandler, { threshold: 1.0 });

            for (let i = 0; i < _menuElementInfos.length; i++) {
                _intersectionObserver.observe(_menuElementInfos[i].domElement);


                console.log('##########1  ' + i + ' = ' + _menuElementInfos[i].caption);
            }
        }

        document.addEventListener('scroll', function () {
            BigFormMenu.scrollHandler();
        }, {
            passive: true
        });

        // The resize event only gets triggered on the window object, and doesn't bubble.
        // See https://developer.mozilla.org/en-US/docs/Web/API/Window/resize_event
        window.addEventListener("resize", function () {
            BigFormMenu.resizeHandler();
        });

    //    setInterval(tick, 500);
    }
}
