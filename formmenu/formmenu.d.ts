interface iFormMenuConfiguration {

    // If false, the menu will be loaded after the page has loaded (the "load" event has fired). If true, the menu will not be loaded.
    suppressLoadOnPageLoad?: boolean;

    skipFirstHeading?: boolean;

    // Items with level equal or lower than this will be open initially. -1 to open everything. 0 to open nothing.
    defaultOpenAtLevel?: number;

    // Same as defaultOpenAtLevel, but applies when user clicks the collapse filter button.
    collapseOpenAtLevel?: number;

    // When menu width is less than this in pixels, it minimizes automatically.
    minimumMenuWidth?: number;

    // When menu heigth is less than this, it minimizes automatically.
    minimumMenuHeigth?: number;

    // If truthy, when all items are on the page when the page is loaded, the menu is not added to the DOM.
    // So even the show menu button will not be visible.
    //
    // Note that this means that if initially some menu dom elements are hidden when the page loads, those will not be taken into account.
    // So if any elements that were hidden initially and then become visible, and this causes the form to become bigger than the page, the menu will still 
    // not be added to the DOM.
    //
    // Also note that if the user makes the page smaller after having opened it, the menu may now no longer fit on the page, but the menu will 
    // still not be added to the DOM.
    hideForSmallForms?: boolean;

    filterPlaceholder?: string;
    filterMinimumCharacters?: number;

    // If true, when the filter is used, 1) the first DOM element that matches the filter is scrolled into view
    // and 2) all DOM elements matching the filter are given class formmenu-filtered-dom-item
    // Especially useful when using the menu as a button bar.
    highlightFilteredDomElements?: boolean;

    classMenuShowButton?: string;
    classMenuHideButton?: string;
    classExpandAllMenuButton?: string;
    classCollapseAllMenuButton?: string;
    classPreviousHeadingBox?: string;
    classNextHeadingBox?: string;

    titleMenuShowButton?: string;
    titleMenuHideButton?: string;
    titleExpandAllMenuButton?: string;
    titleCollapseAllMenuButton?: string;
    titlePreviousHeadingBox?: string;
    titleNextHeadingBox?: string;

    // Describes the DOM elements that will be represented in the menu.
    // The CSS selector in each dom element class is used to find those DOM elements.
    domElementClasses?: iDomElementClass[];

    // CSS selector used to select the tags that when clicked trigger a rebuild of the menu.
    // If you support IE11, make sure they captures all DOM elements that when clicked show or hide an item that you want to appear in the menu.
    // Same for any browser, if you show or hide elements by setting visibility to hidden (instead of setting display none). 
    // This because intersection observers do not get triggered when visibility is changed, maybe because those elements still take visible space on the page.
    rebuildOnClickedSelector?: string;

    // Used to do additional processing for each menu item. See iItemStateInfo.
    // key: name of the iItemStateInfo. Pretty much a dummy.
    // value: the iItemStateInfo
    //
    // This structure makes it possible to add item state infos to this structure
    // in multiple ...formmenu.config.js files
    itemStateInfos?: { [key: string]: iItemStateInfo};

    // Similar to itemStateInfos. Used to define buttons that will sit just below the menu.
    menuButtons?: { [key: string]: iMenuButton};

    // Gets the input element associated with a DOM element.
    // If the DOM element is a label, this will return the associated input element.
    // Returns null if there is no associated element.
    getInputElementMethod?: (domElement: HTMLElement) => HTMLInputElement;
}

declare let formMenuConfiguration: iFormMenuConfiguration;

// Represents a class of DOM elements. 
interface iDomElementClass {

    // If provided, the getItemCaption method is used to get the menu item caption from the corresponding dom item.
    // If this returns falsy, the menu item is not generated.
    // If this method is not given, the default behaviour is to simply get the innerText from the dom element. 
    getItemCaption?: (domElement: HTMLElement) => string;

