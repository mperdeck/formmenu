///<reference path="..\bigformmenu.d.ts" />

// -----------------------------------
// Always load the bigformmenu.js file before any ...bigformmenu.config.js files
// -----------------------------------

namespace BigFormMenu {
    // Will hold reference to the Save button generated below the form
    export var menuSaveButton: HTMLButtonElement;

    export var bigFormMenuConfiguration: iFormMenuConfiguration;

    class Html5ItemStateInfo implements  iItemStateInfo {
        constructor(
            public onChangeMenuItemsWithItemStateExist: (exist: boolean)=>void,
            public hasActiveStateClass: string,
            public stateFilterActiveClass: string,
            public stateFilterButtonClass: string,
            public wireUp: (domElement: HTMLElement, setActive: (active: boolean)=>void)=>void
        ) {}
    }

    bigFormMenuConfiguration.querySelector = "h1,h2,h3,h4,h5,h6,label";

    // if itemStateInfos is undefined, set it now
    if (!bigFormMenuConfiguration.itemStateInfos) { bigFormMenuConfiguration.itemStateInfos = {}; }

    bigFormMenuConfiguration.itemStateInfos["html5required"] = new Html5ItemStateInfo(
        null,
        'bigformmenu-is-required', 
        'bigformmenu-required-filter-is-active', 'bigformmenu-required-filter-button', 
        (domElement: HTMLElement, setActive: (active: boolean)=>void)=> {
            if (domElement.tagName.toLowerCase() !== 'label') { return; }

// DOES NOT WORK FOR select, textarea, etc.


            let labelElement: HTMLLabelElement = domElement as HTMLLabelElement;
            let inputElementId = labelElement.htmlFor;
            let inputElement: HTMLInputElement = document.getElementById(inputElementId) as HTMLInputElement;
            setActive(inputElement.required);
        });

        bigFormMenuConfiguration.itemStateInfos["html5invalid"] = new Html5ItemStateInfo(
            (exist: boolean)=>{ 

                // Disable the save button if there are invalid input elements.
                // Note that when this callback starts getting called, the buttons will not yet be in the DOM,
                // so use the button returned in the wireUp method of the menuButtons object.

                if (menuSaveButton) {
                    menuSaveButton.disabled = exist;
                }
            },
            'bigformmenu-is-invalid',
            'bigformmenu-invalid-filter-is-active', 'bigformmenu-invalid-filter-button', 
            (domElement: HTMLElement, setActive: (active: boolean)=>void)=> {
                if (domElement.tagName.toLowerCase() !== 'label') { return; }
    
                let labelElement: HTMLLabelElement = domElement as HTMLLabelElement;
                let inputElementId = labelElement.htmlFor;
                let inputElement: HTMLInputElement = document.getElementById(inputElementId) as HTMLInputElement;


                // DOES NOT WORK FOR select, textarea, etc.

                setActive(!inputElement.validity.valid);

                inputElement.addEventListener("input", function(){
                    setActive(!inputElement.validity.valid);
                });
            });
    }


