// "DOMContentLoaded" fires when the html has loaded, even if the stylesheets, javascript, etc are still being loaded.
// "load" fires when the entire page has loaded, including stylesheets, etc.

document.addEventListener("DOMContentLoaded", function(){

    FormMenu.pageLoadedHandler();

    console.log('page has loaded');

    var list = document.querySelector('#list')
    var fruits = ['Apple', 'Orange', 'Banana', 'Melon']
    
    var fragment = new DocumentFragment()
    
    fruits.forEach(function (fruit) {
      var li = document.createElement('li')
      li.innerHTML = fruit
      fragment.appendChild(li)
    })
    
    list.appendChild(fragment)



});




namespace FormMenu {
    class MenuElementInfo {

        constructor(
            // The item in the menu
            public menuElement: HTMLElement,

            // The heading, etc. in the actual DOM (not in the menu)
            public domElement: HTMLElement,

            // Caption of the menu element
            public caption: string
        ) {}
    }

    let menuElementInfos: MenuElementInfo[];

    function getAllDomElements(): NodeListOf<Element> {
        let allDomElements = document.querySelectorAll("h1,h2,h3,h4,h5,h6");
        return allDomElements;
    }

    function domElementsToMenuElements(domElements: NodeListOf<Element>): MenuElementInfo[] {
        let menuElementInfos: MenuElementInfo[] = [];

        domElements.forEach((value: Element)=>{
            menuElementInfos.push(domElementToMenuElement(value as HTMLElement));
        });

        return menuElementInfos;
    }

    function domElementToMenuElement(domElement: HTMLElement): MenuElementInfo {
        let menuElementClass = 'formmenu-' + domElement.tagName;
        let caption = domElement.innerText;

        let menuElementInfo = new MenuElementInfo(
            createMenuElement(caption, menuElementClass),
            domElement,
            caption);

        return menuElementInfo;
    }

    function createMenuElement(caption: string, cssClass: string): HTMLElement {
        let menuElement: HTMLElement = document.createElement("div");
        menuElement.innerText = caption;
        menuElement.classList.add(cssClass);
        menuElement.classList.add("formmenu-item");

        return menuElement;
    }

    function createMenu(menuElementInfos: MenuElementInfo[]): HTMLElement {
        let menuElement: HTMLElement = document.createElement("div");
        menuElement.className = 'formmenu';
        menuElement.id = 'formmenu';

        menuElementInfos.map((menuElementInfo: MenuElementInfo)=> {
            menuElement.appendChild(menuElementInfo.menuElement);
        });

        return menuElement;
    }

    export function pageLoadedHandler(): void {
            console.log(555);

        let menuElement:HTMLElement = createMenu(domElementsToMenuElements(getAllDomElements()));
        let bodyElement = document.getElementsByTagName("BODY")[0];
        bodyElement.appendChild(menuElement);
    }
}
