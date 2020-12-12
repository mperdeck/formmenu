///<reference path="..\bigformmenu.d.ts" />
// -----------------------------------
// Always load the bigformmenu.js file before any ...bigformmenu.config.js files
// -----------------------------------
var BigFormMenu;
(function (BigFormMenu) {
    BigFormMenu.bigFormMenuConfiguration.querySelector = "h1,h2,h3,h4,h5,h6,label";
    // if itemStateInfos is undefined, set it now
    if (!BigFormMenu.bigFormMenuConfiguration.itemStateInfos) {
        BigFormMenu.bigFormMenuConfiguration.itemStateInfos = {};
    }
    BigFormMenu.bigFormMenuConfiguration.itemStateInfos["html5required"] = {
        onChangeMenuItemsWithItemStateExist: null,
        hasActiveStateClass: 'bigformmenu-is-required',
        stateFilterActiveClass: 'bigformmenu-required-filter-is-active',
        stateFilterButtonClass: 'bigformmenu-required-filter-button',
        buttonTitle: 'Required fields only',
        wireUp: function (domElement, setActive) {
            if (domElement.tagName.toLowerCase() !== 'label') {
                return;
            }
            var labelElement = domElement;
            var inputElementId = labelElement.htmlFor;
            if (inputElementId) {
                var inputElement = document.getElementById(inputElementId);
                if (inputElement) {
                    setActive(inputElement.required);
                }
            }
        }
    };
    //bigFormMenuConfiguration.itemStateInfos["html5invalid"] = {
    //    onChangeMenuItemsWithItemStateExist: (exist: boolean)=> {
    //        // Disable the save button if there are invalid input elements.
    //        // Note that when this callback starts getting called, the buttons will not yet be in the DOM,
    //        // so use the button returned in the wireUp method of the menuButtons object.
    //        if (menuSaveButton) {
    //            menuSaveButton.disabled = exist;
    //        }
    //    },
    //    hasActiveStateClass: 'bigformmenu-is-invalid',
    //    stateFilterActiveClass: 'bigformmenu-invalid-filter-is-active',
    //    stateFilterButtonClass: 'bigformmenu-invalid-filter-button',
    //    buttonTitle: 'Invalid fields only',
    //    wireUp: (domElement: HTMLElement, setActive: (active: boolean) => void) => {
    //        if (domElement.tagName.toLowerCase() !== 'label') { return; }
    //        let labelElement: HTMLLabelElement = domElement as HTMLLabelElement;
    //        let inputElementId = labelElement.htmlFor;
    //        if (inputElementId) {
    //            let inputElement: HTMLInputElement = document.getElementById(inputElementId) as HTMLInputElement;
    //            if (inputElement && inputElement.validity) {
    //                setActive(!inputElement.validity.valid);
    //                inputElement.addEventListener("input", function () {
    //                    setActive(!inputElement.validity.valid);
    //                });
    //            }
    //        }
    //    }
    // };
})(BigFormMenu || (BigFormMenu = {}));
//# sourceMappingURL=html5form.bigformmenu.config.js.map