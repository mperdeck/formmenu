///<reference path="..\bigformmenu.d.ts" />

// -----------------------------------
// Always load the bigformmenu.js file before any ...bigformmenu.config.js files
// -----------------------------------

namespace BigFormMenu {
    export var bigFormMenuConfiguration: iBigFormMenuConfiguration;

    // Will hold reference to the Save button generated below the form
    export var menuSaveButton: HTMLButtonElement;

    // if menuButtons is undefined, set it now
    if (!bigFormMenuConfiguration.menuButtons) { bigFormMenuConfiguration.menuButtons = {}; }

    bigFormMenuConfiguration.menuButtons["saveButton"] = {
        caption: 'Save',
        onClick: () => { console.log('####### Save button clicked'); },
        cssClass: 'btn  btn-success btn-sm',
        wireUp: (createdSaveButton) => {
            menuSaveButton = createdSaveButton;
            return true;
        }
    };

    bigFormMenuConfiguration.menuButtons["duplicateButton"] = {
        caption: 'Duplicate',
        onClick: () => { console.log('####### Duplicate button clicked'); },
        cssClass: 'btn btn-primary btn-sm'
    };

    bigFormMenuConfiguration.menuButtons["deleteButton"] = {
        caption: 'Delete',
        onClick: () => { console.log('####### Delete button clicked'); },
        cssClass: 'btn btn-danger btn-sm'
    };

    bigFormMenuConfiguration.menuButtons["doNotShowButton"] = {
        caption: 'Do not show',
        onClick: () => { console.log('####### Do not show'); },
        wireUp: (createdSaveButton) => {
            return false;
        }
    };

    bigFormMenuConfiguration.menuButtons["cancelButton"] = {
        caption: 'Cancel',
        onClick: () => { console.log('####### Cancel button clicked'); },
        cssClass: 'btn btn-link'
    }
}
