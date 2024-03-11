import * as fs from 'fs';
import {IUnitTestResult} from './interfaces/unit-test-result.type.js';
import moment from 'moment';
import _ from 'lodash';
import { createDirectories } from './fs-utils.js';
import { ISummaryResult } from './interfaces/summary-result.type.js';
import { AttachmentBase64 } from './attachment-base64-converter.js';

const iconTotal: string = '🧾';
const iconPassed: string = '✅'; 
const iconFailed: string = '❌'; 
const iconIgnored: string = '⚪'; 
const iconRerun: string = '🔄';

export function generateHTML(summaryResult: ISummaryResult, summaryDomainResult: ISummaryResult[], results: IUnitTestResult[]): string {
  let htmlContent: string = fs.readFileSync('templates/template.html', 'utf-8');
  let iterator: number = 0;  
  let testTableContent: string = "";  
  let domainSummaryTableContent: string = "";  
  let domainFilterOptions: string = "";
  let featureFilterOptions: string = "";
  let summaryTableContent: string = ""; 
  const summaryTestChartData: number[] = [summaryResult.passed, summaryResult.failed, summaryResult.ignored];

  //Tests Summary
  summaryTableContent += 
    `<div class="row align-items-center row-summary">
      <div class="col summary-details">
        <div class="row text-center">
          <div class="col fs-3" data-bs-toggle="tooltip" data-bs-placement="top" title="Total">${iconTotal}&nbsp;<span class="total-number">${summaryResult.total}</span></div>
          <div class="col fs-3" data-bs-toggle="tooltip" data-bs-placement="top" title="Passed">${iconPassed}&nbsp;<span class="passed-number">${summaryResult.passed}</span></div>
          <div class="col fs-3" data-bs-toggle="tooltip" data-bs-placement="top" title="Failed">${iconFailed}&nbsp;<span class="failed-number">${summaryResult.failed}</span></div>
          <div class="col fs-3" data-bs-toggle="tooltip" data-bs-placement="top" title="Ignored">${iconIgnored}&nbsp;<span class="failed-number">${summaryResult.ignored}</span></div>
          <div class="col fs-3" data-bs-toggle="tooltip" data-bs-placement="top" title="Rerun">${iconRerun}&nbsp;<span class="rerun-number">${results.filter(t => t.rerun == true).length}</span></div>
        </div>
      </div>
      <div class="col text-center"><span class='total-passed-percentage'>${calculatePercentage(summaryResult.passed, summaryResult.passed + summaryResult.failed)}%&nbsp;passed</span></div>
    </div>
   <div class="row align-items-center row-summary">
    <div class="col text-center">${returnTestProgress(summaryResult, false)}</div>
   </div>
   <div class="row align-items-center row-summary">
    <div class="col text-center fs-5"><span class="fs-6">start time: </span><span>${moment(summaryResult.startDate).format('YYYY-MM-DD hh:mm:ss')}</span></div>
    <div class="col text-center fs-5"><span class="fs-6">end time: </span><span>${moment(summaryResult.endDate).format('YYYY-MM-DD hh:mm:ss')}</span></div>
    <div class="col text-center fs-5"><span class="fs-6">duration: </span><span>${formatTime(summaryResult.duration)}</span></div>
   </div>
  `;
  
  //Domain Summary
  for (const summary of summaryDomainResult) {
    domainSummaryTableContent += 
    `<tr>
      <td><b>${summary.domain}</b></td>
      <td width='75%'>${returnTestProgress(summary, true)}</td>
      <!--<td>${summary.total}</td>
      <td>${summary.passed}</td>
      <td>${summary.failed}</td>
      <td>${summary.ignored}</td>-->
      <td>${formatTime(summary.duration)}</td>        
    </tr>`;

    domainFilterOptions +=
    `<option value="${summary.domain}">${summary.domain}</option>
    `;
  } 

  const allFeatureNames: string[] = results.map(f => f.featureName); 
  const uniqueFeatureNames: string[] = [...new Set(allFeatureNames)];
  uniqueFeatureNames.sort();
  uniqueFeatureNames.forEach(featureName => {
    featureFilterOptions +=
    `<option value="${featureName}">${featureName}</option>
    `;
  });


  //Test Results
  for (const result of results) {
    const duration = formatTime(result.duration);
    const startTime = moment(result.startTime).format('YYYY-MM-DD hh:mm:ss');
    const endTime = moment(result.endTime).format('YYYY-MM-DD hh:mm:ss');
    let outcome = returnIconByStatus(result.outcome);
    let preOutcome = result.previousRun?.outcome ? returnIconByStatus(result.previousRun?.outcome) : undefined;
      
    const errMsg = _.escape(result.errMsg || "");
    const stdout = _.escape(result.stdout || "");
    const title = _.escape(result.testName || "");
    const params = _.escape(result.testParameters || "");

    testTableContent += 
    `<tr class="table-row"
          data-bs-toggle="modal" 
          data-bs-target="#modalTestResults" 
          data-bs-icon-outcome='${outcome}' 
          data-bs-outcome='${result.outcome}' 
          data-bs-rerun='${result.rerun}' 
          data-bs-title='${title}' 
          data-bs-params='${params}'
          data-bs-start='${startTime}' 
          data-bs-end='${endTime}' 
          data-bs-duration='${duration}' 
          data-bs-domain='${result.testDomain}' 
          data-bs-feature='${result.featureName}' 
          data-bs-content-html="${returnStepComponent(result)}">
      <td class="align-middle text-center small">${++iterator}</td>
      <td class="align-middle text-center"><span class="icon">${preOutcome ? preOutcome : ''} ${result.rerun ? iconRerun : ''} ${outcome} </span></td>
      <td class="align-middle col-7">
      <div class="row test-metadata"><div class="col-4"><span class="label">Domain: </span><span class="value small">${result.testDomain}</span></div>
          <div class="col"><span class="label">Feature: </span><span class="value small">${result.featureName}</span></div></div>
          <div class="test-title">${title}</div>
          <div class="test-params">${params}</div>
      </td>
      <td class="align-middle text-nowrap small">${duration}</td>
      <td class="align-middle col-5 small">${returnTableErrorComponent(result, errMsg)}</td>
    </tr>`;
  }


  //replace placeholders
  htmlContent = htmlContent.replace('##summary_rows##', summaryTableContent);
  htmlContent = htmlContent.replace('##summary_test_chart_data##', summaryTestChartData.toString());  
  htmlContent = htmlContent.replace('##domain_list##', summaryDomainResult.map(d => `'${d.domain}'`).toString());  
  htmlContent = htmlContent.replace('##domain_list_passed##', summaryDomainResult.map(d => d.passed).toString());  
  htmlContent = htmlContent.replace('##domain_list_failed##', summaryDomainResult.map(d => d.failed).toString());  
  htmlContent = htmlContent.replace('##domain_list_ignored##', summaryDomainResult.map(d => d.ignored).toString());  
  htmlContent = htmlContent.replace('##domain_summary_rows##', domainSummaryTableContent);
  htmlContent = htmlContent.replace('##test_rows##', testTableContent);  
  htmlContent = htmlContent.replace('##domainFilterOptions##', domainFilterOptions);
  htmlContent = htmlContent.replace('##featureFilterOptions##', featureFilterOptions);
    
  return htmlContent;
}

