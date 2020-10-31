///<reference path="formmenu.d.ts" />

// -----------------------------------
// Always load the formmenu.js file before any ...formmenu.config.js files
// -----------------------------------

namespace FormMenu {
    export var formMenuConfiguration: iFormMenuConfiguration;

    class Html5ItemStateInfo implements  iItemStateInfo {
        wireUp: (domElement: HTMLElement, setActive: ()=>void, setInactive: ()=>void)=>void;

        cssClass: string;
    }

    formMenuConfiguration.querySelector = "h1,h2,h3,h4,h5,h6,label";
    formMenuConfiguration.itemStateInfos["html5form"] = new Html5ItemStateInfo();
}


