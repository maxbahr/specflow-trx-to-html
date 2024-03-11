import moment from 'moment';
import { findImageFiles, findTrxFiles } from './fs-utils.js';
import { generateHTML, saveHtml } from './generate-html.js';
import { ISummaryResult } from './interfaces/summary-result.type.js';
import { IUnitTestResult } from './interfaces/unit-test-result.type.js';
import { parseTRXFile } from './parser-trx.js';
import { addAttachmentFiles } from './attachment-base64-converter.js';

const outputHTMLPath = 'output/result.html';
const trxFiles = await findTrxFiles(".");
const imgFiles = await findImageFiles(".");

let unitTestResults: IUnitTestResult[] = [];

for (const trxFilePath of trxFiles) {
    const trxTests = await parseTRXFile(trxFilePath);
    unitTestResults = unitTestResults.concat(trxTests);
}

unitTestResults = await addAttachmentFiles(unitTestResults, imgFiles);

unitTestResults = sortAndFilterUniqueTests(unitTestResults);

let summaryDomainResult: ISummaryResult[] = [];
const domainList = Array.from(new Set(unitTestResults.map(domain => domain.testDomain)));
for (const domain of domainList) {
  const domainResults = unitTestResults.filter(r => r.testDomain === domain);
  const passed = domainResults.filter(t => t.outcome == 'Passed').length;
  const failed = domainResults.filter(t => t.outcome == 'Failed').length;
  const ignored = domainResults.filter(t => t.outcome == 'Ignored').length;
  
  const total = passed + failed + ignored;
  summaryDomainResult.push({
    domain: domain,
    passed: passed,
    failed: failed,
    ignored: ignored,
    total: total,
    duration: getRealDuration(domainResults),
    startDate: getStartDate(domainResults).toDate(),
    endDate: getEndDate(domainResults).toDate()
  })
}

const summaryResult: ISummaryResult = {
    domain: "All",
    total: summaryDomainResult.map(m => m.total).reduce((accumulator, currentValue) => accumulator + currentValue, 0),
    passed: summaryDomainResult.map(m => m.passed).reduce((accumulator, currentValue) => accumulator + currentValue, 0),
    failed: summaryDomainResult.map(m => m.failed).reduce((accumulator, currentValue) => accumulator + currentValue, 0),
    ignored: summaryDomainResult.map(m => m.ignored).reduce((accumulator, currentValue) => accumulator + currentValue, 0),
    duration: getRealDuration(unitTestResults),
    startDate: getStartDate(unitTestResults).toDate(),
    endDate: getEndDate(unitTestResults).toDate()
};

const htmlContent = generateHTML(summaryResult, summaryDomainResult, unitTestResults);
saveHtml(outputHTMLPath, htmlContent);





//----------------------------------------------------------------------------

function getRealDuration(data: IUnitTestResult[]): number {
    return getEndDate(data).diff(getStartDate(data), 'seconds');
}

function getStartDate(data: IUnitTestResult[]): moment.Moment {
    const startTimes = data.map(d => d.startTime);
    return moment(Math.min(...startTimes.map(date => moment(date).valueOf())));    
}

function getEndDate(data: IUnitTestResult[]): moment.Moment {
    const endTimes = data.map(d => d.endTime);
    return moment(Math.max(...endTimes.map(date => moment(date).valueOf())));    
}

function sortAndFilterUniqueTests(tests: IUnitTestResult[]): IUnitTestResult[] {
    const testMap = new Map<string, IUnitTestResult>();

    tests.sort((a, b) => {
        if (a.testDomain < b.testDomain) return -1;
        if (a.testDomain > b.testDomain) return 1;
    
        if (a.featureName < b.featureName) return -1;
        if (a.featureName > b.featureName) return 1;
    
        if (a.testFullName < b.testFullName) return -1;
        if (a.testFullName > b.testFullName) return 1;
    
        if (a.startTime < b.startTime) return -1;
        if (a.startTime > b.startTime) return 1;
        return 0;
    });

    tests.forEach(test => {
        const key = `${test.testDomain}-${test.featureName}-${test.testFullName}`;
        const existingTest = testMap.get(key);

        if (!existingTest) {            
            testMap.set(key, test);
        }
        if (existingTest && test.endTime > existingTest.endTime) {            
            test.previousRun = existingTest;
            test.rerun = true;
            testMap.set(key, test);
        }
    });

    return Array.from(testMap.values());
}

