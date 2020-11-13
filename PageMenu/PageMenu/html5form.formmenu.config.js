///<reference path="formmenu.d.ts" />
// -----------------------------------
// Always load the formmenu.js file before any ...formmenu.config.js files
// -----------------------------------
var FormMenu;
(function (FormMenu) {
    var Html5ItemStateInfo = /** @class */ (function () {
        function Html5ItemStateInfo(hasActiveStateClass, hasChildWithActiveStateClass, stateFilterActiveClass, stateFilterButtonClass, wireUp) {
            this.hasActiveStateClass = hasActiveStateClass;
            this.hasChildWithActiveStateClass = hasChildWithActiveStateClass;
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
    FormMenu.formMenuConfiguration.itemStateInfos["html5required"] = new Html5ItemStateInfo('formmenu-is-required', 'formmenu-is-parent-of-required', 'formmenu-required-filter-is-active', 'formmenu-required-filter-button', function (domElement, setActive) {
        if (domElement.tagName.toLowerCase() !== 'label') {
            return;
        }
        // DOES NOT WORK FOR select, textarea, etc.
        var labelElement = domElement;
        var inputElementId = labelElement.htmlFor;
        var inputElement = document.getElementById(inputElementId);
        setActive(inputElement.required);
    });
    FormMenu.formMenuConfiguration.itemStateInfos["html5invalid"] = new Html5ItemStateInfo('formmenu-is-invalid', 'formmenu-is-parent-of-invalid', 'formmenu-invalid-filter-is-active', 'formmenu-invalid-filter-button', function (domElement, setActive) {
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