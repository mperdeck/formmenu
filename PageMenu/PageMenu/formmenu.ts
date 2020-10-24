// "DOMContentLoaded" fires when the html has loaded, even if the stylesheets, javascript, etc are still being loaded.
// "load" fires when the entire page has loaded, including stylesheets, etc.

document.addEventListener("DOMContentLoaded", function(){
    FormMenu.pageLoadedHandler();
});

namespace FormMenu {
    let defaultConfiguration: any = {
        skipFirstHeading: false,
        defaultOpenAtLevel: 1,
        domItemHighlightPeriodMS: 500
    }

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
    }

    const levelNonHeadingMenuItem: number = 9000;

    function getConfigValue(itemName: string): any {
        // formMenuConfiguration may have been merged in (by loading the formmenu.config.js file)
        // First try to get the value from there. Otherwise get it from the default config.
        if (formMenuConfiguration && formMenuConfiguration[itemName]) {
            return formMenuConfiguration[itemName];
        }

        return defaultConfiguration[itemName]; 
    }

    // Returns all heading tags
    function getAllDomElements(): NodeListOf<Element> {
        // Note that HTML only has these heading tags. There is no h7, etc.
        let allDomElements = document.querySelectorAll("h1,h2,h3,h4,h5,h6");
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

        // If a menu item gets clicked, scroll the associated dom element into view
        // Also give it the formmenu-highlighted-dom-item for a short time, to point out where
        // it is.
        let onClickHandler = (e:MouseEvent)=>{
            domElement.scrollIntoView();
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

    function tagNameToLevel(tagName: string): number {
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

    function onExpandClicked(e:MouseEvent) {
        // See https://developer.mozilla.org/en-US/docs/Web/API/Event/currentTarget
        // currentTarget will return the span containing the caption.
        // Its parent is the div that also contains the span with the open/close icon.
        let parentDiv:HTMLElement = (<any>(e.currentTarget)).parentNode;

        if (parentDiv.classList.contains('formmenu-closed')) {
            parentDiv.classList.remove('formmenu-closed');
            parentDiv.classList.add('formmenu-open');
        } else if (parentDiv.classList.contains('formmenu-open')) {
            parentDiv.classList.remove('formmenu-open');
            parentDiv.classList.add('formmenu-closed');
        }
    }

    function createMenuElementDiv(caption: string, cssClass: string, onClickHandler: (e:MouseEvent)=>void): HTMLElement {
        let menuElement: HTMLElement = document.createElement("div");

        let expandElement: HTMLElement = document.createElement("span");
        expandElement.classList.add("formmenu-expand");
        expandElement.onclick = onExpandClicked;
        menuElement.appendChild(expandElement);

        let captionElement: HTMLElement = document.createElement("span");
        captionElement.classList.add("formmenu-caption");
        captionElement.innerText = caption;
        captionElement.onclick = onClickHandler;
        menuElement.appendChild(captionElement);

        menuElement.classList.add(cssClass);
        menuElement.classList.add("formmenu-item");

        return menuElement;
    }

    // Creates a <ul> tag containing a <li> tag for items in menuElementInfos.
    // The first li is for the item in menuElementInfos with index i.
    //
    // It goes forward through menuElementInfos until
    // 1) menuElementInfos is exhaused; or
    // 2) it finds an with the same level or lower as the one passed in. That item then won't be added to the ul.
    //
    // Note that i is an object containing a number. When the method returns, that number will have been
    // updated to the index + 1 of the last item in the list.
    function createList(level: number, i: { value:number}, menuElementInfos: MenuElementInfo[]): HTMLUListElement {
        let listElement: HTMLUListElement = document.createElement("ul");

        while((i.value < menuElementInfos.length) && (menuElementInfos[i.value].level > level)) {
            let liElement = createListItem(i, menuElementInfos);
            listElement.appendChild(liElement);
        }

        return listElement;
    }

    // Creates a <li> item for the item in menuElementInfos that is pointed at by index i.
    //
    // Note that i is an object containing a number. When the method returns, that number will have been
    // updated to the index + 1 of the last child of the item (or index + 1 of the item itself
    // if it doesn't have children).
    function createListItem(i: { value:number}, menuElementInfos: MenuElementInfo[]): HTMLLIElement {
        let currentMenuElementInfo = menuElementInfos[i.value];
        let listItemElement: HTMLLIElement = document.createElement("li");
        listItemElement.appendChild(currentMenuElementInfo.menuElement);
        let currentLevel = currentMenuElementInfo.level;

        // Point to first child item
        i.value = i.value + 1;

        let listElement: HTMLUListElement = createList(
            currentLevel, i, menuElementInfos);
        
        // Only append the ul with children if there actually are children
        if (listElement.children.length > 0) {
            listItemElement.appendChild(listElement);

            // If you appended the list (as in, the element has children), then also set
            // the formmenu-closed or formmenu-open class, so the element will have open/close icons.

            let openCloseClass = "formmenu-closed";
            let defaultOpenAtLevel: number = getConfigValue("defaultOpenAtLevel");

            if (currentMenuElementInfo.level <= defaultOpenAtLevel) {
                openCloseClass = "formmenu-open";
            }

            currentMenuElementInfo.menuElement.classList.add(openCloseClass);
        }

        return listItemElement;
    }

    function createMenu(menuElementInfos: MenuElementInfo[]): HTMLElement {
        let menuElement: HTMLElement = document.createElement("div");
        menuElement.className = 'formmenu';
        menuElement.id = 'formmenu';

        let topList: HTMLUListElement = createList(0, { value:0}, menuElementInfos);
        menuElement.appendChild(topList);

        return menuElement;
    }

    export function pageLoadedHandler(): void {
        let menuElement:HTMLElement = createMenu(domElementsToMenuElements(getAllDomElements()));
        let bodyElement = document.getElementsByTagName("BODY")[0];
        bodyElement.appendChild(menuElement);
    }
}