export function saveHtml(outputHTMLPath: string, htmlContent: string): void {
  createDirectories(outputHTMLPath);
  fs.writeFileSync(outputHTMLPath, htmlContent, 'utf-8');

  console.log(`HTML file saved at: ${outputHTMLPath}`);
}



//-----------------------------------------------------------------------------------
function returnTableErrorComponent(result?: IUnitTestResult, errMsg?: string): string {
  if (!result) return '';

  const r = result.outcome;
  const pRun = result.previousRun;
  const pRunErrMsg = pRun ? _.escape(pRun.errMsg || "") : '';

  if (r === 'Passed') {
    return `${returnTableErrorComponent(pRun, pRunErrMsg)}<div class="passed-msg">All steps passed</div>`
  } else if (r === 'Failed') {
    return `${returnTableErrorComponent(pRun, pRunErrMsg)}<div class="error-msg"">${truncateText(errMsg!, 300)}</div>`
  } else if (r === 'Ignored') {
    return `${returnTableErrorComponent(pRun, pRunErrMsg)}<div class="ignored-msg"">${truncateText(errMsg!, 300)}</div>`
  } else {
    return '';
  }
}

function returnTestProgress(data: ISummaryResult, showLabel: boolean): string {
  const passed = calculatePercentage(data.passed, data.total);
  const failed = calculatePercentage(data.failed, data.total);
  const ignored = calculatePercentage(data.ignored, data.total);
  
  const tooltipTitle = `
      <ul class='tooltip-list'>
        <li>${iconPassed} <span class='x-small'>Passed:</span> ${data.passed}</li>
        <li>${iconFailed} <span class='x-small'>Failed:</span> ${data.failed}</li>
        <li>${iconIgnored} <span class='x-small'>Ignored:</span> ${data.ignored}</li>
        <li class='tooltip-total'>${iconTotal} <span class='x-small'>Total:</span> ${data.total}</li>
      </ul>
  `;

  return `
  <div class="progress" style="height: 20px;" id="progress-${data.domain.toLowerCase()}" data-bs-html="true" data-bs-toggle="tooltip" data-bs-placement="top" title="${tooltipTitle}">
    <div class="progress-bar progressbar-passed" role="progressbar" style="width: ${passed}%" aria-valuenow="${passed}" aria-valuemin="0" aria-valuemax="100"><span class="progressbar-label">${showLabel ? data.passed : ''}</span></div>
    <div class="progress-bar progressbar-failed" role="progressbar" style="width: ${failed}%" aria-valuenow="${failed}" aria-valuemin="0" aria-valuemax="100"><span class="progressbar-label">${showLabel ? data.failed : ''}</span></div>
    <div class="progress-bar progressbar-ignored" role="progressbar" style="width: ${ignored}%" aria-valuenow="${ignored}" aria-valuemin="0" aria-valuemax="100"><span class="progressbar-label">${showLabel ? data.ignored : ''}</span></div>
  </div>
  `
}

