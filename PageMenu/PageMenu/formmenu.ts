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
        // The item in the menu
        menuElement: HTMLElement;

        // The heading, etc. in the actual DOM (not in the menu)
        domElement: HTMLElement;

        // Caption of the menu element
        caption: string;
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
        return null;
    }

    function createMenuElement(caption: string, cssClass: string): HTMLElement {
        return null;

    }

    function createMenu(menuElementInfos: MenuElementInfo[]): HTMLElement {
        return null;
    }

    export function pageLoadedHandler(): void {
            console.log(555);

        let x = domElementsToMenuElements(getAllDomElements());


    }

}
