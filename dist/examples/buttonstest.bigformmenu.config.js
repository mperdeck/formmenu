///<reference path="..\bigformmenu.d.ts" />
// -----------------------------------
// Always load the bigformmenu.js file before any ...bigformmenu.config.js files
// -----------------------------------
var BigFormMenu;
(function (BigFormMenu) {
    // if menuButtons is undefined, set it now
    if (!BigFormMenu.bigFormMenuConfiguration.menuButtons) {
        BigFormMenu.bigFormMenuConfiguration.menuButtons = {};
    }
    BigFormMenu.bigFormMenuConfiguration.menuButtons["saveButton"] = {
        caption: 'Save',
        onClick: function () { console.log('####### Save button clicked'); },
        cssClass: 'btn  btn-success btn-sm',
        wireUp: function (createdSaveButton) {
            BigFormMenu.menuSaveButton = createdSaveButton;
            return true;
        }
    };
    BigFormMenu.bigFormMenuConfiguration.menuButtons["duplicateButton"] = {
        caption: 'Duplicate',
        onClick: function () { console.log('####### Duplicate button clicked'); },
        cssClass: 'btn btn-primary btn-sm'
    };
    BigFormMenu.bigFormMenuConfiguration.menuButtons["deleteButton"] = {
        caption: 'Delete',
        onClick: function () { console.log('####### Delete button clicked'); },
        cssClass: 'btn btn-danger btn-sm'
    };
    BigFormMenu.bigFormMenuConfiguration.menuButtons["doNotShowButton"] = {
        caption: 'Do not show',
        onClick: function () { console.log('####### Do not show'); },
        wireUp: function (createdSaveButton) {
            return false;
        }
    };
    BigFormMenu.bigFormMenuConfiguration.menuButtons["cancelButton"] = {
        caption: 'Cancel',
        onClick: function () { console.log('####### Cancel button clicked'); },
        cssClass: 'btn btn-link'
    };
    BigFormMenu.bigFormMenuConfiguration.menuButtons["buttonsbar"] = {
        cssSelector: '.buttonsbar > button',
        wireUp: function (createdSaveButton) {
            createdSaveButton.className = createdSaveButton.className + ' btn-sm';
            return true;
        }
    };
    BigFormMenu.bigFormMenuConfiguration.menuButtons["buttonsbar2"] = {
        cssSelector: '.buttonsbar2 > button',
        cssClass: 'btn btn-warning'
    };
})(BigFormMenu || (BigFormMenu = {}));
//# sourceMappingURL=buttonstest.bigformmenu.config.js.map