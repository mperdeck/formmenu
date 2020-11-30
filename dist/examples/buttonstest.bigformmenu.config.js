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
        }
    };
    BigFormMenu.bigFormMenuConfiguration.menuButtons["deleteButton"] = {
        caption: 'Delete',
        onClick: function () { console.log('####### Delete button clicked'); },
        cssClass: 'btn btn-danger btn-sm'
    };
    BigFormMenu.bigFormMenuConfiguration.menuButtons["cancelButton"] = {
        caption: 'Cancel',
        onClick: function () { console.log('####### Cancel button clicked'); },
        cssClass: 'btn btn-link'
    };
})(BigFormMenu || (BigFormMenu = {}));
//# sourceMappingURL=buttonstest.bigformmenu.config.js.map