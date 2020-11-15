///<reference path="formmenu.d.ts" />

// -----------------------------------
// Always load the formmenu.js file before any ...formmenu.config.js files
// -----------------------------------

namespace FormMenu {
    export var formMenuConfiguration: iFormMenuConfiguration;

    class MenuButton implements  iMenuButton {
        constructor(
            public caption: string,
            public onClick: ()=>void,
            public cssClass?: string,
            public wireUp?: (buttonElement: HTMLButtonElement)=>void
        ) {}
    }

    // if menuButtons is undefined, set it now
    if (!formMenuConfiguration.menuButtons) { formMenuConfiguration.menuButtons = {}; }

    formMenuConfiguration.menuButtons["saveButton"] = new MenuButton(
        'Save',
        ()=> { console.log('####### Save button clicked'); },
        'btn btn-save');

    formMenuConfiguration.menuButtons["cancelButton"] = new MenuButton(
        'Cancel',
        ()=> { console.log('####### Cancel button clicked'); });
}


