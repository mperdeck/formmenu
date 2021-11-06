///<reference path="..\formmenu.d.ts" />

// -----------------------------------
// Always load the formmenu.js file before any ...formmenu.config.js files
// -----------------------------------

namespace FormMenu {
    // Will hold reference to the Save button generated below the form
    export var menuSaveButton: HTMLButtonElement;

    export var formMenuConfiguration: iFormMenuConfiguration;

    formMenuConfiguration.domElementClasses = [
        // Note that HTML only has these heading tags. There is no h7, etc.
        { getItemCaption: null, level: 1, cssSelector: "h1" },
        { getItemCaption: null, level: 2, cssSelector: "h2" },
        { getItemCaption: null, level: 3, cssSelector: "h3" },
        { getItemCaption: null, level: 4, cssSelector: "h4" },
        { getItemCaption: null, level: 5, cssSelector: "h5" },
        { getItemCaption: null, level: 6, cssSelector: "h6" },
        { getItemCaption: null, level: 6, cssSelector: "label" }
    ];

    formMenuConfiguration.rebuildOnClickedSelector = "#show-hide-field2";

    // if itemStateInfos is undefined, set it now
    if (!formMenuConfiguration.itemStateInfos) { formMenuConfiguration.itemStateInfos = {}; }

    formMenuConfiguration.itemStateInfos["html5required"] = {
        onChangeMenuItemsWithItemStateExist: null,
        hasActiveStateClass: 'formmenu-is-required',
        stateFilterActiveClass: 'formmenu-required-filter-is-active',
        stateFilterButtonClass: 'formmenu-required-filter-button',
        stateNextButtonClass: 'formmenu-required-next-button',
        statePreviousButtonClass: 'formmenu-required-previous-button',
        buttonTitle: 'Required fields only',
        buttonTitleNext: 'Next required field',
        buttonTitlePrevious: 'Previous required field',
        wireUp: (domElement: HTMLElement, setActive: (active: boolean) => void) => {
            if (domElement.tagName.toLowerCase() !== 'label') { return; }
            let labelElement: HTMLLabelElement = domElement as HTMLLabelElement;
            let inputElementId = labelElement.htmlFor;

            if (inputElementId) {
                let inputElement: HTMLInputElement = document.getElementById(inputElementId) as HTMLInputElement;
                if (inputElement) {
                    setActive(inputElement.required);
                }
            }
        }
    };

    formMenuConfiguration.itemStateInfos["html5invalid"] = {
        onChangeMenuItemsWithItemStateExist: (exist: boolean)=> {
            // Disable the save button if there are invalid input elements.
            // Note that when this callback starts getting called, the buttons will not yet be in the DOM,
            // so use the button returned in the wireUp method of the menuButtons object.

            if (menuSaveButton) {
                menuSaveButton.disabled = exist;
            }
        },
        hasActiveStateClass: 'formmenu-is-invalid',
        stateFilterActiveClass: 'formmenu-invalid-filter-is-active',
        stateFilterButtonClass: 'formmenu-invalid-filter-button',
        stateNextButtonClass: 'formmenu-invalid-next-button',
        statePreviousButtonClass: 'formmenu-invalid-previous-button',
        buttonTitle: 'Invalid fields only',
        buttonTitleNext: 'Next invalid field',
        buttonTitlePrevious: 'Previous invalid field',
        wireUp: (domElement: HTMLElement, setActive: (active: boolean) => void) => {
            if (domElement.tagName.toLowerCase() !== 'label') { return; }

            let labelElement: HTMLLabelElement = domElement as HTMLLabelElement;
            let inputElementId = labelElement.htmlFor;
            if (inputElementId) {
                let inputElement: HTMLInputElement = document.getElementById(inputElementId) as HTMLInputElement;
                if (inputElement && inputElement.validity) {
                    setActive(!inputElement.validity.valid);

                    inputElement.addEventListener("input", function () {
                        setActive(!inputElement.validity.valid);
                    });
                }
            }
        }
     };
}


