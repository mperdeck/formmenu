///<reference path="..\bigformmenu.d.ts" />

// -----------------------------------
// Always load the bigformmenu.js file before any ...bigformmenu.config.js files
// -----------------------------------

namespace BigFormMenu {
    export var bigFormMenuConfiguration: iBigFormMenuConfiguration;

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
    if (!bigFormMenuConfiguration.menuButtons) { bigFormMenuConfiguration.menuButtons = {}; }

    bigFormMenuConfiguration.menuButtons["saveButton"] = new MenuButton(
        'Save',
        ()=> { console.log('####### Save button clicked'); },
        'btn  btn-success btn-sm',
        (createdSaveButton)=>{ 
            menuSaveButton = createdSaveButton; 
        });

    bigFormMenuConfiguration.menuButtons["deleteButton"] = new MenuButton(
        'Delete',
        ()=> { console.log('####### Delete button clicked'); },
        'btn btn-danger btn-sm');

    bigFormMenuConfiguration.menuButtons["cancelButton"] = new MenuButton(
        'Cancel',
        ()=> { console.log('####### Cancel button clicked'); },
        'btn btn-link');
}