    // If provided, the getForceExpandable method is used to determine whether to always generate +- buttons
    // for a menu item, even it has no children in the DOM.
    // Use this in React like scenarios where the children may not now be in the DOM, but there is a UI
    // element that causes the children to be added to the DOM if clicked. You could then
    // listen for clicked events from the + and - buttons, and click that UI element when they are clicked.
    //
    // domElement - DOM element that the menu element represents.
    // If returns falsy or method not given, +- buttons only generated when the item has children.
    // If returns truthy, +- buttons always generated.
    getForceExpandable?: (domElement: HTMLElement) => boolean;

    // Level of the menu item. For example, a H1 has level 1, H2 has level 2.
    // Do not set to 0 or lower.
    // Menu items that are not associated with a heading have a very high level.
    level?: number;

    // CSS class added to the anchor element used to create the clickable menu item
    anchorCssClass?: string;

    // CSS selector used to select the DOM elements that will be represented in the menu that belong to this class of elements
    cssSelector?: string;
}

// You can have a form menu reflect the state of the associated dom elements.
// For example, if you include label tags in the form menu, you can show
// for each menu item associated with a label whether its input element is valid or not.
// 
// To make this happen, ensure a JavaScript file is loaded with a namespace "FormMenu"
// containing a variable "itemStateInfos" with an array of iItemStateInfo.
//
// For each iItemStateInfo, a button is added to the filter bar.
// These act like radio push buttons, to let the user filter / not filter 
// items with the given state.
// This will have the disabled property when no item has the given state.
//
interface iItemStateInfo {

    // When the menu loads, for each DOM element represented in the menu,
    // it calls the wireUp method of each iItemStateInfo.
    // domElement - the DOM element
    // setActive - a method to call when the DOM element switches from "active" to "inactive" or vice versa.
    //
    // In the body of the wireUp method, call one of these methods to set the initial state of the menu item.

    wireUp: (domElement: HTMLElement, setActive: (active: boolean)=>void)=>void;

    // Called when there are menu item with the given state, or when there are no longer such menu items.
    // Can be called multiple times with the same exist value.
    // exist - true if such items exist, false if no longer exist
    onChangeMenuItemsWithItemStateExist?: (exist: boolean)=>void;

    // Menu items associated with a dom element that has active state will have this class
    hasActiveStateClass: string;

    // If the user is filtering by active state, this class is added to the top level div.
    stateFilterActiveClass: string;

    // The filter button that allows the user to only show items with the active state
    // will have this class.
    stateFilterButtonClass: string;

    // The button that allows the user to go to the next item with the active state
    // will have this class.
    stateNextButtonClass: string;

    // The button that allows the user to go to the previous item with the active state
    // will have this class.
    statePreviousButtonClass: string;

    // Contents of tiny popup that appears when user hovers over button. 
    // If not set, popup will not show. Use for short help text as to what the button does.
    buttonTitle?: string;

    // Contents of tiny popup that appears when user hovers over Next button. 
    // If not set, popup will not show. Use for short help text as to what the button does.
    buttonTitleNext?: string;

    // Contents of tiny popup that appears when user hovers over Previous button.
    // If not set, popup will not show. Use for short help text as to what the button does.
    buttonTitlePrevious?: string;
}

// Represents a button tag that will be generated below the menu
interface iMenuButton {
    // If given, the formmenu library looks elements on the page
    // that match this selector.
    // For each such element, a button will be generated:
    // * caption will be innerHTML of the element, can be overridden by caption.
    // * onClick will be a method that clicks the element, can be overridden by onClick.
    // * cssClass will be the CSS class(es) of the element, can be overriden by cssClass.
    // * wireUp will be called for each generated button if defined.
    cssSelector?: string;

    caption?: string;

    // Will be called when this button is clicked
    onClick?: ()=>void;

    // Classes to be added to the button. If you want multiple classes, separate with a space.
    cssClass?: string;

    // If defined, this method will be called after the button tag has been created.
    // If it returns falsy, the button will not be added to the menu.
    // buttonElement - the button element
    wireUp?: (buttonElement: HTMLButtonElement) => boolean;

    // The button in the form itself that is associated with this menu button.
    // Used to determine whether to set the formmenu-all-buttons-visible class on the main div of the menu.
    // That class is only set if all buttons associated with all iMenuButton elements are visible.
    // If domButton is not set, it will simply not used whether to set that class.
    domButton?: HTMLButtonElement;
}

