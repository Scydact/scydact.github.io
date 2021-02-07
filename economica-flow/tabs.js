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
            if (tabButtons.length > tabContents.length) {
                console.error('Tab group has more buttons than content!');
                console.error(tabGroup);
                continue;
            }

            let closeAllTabs = () => {
                for (let element of tabButtons)
                    element.classList.remove('active');

                for (let element of tabContents)
                    element.classList.add('disabled');
            }

            for (let i = 0; i < tabButtons.length; i++) {
                let cTabButton = tabButtons[i];
                let cTabContent = tabContents[i];

                cTabButton['associatedTab'] = cTabContent;

                if (!cTabButton.openTab) {
                    cTabButton['openTab'] = function () {
                        closeAllTabs();
                        this.classList.add('active');
                        this['associatedTab'].classList.remove('disabled');
                    }
                    cTabButton.onclick = function () { this.openTab() };
                }
            }
            tabButtons[0]['openTab']();
        }
    }

    return {
        tabify: tabify,
    };
}
document.addEventListener('DOMContentLoaded', () => {
    Tabs().tabify();
});