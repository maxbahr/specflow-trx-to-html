import { FileUtils } from './fs-utils.class.js';
import { HtmlGenerator } from './html-generator.class.js';
import { ISummaryResult } from './interfaces/summary-result.type.js';
import { IUnitTestResult } from './interfaces/unit-test-result.type.js';
import { TestResultPreparing } from './test-result-preparing.class.js';

const outputHTMLPath = 'output/result.html';
const trxDirPath = './trx'
const attachmentDirPath = '.' //'./attachments'

const trxFiles = await FileUtils.findTrxFilesAsync(trxDirPath);
const attachmentFiles = await FileUtils.findAttachmentFilesAsync(attachmentDirPath);
const unitTestResults: IUnitTestResult[] = await TestResultPreparing.prepareUnitTestResult(trxFiles, attachmentFiles);
const summaryDomainResult: ISummaryResult[] = TestResultPreparing.prepareDomainSummaryResult(unitTestResults);
const summaryResult: ISummaryResult = TestResultPreparing.prepareSummaryResult(unitTestResults, summaryDomainResult);
let htmlContent = HtmlGenerator.generateHTML(summaryResult, summaryDomainResult, unitTestResults);
HtmlGenerator.saveHtml(outputHTMLPath, htmlContent, false);