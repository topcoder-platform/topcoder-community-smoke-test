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
            args: ['--disable-gpu', '--window-size=1325x744']
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
        // jasmine.getEnv().addReporter(new HtmlReporter({
        //     baseDirectory: 'test-results',
        //     preserveDirectory: false, // Preserve base directory
        //     screenshotsSubfolder: 'screenshots',
        //     jsonsSubfolder: 'jsons', // JSONs Subfolder
        //     takeScreenShotsForSkippedSpecs: true, // Screenshots for skipped test cases
        //     takeScreenShotsOnlyForFailedSpecs: false, // Screenshots only for failed test cases
        //     docTitle: 'Test Automation Execution Report', // Add title for the html report
        //     docName: 'TestResult.html', // Change html report file name
        //     gatherBrowserLogs: true // Store Browser logs
        // }).getJasmine2Reporter());
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL2NvbmYudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSx5Q0FBcUM7QUFFckMsSUFBSSxZQUFZLEdBQUcsT0FBTyxDQUFDLCtCQUErQixDQUFDLENBQUM7QUFDNUQsSUFBSSxTQUFTLEdBQUcsT0FBTyxDQUFDLG1CQUFtQixDQUFDLENBQUM7QUFZN0MsT0FBTyxDQUFDLE1BQU0sR0FBRztJQUNiLGFBQWEsRUFBRSxJQUFJO0lBRW5CLHVEQUF1RDtJQUN2RCxZQUFZLEVBQUU7UUFDVixhQUFhLEVBQUUsUUFBUTtRQUN2QixhQUFhLEVBQUU7WUFDWCxJQUFJLEVBQUUsQ0FBRSxlQUFlLEVBQUUsd0JBQXdCLENBQUM7U0FDckQ7S0FDSjtJQUVELDRDQUE0QztJQUM1QyxTQUFTLEVBQUUsVUFBVTtJQUVyQixLQUFLLEVBQUU7UUFDSCx3Q0FBd0M7UUFDeEMsc0NBQXNDO1FBQ3RDLHdDQUF3QztRQUN4Qyw0Q0FBNEM7UUFFNUMsa0RBQWtEO1FBQ2xELGlEQUFpRDtRQUNqRCwwQ0FBMEM7UUFDMUMsdUNBQXVDO1FBQ3ZDLHVDQUF1QztLQUMxQztJQUVELG1DQUFtQztJQUNuQyxlQUFlLEVBQUU7UUFDYixVQUFVLEVBQUUsSUFBSTtRQUNoQixzQkFBc0IsRUFBRSxLQUFLO1FBQzdCLFNBQVMsRUFBRSxJQUFJO0tBQ2xCO0lBRUQsU0FBUyxFQUFFO1FBQ1Asb0JBQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNyQyxvQkFBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNqRCxJQUFJLGFBQWEsR0FBRyxJQUFJLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQztZQUMvQyxRQUFRLEVBQUUsY0FBYztZQUN4QixjQUFjLEVBQUUsS0FBSztTQUN4QixDQUFDLENBQUM7UUFDSCxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQzVDLDRCQUE0QjtRQUM1QixrREFBa0Q7UUFDbEQscUNBQXFDO1FBQ3JDLDJEQUEyRDtRQUMzRCwyQ0FBMkM7UUFDM0Msa0RBQWtEO1FBQ2xELGtGQUFrRjtRQUNsRiwwRkFBMEY7UUFDMUYscUZBQXFGO1FBQ3JGLGtFQUFrRTtRQUNsRSxvREFBb0Q7UUFDcEQsNkJBQTZCO0lBQ2pDLENBQUM7Q0FDSixDQUFBIn0=