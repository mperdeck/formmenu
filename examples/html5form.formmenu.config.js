///<reference path="formmenu.d.ts" />
// -----------------------------------
// Always load the formmenu.js file before any ...formmenu.config.js files
// -----------------------------------
var FormMenu;
(function (FormMenu) {
    var Html5ItemStateInfo = /** @class */ (function () {
        function Html5ItemStateInfo(onChangeMenuItemsWithItemStateExist, hasActiveStateClass, stateFilterActiveClass, stateFilterButtonClass, wireUp) {
            this.onChangeMenuItemsWithItemStateExist = onChangeMenuItemsWithItemStateExist;
            this.hasActiveStateClass = hasActiveStateClass;
            this.stateFilterActiveClass = stateFilterActiveClass;
            this.stateFilterButtonClass = stateFilterButtonClass;
            this.wireUp = wireUp;
        }
        return Html5ItemStateInfo;
    }());
    FormMenu.formMenuConfiguration.querySelector = "h1,h2,h3,h4,h5,h6,label";
    // if itemStateInfos is undefined, set it now
    if (!FormMenu.formMenuConfiguration.itemStateInfos) {
        FormMenu.formMenuConfiguration.itemStateInfos = {};
    }
    FormMenu.formMenuConfiguration.itemStateInfos["html5required"] = new Html5ItemStateInfo(null, 'formmenu-is-required', 'formmenu-required-filter-is-active', 'formmenu-required-filter-button', function (domElement, setActive) {
        if (domElement.tagName.toLowerCase() !== 'label') {
            return;
        }
        // DOES NOT WORK FOR select, textarea, etc.
        var labelElement = domElement;
        var inputElementId = labelElement.htmlFor;
        var inputElement = document.getElementById(inputElementId);
        setActive(inputElement.required);
    });
    FormMenu.formMenuConfiguration.itemStateInfos["html5invalid"] = new Html5ItemStateInfo(function (exist) {
        // Disable the save button if there are invalid input elements.
        // Note that when this callback starts getting called, the buttons will not yet be in the DOM,
        // so use the button returned in the wireUp method of the menuButtons object.
        if (FormMenu.menuSaveButton) {
            FormMenu.menuSaveButton.disabled = exist;
        }
    }, 'formmenu-is-invalid', 'formmenu-invalid-filter-is-active', 'formmenu-invalid-filter-button', function (domElement, setActive) {
        if (domElement.tagName.toLowerCase() !== 'label') {
            return;
        }
        var labelElement = domElement;
        var inputElementId = labelElement.htmlFor;
        var inputElement = document.getElementById(inputElementId);
        // DOES NOT WORK FOR select, textarea, etc.
        setActive(!inputElement.validity.valid);
        inputElement.addEventListener("input", function () {
            setActive(!inputElement.validity.valid);
        });
    });
})(FormMenu || (FormMenu = {}));
//# sourceMappingURL=html5form.formmenu.config.js.map