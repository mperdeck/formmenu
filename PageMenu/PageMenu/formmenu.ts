///<reference path="formmenu.d.ts" />

// "DOMContentLoaded" fires when the html has loaded, even if the stylesheets, javascript, etc are still being loaded.
// "load" fires when the entire page has loaded, including stylesheets, etc.

document.addEventListener("DOMContentLoaded", function(){
    FormMenu.pageLoadedHandler();
});

document.addEventListener('scroll', function () {
    FormMenu.scrollHandler();
}, {
    passive: true
});

// The resize event only gets triggered on the window object, and doesn't bubble.
// See https://developer.mozilla.org/en-US/docs/Web/API/Window/resize_event
window.addEventListener("resize", function(){
    FormMenu.resizeHandler();
});

namespace FormMenu {
    let defaultConfiguration: iFormMenuConfiguration = {
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
    }

    // Create empty formMenuConfiguration here, to make it easier to write
    // ...formmenu.config.js files that set properties on this object.
    //
    // Do not use let here, because that doesn't allow you to declare a variable 
    // multiple times.
    export var formMenuConfiguration: iFormMenuConfiguration = {};

    class MenuElementInfo {

        constructor(
            // The item in the menu
            public menuElement: HTMLElement,

            // The heading, etc. in the actual DOM (not in the menu)
            public domElement: HTMLElement,

            // Caption of the menu element
            public caption: string,

            // Level of the menu item. For example, a H1 has level 1, H2 has level 2.
            // Menu items that are not associated with a heading have a very high level.
            public level: number
        ) {}

        // Headings constitute a hierarchy. An H2 below an H1 is the child of that H1.
        // non-headings are children of the heading they sit under.
        public parent: MenuElementInfo;
    }

    let menuElementInfos: MenuElementInfo[];

    // The div that contains the entire menu
    let mainMenuElement:HTMLElement;

    const levelNonHeadingMenuItem: number = 9000;

    function tagNameToLevelDefaultMethod(tagName: string): number {
        switch (tagName.toLowerCase()) {
            case 'h1': return 1;
            case 'h2': return 2;
            case 'h3': return 3;
            case 'h4': return 4;
            case 'h5': return 5;
            case 'h6': return 6;
            default: return levelNonHeadingMenuItem;
          }
    }

