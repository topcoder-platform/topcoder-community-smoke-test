"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var protractor_1 = require("protractor");
var HtmlReporter = require('protractor-beautiful-reporter');
var reporters = require('jasmine-reporters');
exports.config = {
    directConnect: true,
    // Capabilities to be passed to the webdriver instance.
    capabilities: {
        'browserName': 'chrome',
        chromeOptions: {
            args: ['--headless', '--disable-gpu', '--window-size=1325x744']
        }
    },
    // Framework to use. Jasmine is recommended.
    framework: 'jasmine2',
    specs: [
        '../temp/test-suites/tc-profile.spec.js',
        '../temp/test-suites/tc-tools.spec.js',
        '../temp/test-suites/tc-account.spec.js',
        '../temp/test-suites/tc-preferences.spec.js',
        '../temp/test-suites/tc-challenge-listing.spec.js',
        '../temp/test-suites/tc-challenge-detail.spec.js',
        '../temp/test-suites/tc-dashboard.spec.js',
        '../temp/test-suites/tc-footer.spec.js',
        '../temp/test-suites/tc-header.spec.js'
    ],
    // Options to be passed to Jasmine.
    jasmineNodeOpts: {
        showColors: true,
        defaultTimeoutInterval: 90000,
        isVerbose: true
    },
    onPrepare: function () {
        protractor_1.browser.manage().window().maximize();
        protractor_1.browser.manage().timeouts().implicitlyWait(5000);
        var junitReporter = new reporters.JUnitXmlReporter({
            savePath: 'test-results',
            consolidateAll: false
        });
        jasmine.getEnv().addReporter(junitReporter);
        // Only for local deployment
        jasmine.getEnv().addReporter(new HtmlReporter({
            baseDirectory: 'test-results',
            preserveDirectory: false,
            screenshotsSubfolder: 'screenshots',
            jsonsSubfolder: 'jsons',
            takeScreenShotsForSkippedSpecs: true,
            takeScreenShotsOnlyForFailedSpecs: false,
            docTitle: 'Test Automation Execution Report',
            docName: 'TestResult.html',
            gatherBrowserLogs: true // Store Browser logs
        }).getJasmine2Reporter());
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL2NvbmYudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSx5Q0FBcUM7QUFFckMsSUFBSSxZQUFZLEdBQUcsT0FBTyxDQUFDLCtCQUErQixDQUFDLENBQUM7QUFDNUQsSUFBSSxTQUFTLEdBQUcsT0FBTyxDQUFDLG1CQUFtQixDQUFDLENBQUM7QUFZN0MsT0FBTyxDQUFDLE1BQU0sR0FBRztJQUNiLGFBQWEsRUFBRSxJQUFJO0lBRW5CLHVEQUF1RDtJQUN2RCxZQUFZLEVBQUU7UUFDVixhQUFhLEVBQUUsUUFBUTtRQUN2QixhQUFhLEVBQUU7WUFDWCxJQUFJLEVBQUUsQ0FBQyxZQUFZLEVBQUUsZUFBZSxFQUFFLHdCQUF3QixDQUFDO1NBQ2xFO0tBQ0o7SUFFRCw0Q0FBNEM7SUFDNUMsU0FBUyxFQUFFLFVBQVU7SUFFckIsS0FBSyxFQUFFO1FBQ0gsd0NBQXdDO1FBQ3hDLHNDQUFzQztRQUN0Qyx3Q0FBd0M7UUFDeEMsNENBQTRDO1FBRTVDLGtEQUFrRDtRQUNsRCxpREFBaUQ7UUFDakQsMENBQTBDO1FBQzFDLHVDQUF1QztRQUN2Qyx1Q0FBdUM7S0FDMUM7SUFFRCxtQ0FBbUM7SUFDbkMsZUFBZSxFQUFFO1FBQ2IsVUFBVSxFQUFFLElBQUk7UUFDaEIsc0JBQXNCLEVBQUUsS0FBSztRQUM3QixTQUFTLEVBQUUsSUFBSTtLQUNsQjtJQUVELFNBQVMsRUFBRTtRQUNQLG9CQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDckMsb0JBQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDakQsSUFBSSxhQUFhLEdBQUcsSUFBSSxTQUFTLENBQUMsZ0JBQWdCLENBQUM7WUFDL0MsUUFBUSxFQUFFLGNBQWM7WUFDeEIsY0FBYyxFQUFFLEtBQUs7U0FDeEIsQ0FBQyxDQUFDO1FBQ0gsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUM1Qyw0QkFBNEI7UUFDNUIsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLFdBQVcsQ0FBQyxJQUFJLFlBQVksQ0FBQztZQUMxQyxhQUFhLEVBQUUsY0FBYztZQUM3QixpQkFBaUIsRUFBRSxLQUFLO1lBQ3hCLG9CQUFvQixFQUFFLGFBQWE7WUFDbkMsY0FBYyxFQUFFLE9BQU87WUFDdkIsOEJBQThCLEVBQUUsSUFBSTtZQUNwQyxpQ0FBaUMsRUFBRSxLQUFLO1lBQ3hDLFFBQVEsRUFBRSxrQ0FBa0M7WUFDNUMsT0FBTyxFQUFFLGlCQUFpQjtZQUMxQixpQkFBaUIsRUFBRSxJQUFJLENBQUMscUJBQXFCO1NBQ2hELENBQUMsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUM7SUFDOUIsQ0FBQztDQUNKLENBQUEifQ==