function calculatePercentage(part: number, total: number) {
  if (total === 0) {
      return 0;
  }

  const percentage = (part / total) * 100;
  return Math.round(percentage);
}

function returnIconByStatus(outcome: string): string {
  if (outcome === 'Passed') {
    return iconPassed;
  } else if (outcome === 'Failed') {
    return iconFailed
  } else {
    return iconIgnored;
  }
}

function returnStepComponent(result: IUnitTestResult): string {
  return _.escape(`
  <div id='test-${result.testId}'>
  ${result.gherkinLogs?.map(g => 
    `<div class='text-break' style='color: ${getStatusColor(g.status)}'><b>${g.key}</b> ${wrapPhraseWithSpan(g.step)} <span class='step-time small'>(${g.time})</span>
  ${g.table ? g.table.map(r => `<div class='step-data small'><pre>${r}</pre></div>`).join('') : ``}
  ${g.log ? g.log.map(r => `<div class='step-logs small d-none'><pre>${_.escape(r)}</pre></div>`).join('') : ``}
  ${g.status == 'error' ? `<h5 class='error-heading'>Error Message:</h5><div class='error-text'><pre style='color: in'>${result.errMsg}</pre></div>
  ${result.attachmentFiles ? `${listAttachments(result.attachmentFiles.filter(file => file.fileName.includes('screenshot')), false)}` : ''}` : ''}    
  </div>`).join('')}
  ${result.attachmentFiles ? `${listAttachments(result.attachmentFiles.filter(file => !file.fileName.includes('screenshot')))}` : ''}
</div>
  `)
}

function wrapPhraseWithSpan(inputString: string): string {
  const stringWithSpan = inputString.replace(/'(.*?)'/g, (match) => {
      return `<span class='step-var'>${match}</span>`;
  });
  return stringWithSpan;
}

function listAttachments(attachments: AttachmentBase64[], showHaeading: boolean = true): string {
  let text = '';
  for(const attachment of attachments) {
    attachment.fileType.startsWith('image')
    ?
    text += `<li>
    <img src="data:image/png;base64,${attachment.base64Data}" alt="${attachment.fileName}">
    </li>`
    :
    text += `<li>
    <a href="data:application/octet-stream;base64,${attachment.base64Data}" download="${attachment.fileName}">Download file ${attachment.fileName}</a>
    </li>`
  }

  if (text.length > 0) {
    let html = ''; 
    if (showHaeading) {
      html = `<h5 class='attachments-heading'>Attachments:</h5>`;  
    }
    html += `<div class="attachments-text"><ul>${text}</ul></div>`
    return html;
  } else {
    return text;
  }
}

function getStatusColor(status: string): string {
  if (status === 'done') return 'green';
  if (status === 'error') return 'red';
  return 'grey';
}


function formatTime(seconds: number) {
  if (seconds < 60) {
      return `${Math.round(seconds)}s`;
  } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${Math.round(remainingSeconds)}s`;
  } else {
      const hours = Math.floor(seconds / 3600);
      const remainingMinutes = Math.floor((seconds % 3600) / 60);
      const remainingSeconds = seconds % 60;
      return `${hours}h ${remainingMinutes}m ${Math.round(remainingSeconds)}s`;
  }
}

function truncateText(text: string, maxLength: number): string {
  text = text.replace(/[\r\n]+/g, ' ');
  if (text.length > maxLength) {
      return text.substring(0, maxLength) + '...';
  } else {
      return text;
  }
}

