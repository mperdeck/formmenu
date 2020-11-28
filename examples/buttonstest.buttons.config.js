///<reference path="formmenu.d.ts" />
// -----------------------------------
// Always load the formmenu.js file before any ...formmenu.config.js files
// -----------------------------------
var FormMenu;
(function (FormMenu) {
    var MenuButton = /** @class */ (function () {
        function MenuButton(caption, onClick, cssClass, wireUp) {
            this.caption = caption;
            this.onClick = onClick;
            this.cssClass = cssClass;
            this.wireUp = wireUp;
        }
        return MenuButton;
    }());
    // if menuButtons is undefined, set it now
    if (!FormMenu.formMenuConfiguration.menuButtons) {
        FormMenu.formMenuConfiguration.menuButtons = {};
    }
    FormMenu.formMenuConfiguration.menuButtons["saveButton"] = new MenuButton('Save', function () { console.log('####### Save button clicked'); }, 'btn btn-save', function (createdSaveButton) {
        FormMenu.menuSaveButton = createdSaveButton;
    });
    FormMenu.formMenuConfiguration.menuButtons["cancelButton"] = new MenuButton('Cancel', function () { console.log('####### Cancel button clicked'); });
})(FormMenu || (FormMenu = {}));
//# sourceMappingURL=buttonstest.buttons.config.js.map