///<reference path="..\bigformmenu.d.ts" />

// -----------------------------------
// Always load the formmenu.js file before any ...formmenu.config.js files
// -----------------------------------

namespace FormMenu {
    export var formMenuConfiguration: iFormMenuConfiguration;

    // Will hold reference to the Save button generated below the form
    export var menuSaveButton: HTMLButtonElement;

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
        'btn  btn-success btn-sm',
        (createdSaveButton)=>{ 
            menuSaveButton = createdSaveButton; 
        });

    formMenuConfiguration.menuButtons["deleteButton"] = new MenuButton(
        'Delete',
        ()=> { console.log('####### Delete button clicked'); },
        'btn btn-danger btn-sm');

    formMenuConfiguration.menuButtons["cancelButton"] = new MenuButton(
        'Cancel',
        ()=> { console.log('####### Cancel button clicked'); },
        'btn btn-link');
}


