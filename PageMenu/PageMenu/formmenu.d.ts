//namespace FormMenu {

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
    }
//}
    

