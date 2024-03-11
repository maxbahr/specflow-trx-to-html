import { AttachmentBase64 } from "../attachment-base64-converter.js";
import { IGherkinStep } from "./gherkin-step.type.js";

export interface IUnitTestResult {
    testId: string
    testDomainStartTime: Date
    testDomainEndTime: Date
    testDomain: string;
    featureName: string;
    testFullName: string;
    testName: string;
    testParameters: string;
    outcome: string;
    duration: number;
    startTime: Date;
    endTime: Date;
    stdout: string | null;
    gherkinLogs: IGherkinStep[] | null
    attachmentFiles?: AttachmentBase64[] 
    errMsg: string | null;
    rerun: boolean;
    previousRun?: IUnitTestResult;
  }