    function tagNameToLevel(tagName: string): number {
        let tagNameToLevelMethod: (tagName: string) => number = getConfigValue("tagNameToLevelMethod");
        let level:number = tagNameToLevelMethod(tagName);
        return level;
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
    function getAllDomElements(): NodeListOf<Element> {
        let querySelector: string = getConfigValue("querySelector");

        let allDomElements = document.querySelectorAll(querySelector);
        return allDomElements;
    }

    // Converts a list of heading tags to MenuElements.
    // Skips the first heading if config item skipFirstHeading is true.
    function domElementsToMenuElements(domElements: NodeListOf<Element>): MenuElementInfo[] {
        let menuElementInfos: MenuElementInfo[] = [];

        let includeElement: boolean = !getConfigValue("skipFirstHeading");

        domElements.forEach((value: Element)=>{
            if (includeElement) { menuElementInfos.push(domElementToMenuElement(value as HTMLElement)); }
            includeElement = true;
        });

        return menuElementInfos;
    }

    function domElementToMenuElement(domElement: HTMLElement): MenuElementInfo {
        let menuElementClass = 'formmenu-' + domElement.tagName;
        let caption = domElement.innerText;
        let domItemHighlightPeriodMS: number = getConfigValue("domItemHighlightPeriodMS");

        // If a menu item gets clicked, scroll the associated dom element into view if it is not already
        // visible. If it is already visible, do not scroll it.
        //
        // Also give it the formmenu-highlighted-dom-item for a short time, to point out where
        // it is.
        let onClickHandler = (e:MouseEvent)=>{

            if (!elementIsVisible(domElement)) {
                domElement.scrollIntoView();
            }

            domElement.classList.add('formmenu-highlighted-dom-item');
            setTimeout(function(){ domElement.classList.remove('formmenu-highlighted-dom-item'); }, domItemHighlightPeriodMS);
        };

        let level:number = tagNameToLevel(domElement.tagName);
        let menuElementInfo = new MenuElementInfo(
            createMenuElementDiv(caption, menuElementClass, onClickHandler),
            domElement,
            caption,
            level);

        return menuElementInfo;
    }

    // Sets the parent property in all elements in menuElementInfos.
    // parent: set to null
    // i: set to 0
    function setParents(parent: MenuElementInfo, i: { value:number}, menuElementInfos: MenuElementInfo[]): void {
        const parentLevel: number = parent ? parent.level : 0;

        while((i.value < menuElementInfos.length) && (menuElementInfos[i.value].level > parentLevel)) {

            let currentMenuElementInfo = menuElementInfos[i.value];
            currentMenuElementInfo.parent = parent;

            // Point to first potential child item
            i.value = i.value + 1;

            setParents(currentMenuElementInfo, i, menuElementInfos);
        }
    }

    // If the element has class1, sets class2 instead. And vice versa.
    function toggleClasses(htmlElement:HTMLElement, class1: string, class2: string): void {
        if (htmlElement.classList.contains(class1)) {
            htmlElement.classList.remove(class1);
            htmlElement.classList.add(class2);
        } else if (htmlElement.classList.contains(class2)) {
            htmlElement.classList.remove(class2);
            htmlElement.classList.add(class1);
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

    // Removes the given class from all given menu elements
    function removeClass(menuElementInfos: MenuElementInfo[], cssClass: string): void {
        menuElementInfos.forEach((menuElementInfo:MenuElementInfo) => {
            menuElementInfo.menuElement.classList.remove(cssClass);
        });
    }

    function parentOfEventTarget(e:MouseEvent): HTMLElement {
        // See https://developer.mozilla.org/en-US/docs/Web/API/Event/currentTarget
        // currentTarget will return the span containing the caption.

        let parent:HTMLElement = (<any>(e.currentTarget)).parentNode;
        return parent;
    }

    function hasChildren(menuElementInfo: MenuElementInfo): boolean {
        const classList:DOMTokenList = menuElementInfo.menuElement.classList;
        const result:boolean = (classList.contains('formmenu-item-closed') || classList.contains('formmenu-item-open'));
        return result;
    }

    // Returns if by default the menu item should be open, false otherwise.
    // levelConfigItemName - name of config item that has the level at which the item should be open
    function openByDefault(menuElementInfo: MenuElementInfo, levelConfigItemName: string): boolean {
        const levelConfig: number = getConfigValue(levelConfigItemName);
        const result = ((menuElementInfo.level <= levelConfig) || (levelConfig == -1));

        return result;
    }

    // If the menu item has oldClass, then replace that with newClass.
    // Otherwise to nothing.
    function transitionMenuItemHasClass(menuElementInfo: MenuElementInfo, oldClass: string, newClass: string): void {
        const classList:DOMTokenList = menuElementInfo.menuElement.classList;

        // Only do this if the item actually has this class!
        // Otherwise you may treat for example menu items that are not parents as parents.
        if (classList.contains(oldClass)) {
            classList.remove(oldClass);
            classList.add(newClass);
        }
    }

    function openMenuItem(menuElementInfo: MenuElementInfo): void {
        transitionMenuItemHasClass(menuElementInfo, 'formmenu-item-closed', 'formmenu-item-open');
    }

    function closeMenuItem(menuElementInfo: MenuElementInfo): void {
        transitionMenuItemHasClass(menuElementInfo, 'formmenu-item-open', 'formmenu-item-closed');
    }

    function onExpandClicked(e:MouseEvent) {
        // The span with the open/close icon element will have been clicked.
        // Its parent is the div that also contains the caption.

        let parentDiv:HTMLElement = parentOfEventTarget(e);

        toggleClasses(parentDiv, 'formmenu-item-closed', 'formmenu-item-open');
    }

    function createMenuElementDiv(caption: string, cssClass: string, onClickHandler: (e:MouseEvent)=>void): HTMLElement {
        let menuElement: HTMLElement = document.createElement("div");

        let expandElement: HTMLElement = document.createElement("span");
        expandElement.classList.add("formmenu-expand");
        expandElement.onclick = onExpandClicked;
        menuElement.appendChild(expandElement);

        let captionElement: HTMLElement = document.createElement("span");
        captionElement.classList.add("formmenu-caption");
        captionElement.innerHTML = caption;
        captionElement.onclick = onClickHandler;
        menuElement.appendChild(captionElement);

        menuElement.classList.add(cssClass);
        menuElement.classList.add("formmenu-item");

        return menuElement;
    }

    // Gets the span with the caption from a MenuElementInfo
    function getCaptionElement(menuElementInfo: MenuElementInfo): HTMLElement {
        const divElement: HTMLElement = menuElementInfo.menuElement;
        const captionSpanElement: HTMLElement = <HTMLElement>(divElement.children[1]);

        return captionSpanElement;
    }

    // Creates a <ul> tag containing a <li> tag for items in menuElementInfos.
    // The first li is for the item in menuElementInfos with index i.
    //
    // It goes forward through menuElementInfos until
    // 1) menuElementInfos is exhaused; or
    // 2) it finds a menuElementInfo with the same level or lower as the level of the parent. That item then won't be added to the ul.
    //
    // parent is the menu item that is the parent of the list items. Will be null when the very top level of menu items
    // is generated.
    //
    // Note that i is an object containing a number. When the method returns, that number will have been
    // updated to the index + 1 of the last item in the list.
    function createList(parent: MenuElementInfo, i: { value:number}, menuElementInfos: MenuElementInfo[]): HTMLUListElement {
        const level: number = parent ? parent.level : 0;
        let listElement: HTMLUListElement = document.createElement("ul");

        while((i.value < menuElementInfos.length) && (menuElementInfos[i.value].level > level)) {
            let liElement = createListItem(parent, i, menuElementInfos);
            listElement.appendChild(liElement);
        }

        return listElement;
    }

    // Creates a <li> item for the item in menuElementInfos that is pointed at by index i.
    //
    // Note that i is an object containing a number. When the method returns, that number will have been
    // updated to the index + 1 of the last child of the item (or index + 1 of the item itself
    // if it doesn't have children).
    function createListItem(parent: MenuElementInfo, i: { value:number}, menuElementInfos: MenuElementInfo[]): HTMLLIElement {
        let currentMenuElementInfo = menuElementInfos[i.value];
        currentMenuElementInfo.parent = parent;

        let listItemElement: HTMLLIElement = document.createElement("li");
        listItemElement.appendChild(currentMenuElementInfo.menuElement);

        // Point to first child item
        i.value = i.value + 1;

        let listElement: HTMLUListElement = createList(
            currentMenuElementInfo, i, menuElementInfos);
        
        // Only append the ul with children if there actually are children
        if (listElement.children.length > 0) {
            listItemElement.appendChild(listElement);

            // If you appended the list (as in, the element has children), then also set
            // the formmenu-item-closed or formmenu-item-open class, so the element will have open/close icons.

            let defaultOpen: boolean = openByDefault(currentMenuElementInfo, "defaultOpenAtLevel");
            let openCloseClass = defaultOpen ? "formmenu-item-open" : "formmenu-item-closed";

            currentMenuElementInfo.menuElement.classList.add(openCloseClass);
        }

        return listItemElement;
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
        const filterValue = (<HTMLInputElement>(e.currentTarget)).value;
        const filterMinimumCharacters: number = getConfigValue("filterMinimumCharacters");

        // Filter is active if there is a filter value, and there are enough filter characters.
        const filterIsActive = (filterValue && (filterValue.length >= filterMinimumCharacters));

        if (filterIsActive) {
            mainMenuElement.classList.add('formmenu-textmatch-filter-is-active');
        } else {
            mainMenuElement.classList.remove('formmenu-textmatch-filter-is-active');
        }

        menuElementInfos.forEach((menuElementInfo:MenuElementInfo) => {
            const captionElement = getCaptionElement(menuElementInfo);

            // Restore the caption to its original state
            captionElement.innerHTML = menuElementInfo.caption;
            menuElementInfo.menuElement.classList.remove('formmenu-is-textmatch');
            menuElementInfo.menuElement.classList.remove('formmenu-is-parent-of-textmatch');

            // If filter is not active, nothing more to do
            if (!filterIsActive) {
                return;
            }

            const filterValueLc = filterValue.toLowerCase();
            const foundIndex = menuElementInfo.caption.toLowerCase().indexOf(filterValueLc);

            // If there is no match, return
            if (foundIndex === -1) {
                return;
            }

            const captionWithFilterTextSpan = insertMatchingFilterTextSpan(
                menuElementInfo.caption, foundIndex, filterValueLc.length);

            captionElement.innerHTML = captionWithFilterTextSpan;

            setClassOnMenuItem(menuElementInfo, 'formmenu-is-textmatch', 'formmenu-is-parent-of-textmatch');
        });
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

        // onfilter fires when the little clear icon is clicked
        (<any>menuElement).onsearch = onChangeFilter;

        return menuElement;
    }

    function onMenuHideShowButtonClicked(e: MouseEvent): void {
        // The span with the hide/show will have been clicked.
        // Its parent is the formmenu div.

        let parentDiv:HTMLElement = parentOfEventTarget(e);

        toggleClasses(parentDiv, 'formmenu-hidden', 'formmenu-shown');
    }

    function onExpandAllMenuClicked(e: MouseEvent): void {
        menuElementInfos.forEach((menuElementInfo:MenuElementInfo) => {
            openMenuItem(menuElementInfo);
        });
    }

    function onCollapseAllMenuClicked(e: MouseEvent): void {
        menuElementInfos.forEach((menuElementInfo:MenuElementInfo) => {
            let defaultOpen: boolean = openByDefault(menuElementInfo, "collapseOpenAtLevel");

            // Close the items above the "collapseOpenAtLevel" level
            // Leave alone those items that could be opened. That way, if the user has closed
            // more items than this method would close, clicking collapse won't lead to actually
            // items being opened.

            if (!defaultOpen) {
                closeMenuItem(menuElementInfo);
            }
        });
    }

    // Add a filter button to the filter bar (the bit of space left of the filter).
    // cssClass - css class of the span representing the button.
    // onClickHandler - runs when button is clicked.
    // showHideConfigName - name of a config item. If blank, button is always created.
    //                      If not blank, config item has to be true for button to be created.
    // parent - filter button will be added to this element.
    //
    function addFilterButton(cssClass: string, onClickHandler: (e: MouseEvent) => void,
        showHideConfigName: string, parent: HTMLElement) {

        let showButton: boolean = true;
        
        if (showHideConfigName) {
            showButton = getConfigValue(showHideConfigName);
        }
        
        if (!showButton) {
            return;
        }

        let filterButton: HTMLElement = createFilterButton(cssClass, onClickHandler);
        parent.appendChild(filterButton);
    }

    function createFilterButton(cssClass: string, onClickHandler: (e: MouseEvent) => void): HTMLElement {
        let filterButton: HTMLElement = document.createElement("span");
        filterButton.classList.add(cssClass);
        filterButton.classList.add('formmenu-filter-button');
        filterButton.onclick = onClickHandler;

        return filterButton;
    }

    function createMainMenuElement(): HTMLElement {
        let menuElement: HTMLElement = document.createElement("div");
        menuElement.classList.add('formmenu');
        menuElement.classList.add('formmenu-shown');
        menuElement.id = 'formmenu';

        return menuElement;
    }

    function addMenuBody(mainMenuElement: HTMLElement, menuElementInfos: MenuElementInfo[]): void {

        // Create topList first, because this also sets the parent properties on the menuElementInfos,
        // which is needed probably for the setActive method called when Item State Infos are processed.
        let topList: HTMLUListElement = createList(null, { value:0}, menuElementInfos);

        addFilterButton('formmenu-menu-hide-show', onMenuHideShowButtonClicked,
            "showMenuHideShowButton", mainMenuElement);

        let filterBar: HTMLElement = document.createElement("span");
        filterBar.classList.add('formmenu-filter-bar');

        addFilterButton('formmenu-expand-all-menu-button', onExpandAllMenuClicked,
            "showExpandAllMenuButton", filterBar);

        addFilterButton('formmenu-collapse-all-menu-button', onCollapseAllMenuClicked,
            "showCollapseAllMenuButton", filterBar);

        processAllItemStateInfos(filterBar, menuElementInfos);

        let showFilterInput: boolean = getConfigValue("showFilterInput");
        if (showFilterInput) {
            let filterInput = createFilterInput();
            filterBar.appendChild(filterInput);
        }

        mainMenuElement.appendChild(filterBar);
        mainMenuElement.appendChild(topList);
    }

    // Visits all item state infos, processes the menu element infos for each
    // and adds a filter button for each to the passed in filter bar. 
    function processAllItemStateInfos(filterBar: HTMLElement, menuElementInfos: MenuElementInfo[]): void {
        let itemStateInfos: { [key: string]: iItemStateInfo} = getConfigValue("itemStateInfos");

        Object.keys(itemStateInfos).forEach(key => {
            processItemStateInfo(itemStateInfos[key], filterBar, menuElementInfos);
        });
    }

    function onItemStateFilterButtonClicked(e: MouseEvent, itemStateInfo: iItemStateInfo): void {
        let clickedElement:HTMLElement = (<any>(e.currentTarget));
        if (clickedElement.classList.contains('formmenu-filter-button-disabled')) { return; }

        toggleClass(mainMenuElement, itemStateInfo.stateFilterActiveClass);
    }

    function setItemStateActive(active: boolean, itemStateInfo: iItemStateInfo, filterButton: HTMLElement, 
        menuElementInfo: MenuElementInfo): void {

        if (active) {
            menuElementInfo.menuElement.classList.add(itemStateInfo.hasActiveStateClass);
        } else {
            menuElementInfo.menuElement.classList.remove(itemStateInfo.hasActiveStateClass);
        }

        // Always redo the parent classes each time an item is set active/inactive.
        // You cannot do this for one item, because the parent of a newly inactive item may
        // also be the parent of another item that is still active.

        removeClass(menuElementInfos, itemStateInfo.hasChildWithActiveStateClass);

        let existsActiveItem = false;

        menuElementInfos.forEach((menuElementInfo:MenuElementInfo) => {
            if (menuElementInfo.menuElement.classList.contains(itemStateInfo.hasActiveStateClass)) {
                existsActiveItem = true;
                setClassOnMenuItemParents(menuElementInfo, itemStateInfo.hasChildWithActiveStateClass);
            }
        });

        if (existsActiveItem) {
            filterButton.classList.remove('formmenu-filter-button-disabled');
        } else {
            filterButton.classList.add('formmenu-filter-button-disabled');
            mainMenuElement.classList.remove(itemStateInfo.stateFilterActiveClass);
        }
    }

    function processItemStateInfo(itemStateInfo: iItemStateInfo, filterBar: HTMLElement, 
        menuElementInfos: MenuElementInfo[]): void {

        let filterButton: HTMLElement = createFilterButton(
            itemStateInfo.stateFilterButtonClass, (e: MouseEvent) => { onItemStateFilterButtonClicked(e, itemStateInfo); });
        filterButton.classList.add('formmenu-filter-button-disabled');
        filterBar.appendChild(filterButton);

        menuElementInfos.forEach((menuElementInfo:MenuElementInfo) => {
            itemStateInfo.wireUp(menuElementInfo.domElement,
                (active: boolean)=>setItemStateActive(active, itemStateInfo, filterButton, menuElementInfo));
        });
    }

    function elementIsVisible(element: HTMLElement): boolean {
        const boundingRectangle = element.getBoundingClientRect();
        return (
            (boundingRectangle.top >= 0) &&
            (boundingRectangle.left >= 0) &&
            (boundingRectangle.bottom <= (window.innerHeight || document.documentElement.clientHeight)) &&
            (boundingRectangle.right <= (window.innerWidth || document.documentElement.clientWidth))
        );
    }

    // Sets a class on this menu item, and another class on the parent of the item, its parents, etc.
    function setClassOnMenuItem(menuElement:MenuElementInfo, classThisItem: string, classParents: string): void {
        menuElement.menuElement.classList.add(classThisItem);
        setClassOnMenuItemParents(menuElement, classParents);
    }

    // Sets a class on the parent of the given item, its parents, etc.
    function setClassOnMenuItemParents(menuElement:MenuElementInfo, classParents: string): void {

        let currentElement = menuElement.parent;
        while(currentElement) {
            // If the class for parents has already been set on a parent, it will have been set on that
            // parent's parents as well. So can stop here.

            if (currentElement.menuElement.classList.contains(classParents)) { break; }
            currentElement.menuElement.classList.add(classParents);
            
            currentElement = currentElement.parent;
        }
    }

    // Removes a class on this menu item, and another class on the parent of the item, its parents, etc.
    function removeClassFromMenuItem(menuElement:MenuElementInfo, classThisItem: string, classParents: string): void {
        menuElement.menuElement.classList.remove(classThisItem);

        let currentElement = menuElement.parent;
        while(currentElement) {
            currentElement.menuElement.classList.remove(classParents);
            currentElement = currentElement.parent;
        }
    }

    // Sets the formmenu-is-visible of an item, and the formmenu-is-parent-of-visible
    // class on its parents.
    // Note that this doesn't reset the formmenu-is-visible etc. classes of items that are not visible.
    function setVisibility(menuElement:MenuElementInfo): void {
        setClassOnMenuItem(menuElement, 'formmenu-is-visible', 'formmenu-is-parent-of-visible');
    }

    function removeVisibilityForMenu(): void {
        let count = menuElementInfos.length;
        for(let i = 0; i < count; i++) {
            menuElementInfos[i].menuElement.classList.remove('formmenu-is-visible');
            menuElementInfos[i].menuElement.classList.remove('formmenu-is-parent-of-visible');
        }
    }

    function setVisibilityForMenu(): void {
        if (!menuElementInfos) { return; }

        removeVisibilityForMenu();
        let count = menuElementInfos.length;
        let lastWasVisible = false;

        for(let i = 0; i < count; i++) {
            let currrentMenuElementInfo = menuElementInfos[i];
            let isVisible = elementIsVisible(currrentMenuElementInfo.domElement);

            // If we just got past the items that were visible, then the rest will be invisible,
            // so no need to visit any more items.
            if (lastWasVisible && !isVisible) { break; }
            lastWasVisible = isVisible;
            
            if (isVisible) {
                setVisibility(currrentMenuElementInfo);
            }
        }
    }

    export function scrollHandler(): void {
        setVisibilityForMenu();
    }

    export function resizeHandler(): void {
        setVisibilityForMenu();
    }

    export function pageLoadedHandler(): void {
        menuElementInfos = domElementsToMenuElements(getAllDomElements());
        setParents(null, { value:0}, menuElementInfos);

        // Set mainMenuElement early, because it will be used if setActive is called (part of itemStateInfo).
        // setActive may be called while the menu is being created.
        mainMenuElement = createMainMenuElement();

        addMenuBody(mainMenuElement, menuElementInfos);

        setVisibilityForMenu();

        let bodyElement = document.getElementsByTagName("BODY")[0];
        bodyElement.appendChild(mainMenuElement);
    }
}
