import { protractor, browser, element, by } from "protractor";
import { HeaderPageObject } from "./header.po";
import { ChallengeListingPageHelper } from "../challenge-listing/challenge-listing.helper";
import * as config from "../../../../config.json";
import { commonPageObjects } from "../../../common/common.po";
import { commonPageHelper } from "../../../common/common.helper";

export class HeaderHelper {

    static async clickOnBanner() {
        await HeaderPageObject.banner.click();
    }

    static async clickOnAllChallengesLink() {
        const until = protractor.ExpectedConditions;
        await browser.actions().mouseMove(HeaderPageObject.competeLink).perform();

        const allChallengesLink = HeaderPageObject.allChallengesLink;  
        await browser.wait(until.elementToBeClickable(allChallengesLink), 5000);

        await allChallengesLink.click();
    }

    static async clickOnCompetitiveProgrammingLink() {
        const until = protractor.ExpectedConditions;
        await browser.actions().mouseMove(HeaderPageObject.competeLink).perform();

        const competitiveProgrammingLink = HeaderPageObject.competitiveProgrammingLink;  
        await browser.wait(until.elementToBeClickable(competitiveProgrammingLink), 5000);
        
        await competitiveProgrammingLink.click();
    }

    static async verifyAllTrackLinks() {
        const links = ['Competitive Programming', 'Data Science', 'Design', 'Development', 'QA'];

        for (let i = 0; i < links.length; i++) {
            const until = protractor.ExpectedConditions;
            await ChallengeListingPageHelper.get();
            await browser.actions().mouseMove(HeaderPageObject.tracksLink).perform();
            const trackLink = commonPageObjects.getLinkByAriaLabel(links[i]);  
            await browser.wait(until.elementToBeClickable(trackLink), 5000);
            await trackLink.click();

            await browser.wait(until.visibilityOf(element(by.id('react-view'))));
            console.log('User navigated to ' + links[i] + ' page');
        }
    }

    static async verifyAllCommunityLinks() {
        const links = ['TCO', 'Programs', 'Statistics', 'Events', 'Blog', 'Thrive'];

        for (let i = 0; i < links.length; i++) {
            const until = protractor.ExpectedConditions;
            await ChallengeListingPageHelper.get();
            await browser.actions().mouseMove(HeaderPageObject.communityLink).perform();
            const communityLink = commonPageObjects.getLinkByAriaLabel(links[i]);
            await browser.wait(until.elementToBeClickable(communityLink), 10000);
            await communityLink.click();

            if (links[i] == 'Blog') {
                await browser.wait(until.visibilityOf(element(by.className('blog'))));
            } else {
                await browser.wait(until.visibilityOf(element(by.id('react-view'))));
            }
            console.log('User navigated to ' + links[i] + ' page');
        }
    }

    static async clickForumCommunityLink() {
        const until = protractor.ExpectedConditions;
        await ChallengeListingPageHelper.get();
        await browser.actions().mouseMove(HeaderPageObject.communityLink).perform();
        const communityLink = commonPageObjects.getLinkByAriaLabel('Forums');  
        await browser.wait(until.elementToBeClickable(communityLink), 5000);
        await communityLink.click();
        console.log('Forum community link clicked');
    }

    static async clickOnDashboardLink() {
        await this.clickOnUserSpecificLink('Dashboard');  
    }

    static async clickOnMyProfileLink() {
        await this.clickOnUserSpecificLink('My Profile');  
    }

    static async clickOnPaymentsLink() {
        await this.clickOnUserSpecificLink('Payments');
    }

    static async clickOnSettingsLink() {
        await this.clickOnUserSpecificLink('Settings');
    }

    static async clickOnLogoutLink() {
        await this.clickOnUserSpecificLink('Log Out');
    }

    static async search(inputString: string) {
        const searchIcon = HeaderPageObject.searchIcon;

        await browser.actions().mouseMove(searchIcon).perform();
        await HeaderPageObject.searchInput.sendKeys(inputString);
        await HeaderPageObject.searchInput.sendKeys(protractor.Key.ENTER);
    }

    static async clickOnUserSpecificLink(label: string) {
        const until = protractor.ExpectedConditions;
        const myUsernameLink = commonPageObjects.findElementByText('div', commonPageHelper.getConfigUserName());

        await browser.actions().mouseMove(myUsernameLink).perform();
        const link = commonPageObjects.getLinkByAriaLabel(label);
        await browser.wait(until.elementToBeClickable(link), 5000);
        await link.click();
    }
}