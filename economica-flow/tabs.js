function Tabs() {
    // NOTE: Tabs inside tabs not supported! must use node.filter(className contains...)
    function tabify(node = document) {
        let tabGroups = node.getElementsByClassName('tab-wrapper');
        for (let tabGroup of tabGroups) {
            let tab = tabGroup.getElementsByClassName('tab')[0];
            if (!tab) {
                console.error('Tab group empty!');
                console.error(tabGroup);
                continue;
            }

            let tabButtons = tab.getElementsByClassName('tab-link');
            let tabContents = tabGroup.getElementsByClassName('tab-content');

            let tabObj = {
                current: 0,
                tabs: [], // 0: button, 1: content;

                closeAllTabs: function () {
                    for (let element of this.tabs) {
                        element[0].classList.remove('active');
                        element[1].classList.add('disabled');
                    }
                },
                openTab: function (i) {
                    if (this.tabs[i]) {
                        this.closeAllTabs();
                        this.tabs[i][0].openTab();
                        return true;
                    }
                    return false;
                }

            }
            if (tabButtons.length > tabContents.length) {
                console.error('Tab group has more buttons than content!');
                console.error(tabGroup);
                continue;
            }

            for (let i = 0; i < tabButtons.length; i++) {
                let cTabButton = tabButtons[i];
                let cTabContent = tabContents[i];

                tabObj.tabs.push([cTabButton, cTabContent]);

                cTabButton['associatedTab'] = cTabContent;

                if (!cTabButton.openTab) {
                    cTabButton['openTab'] = function () {
                        tabObj.closeAllTabs();
                        this.classList.add('active');
                        this['associatedTab'].classList.remove('disabled');
                        tabObj.current = i;
                    }
                    cTabButton.onclick = function () { this.openTab(i) };
                }
            }
            tabButtons[0]['openTab']();
            tabGroup['tab'] = tabObj;
            tab['tab'] = tabObj;
        }
    }

    return {
        tabify: tabify,
    };
}
document.addEventListener('DOMContentLoaded', () => {
    Tabs().tabify();
});