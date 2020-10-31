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
// The state is represented by the cssClass. Items with state "on" have the class,
// those with state "off" do not have the class.
// The filter button will be given the same class.
//
interface iItemStateInfo {

    // When the menu loads, for each DOM element represented in the menu,
    // it calls the wireUp method of each iItemStateInfo.
    // domElement - the DOM element
    // setActive - a method to call when the DOM element is "active". For example, when it is invalid.
    // setInactive - a method to call when the DOM element is "inactive". For example, when it is not invalid.
    //
    // In the body of the wireUp method, call one of these methods to set the initial state of the menu item.

    wireUp: (domElement: HTMLElement, setActive: ()=>void, setInactive: ()=>void)=>void;

    cssClass: string;
}
