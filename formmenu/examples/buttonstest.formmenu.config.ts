///<reference path="..\formmenu.d.ts" />

// -----------------------------------
// Always load the formmenu.js file before any ...formmenu.config.js files
// -----------------------------------

namespace FormMenu {
    export var formMenuConfiguration: iFormMenuConfiguration;

    // Will hold reference to the Save button generated below the form
    export var menuSaveButton: HTMLButtonElement;

    // if menuButtons is undefined, set it now
    if (!formMenuConfiguration.menuButtons) { formMenuConfiguration.menuButtons = {}; }

    formMenuConfiguration.menuButtons["saveButton"] = {
        caption: 'Save',
        onClick: () => { console.log('####### Save button clicked'); },
        cssClass: 'btn  btn-success btn-sm',
        wireUp: (createdSaveButton) => {
            menuSaveButton = createdSaveButton;
            return true;
        }
    };

    formMenuConfiguration.menuButtons["duplicateButton"] = {
        caption: 'Duplicate',
        onClick: () => { console.log('####### Duplicate button clicked'); },
        cssClass: 'btn btn-primary btn-sm'
    };

    formMenuConfiguration.menuButtons["deleteButton"] = {
        caption: 'Delete',
        onClick: () => { console.log('####### Delete button clicked'); },
        cssClass: 'btn btn-danger btn-sm'
    };

    formMenuConfiguration.menuButtons["doNotShowButton"] = {
        caption: 'Do not show',
        onClick: () => { console.log('####### Do not show'); },
        wireUp: (createdSaveButton) => {
            return false;
        }
    };

    formMenuConfiguration.menuButtons["cancelButton"] = {
        caption: 'Cancel',
        onClick: () => { console.log('####### Cancel button clicked'); },
        cssClass: 'btn btn-link'
    }

    formMenuConfiguration.menuButtons["buttonsbar"] = {
        cssSelector: '.buttonsbar > button',
        wireUp: (createdSaveButton) => {
            createdSaveButton.className = createdSaveButton.className + ' btn-sm';
            return true;
        }
    }

    formMenuConfiguration.menuButtons["buttonsbar2"] = {
        cssSelector: '.buttonsbar2 > button',
        cssClass: 'btn btn-warning'
    }
}
