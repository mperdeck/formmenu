interface iFormMenuConfiguration {
    skipFirstHeading?: boolean;

    // Items with level equal or lower than this will be open initially. -1 to open everything. 0 to open nothing.
    defaultOpenAtLevel?: number;

    // Same as defaultOpenAtLevel, but applies when user clicks the collapse filter button.
    collapseOpenAtLevel?: number;

    domItemHighlightPeriodMS?: number;
    showFilterInput?: boolean;
    filterPlaceholder?: string;
    filterMinimumCharacters?: number;
    showMenuHideShowButton?: boolean;
    showExpandAllMenuButton?: boolean;
    showCollapseAllMenuButton?: boolean;

    // Query selector used to select the tags that will be represented in the menu
    querySelector?: string;

    // Method that takes a tag name and works out the level of that tag.
    // Level determines position in the menu (whether it is a child or a sibling).
    // Items with lower levels are parents of items with higher levels.
    tagNameToLevelMethod?: (tagName: string) => number;

    // Used to do additional processing for each menu item. See iItemStateInfo.
    // key: name of the iItemStateInfo. Pretty much a dummy.
    // value: the iItemStateInfo
    //
    // This structure makes it possible to add item state infos to this structure
    // in multiple ...formmenu.config.js files
    itemStateInfos?: { [key: string]: iItemStateInfo};
}

declare let formMenuConfiguration: iFormMenuConfiguration;
    
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
}
