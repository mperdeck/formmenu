interface iBigFormMenuConfiguration {
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

    showFilterInput?: boolean;
    filterPlaceholder?: string;
    filterMinimumCharacters?: number;
    showMenuHideShowButton?: boolean;
    showExpandAllMenuButton?: boolean;
    showCollapseAllMenuButton?: boolean;

    classMenuShowButton?: string;
    classMenuHideButton?: string;
    classExpandAllMenuButton?: string;
    classCollapseAllMenuButton?: string;

    titleMenuShowButton?: string;
    titleMenuHideButton?: string;
    titleExpandAllMenuButton?: string;
    titleCollapseAllMenuButton?: string;

    // Query selector used to select the tags that will be represented in the menu
    querySelector?: string;

    // CSS selector used to select the tags that when clicked trigger a rebuild of the menu.
    // If you support IE11, make sure they captures all DOM elements that when clicked show or hide an item that you want to appear in the menu.
    // Same for any browser, if you show or hide elements by setting visibility to hidden (instead of setting display none). 
    // This because intersection observers do not get triggered when visibility is changed, maybe because those elements still take visible space on the page.
    rebuildOnClickedSelector?: string;

    // querySelector is used to find all dom elements that may get represented in the menu.
    // If provided, this method is then used to get the menu item caption from the corresponding dom item.
    // If this returns falsy, the menu item is not generated.
    // If this method is not given, the default behaviour is to simply get the innerText from the dom element. 
    getItemCaption?: (domElement: HTMLElement) => string;

    // Method that takes a tag name and works out the level of that tag.
    // Level determines position in the menu (whether it is a child or a sibling).
    // Items with lower levels are parents of items with higher levels.
    tagNameToLevelMethod?: (tagName: string) => number;

    // Used to do additional processing for each menu item. See iItemStateInfo.
    // key: name of the iItemStateInfo. Pretty much a dummy.
    // value: the iItemStateInfo
    //
    // This structure makes it possible to add item state infos to this structure
    // in multiple ...bigformmenu.config.js files
    itemStateInfos?: { [key: string]: iItemStateInfo};

    // Similar to itemStateInfos. Used to define buttons that will sit just below the menu.
    menuButtons?: { [key: string]: iMenuButton};
}

declare let bigFormMenuConfiguration: iBigFormMenuConfiguration;
    
// You can have a form menu reflect the state of the associated dom elements.
// For example, if you include label tags in the form menu, you can show
// for each menu item associated with a label whether its input element is valid or not.
// 
// To make this happen, ensure a JavaScript file is loaded with a namespace "BigFormMenu"
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

    // Contents of tiny popup that appears when user hovers over button. 
    // If not set, popup will not show. Use for short help text as to what the button does.
    buttonTitle?: string;
}

// Represents a button tag that will be generated below the menu
interface iMenuButton {
    // If given, the bigformmenu library looks elements on the page
    // that match this selector.
    // For each such element, a button will be generated:
    // * caption will be innerHTML of the element, can be overridden by caption.
    // * onClick will be a method that clicks the element, can be overridden by onClick.
    // * cssClass will be the CSS class(es) of the element, can be overriden by cssClass.
    // * wireUp will be called for each generated button.
    cssSelector?: string;

    caption?: string;

    // Will be called when this button is clicked
    onClick?: ()=>void;

    // Classes to be added to the button. If you want multiple classes, separate with a space.
    cssClass?: string;

    // If defined, this method will be called after the button tag has been created.
    // If it returns falsy, the button will not be added to the menu.
    // buttonElement - the button element
    wireUp?: (buttonElement: HTMLButtonElement)=>boolean;
}

