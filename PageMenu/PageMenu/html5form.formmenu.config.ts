///<reference path="formmenu.d.ts" />

// -----------------------------------
// Always load the formmenu.js file before any ...formmenu.config.js files
// -----------------------------------

namespace FormMenu {
    export var formMenuConfiguration: iFormMenuConfiguration;

    class Html5ItemStateInfo implements  iItemStateInfo {
        constructor(
            public hasActiveStateClass: string,
            public hasChildWithActiveStateClass: string,
            public stateFilterActiveClass: string,
            public stateFilterButtonClass: string,
            public wireUp: (domElement: HTMLElement, setActive: (active: boolean)=>void)=>void
        ) {}
    }

    formMenuConfiguration.querySelector = "h1,h2,h3,h4,h5,h6,label";

    // if itemStateInfos is undefined, set it now
    if (!formMenuConfiguration.itemStateInfos) { formMenuConfiguration.itemStateInfos = {}; }

    formMenuConfiguration.itemStateInfos["html5required"] = new Html5ItemStateInfo(
        'formmenu-is-required', 'formmenu-is-parent-of-required', 
        'formmenu-required-filter-is-active', 'formmenu-required-filter-button', 
        (domElement: HTMLElement, setActive: (active: boolean)=>void)=> {
            if (domElement.tagName.toLowerCase() !== 'label') { return; }

            let labelElement: HTMLLabelElement = domElement as HTMLLabelElement;
            let inputElementId = labelElement.htmlFor;
            let inputElement: HTMLInputElement = document.getElementById(inputElementId) as HTMLInputElement;
            setActive(inputElement.required);
        });
}


