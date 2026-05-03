/**
 * eleata Validate XRechnung — GitHub Action entrypoint.
 *
 * Loops over files matching `inputs.files` glob, POSTs each to api.eleata.io,
 * collects results, exits non-zero if any fail (or fail-fast on first).
 */

import * as core from "@actions/core";
import * as glob from "@actions/glob";
import * as fs from "node:fs/promises";

interface ValidationResult {
  valid: boolean;
  format: string;
  errors: { level: string; message: string }[];
  warnings: { level: string; message: string }[];
  public_id: string;
  report_url: string;
  duration_ms: number;
}

async function validateFile(
  baseUrl: string,
  apiKey: string,
  format: string,
  filePath: string,
  xmlBytes: Buffer,
): Promise<{ filePath: string; result: ValidationResult }> {
  const r = await fetch(`${baseUrl}/v1/validate?format=${encodeURIComponent(format)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/xml",
      "User-Agent": "eleata-action/0.1.0",
    },
    body: xmlBytes,
  });
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`HTTP ${r.status} for ${filePath}: ${body}`);
  }
  const result = (await r.json()) as ValidationResult;
  return { filePath, result };
}

async function run(): Promise<void> {
  try {
    const filesPattern = core.getInput("files", { required: true });
    const format = core.getInput("format") || "peppol-bis-3";
    const apiKey = core.getInput("api-key", { required: true });
    const failFast = core.getBooleanInput("fail-fast");
    const baseUrl = core.getInput("base-url") || "https://api.eleata.io";

    const globber = await glob.create(filesPattern);
    const files = await globber.glob();

    if (files.length === 0) {
      core.warning(`no files matched pattern: ${filesPattern}`);
      core.setOutput("valid-count", 0);
      core.setOutput("error-count", 0);
      core.setOutput("report-urls", "[]");
      return;
    }

    let validCount = 0;
    let errorCount = 0;
    const reportUrls: string[] = [];

    for (const filePath of files) {
      const xmlBytes = await fs.readFile(filePath);
      try {
        const { result } = await validateFile(baseUrl, apiKey, format, filePath, xmlBytes);
        reportUrls.push(result.report_url);
        if (result.valid) {
          validCount++;
          core.info(`✓ ${filePath} (${result.duration_ms}ms) → ${result.report_url}`);
        } else {
          errorCount++;
          core.error(
            `✗ ${filePath}: ${result.errors.length} errors. Report: ${result.report_url}`,
            { file: filePath },
          );
          for (const err of result.errors.slice(0, 5)) {
            core.error(`  - ${err.level}: ${err.message}`);
          }
          if (failFast) {
            throw new Error(`fail-fast: ${filePath} invalid`);
          }
        }
      } catch (err) {
        errorCount++;
        core.error(`× ${filePath}: ${(err as Error).message}`);
        if (failFast) throw err;
      }
    }

    core.setOutput("valid-count", validCount);
    core.setOutput("error-count", errorCount);
    core.setOutput("report-urls", JSON.stringify(reportUrls));

    core.summary
      .addHeading("eleata Validate Report", 2)
      .addTable([
        [{ data: "Format", header: true }, { data: format }],
        [{ data: "Files checked", header: true }, { data: String(files.length) }],
        [{ data: "Valid", header: true }, { data: String(validCount) }],
        [{ data: "Invalid", header: true }, { data: String(errorCount) }],
      ]);
    if (reportUrls.length > 0) {
      core.summary.addHeading("Reports", 3);
      core.summary.addList(reportUrls.map((u) => `<a href="${u}">${u}</a>`));
    }
    await core.summary.write();

    if (errorCount > 0) {
      core.setFailed(`${errorCount} file(s) failed validation`);
    }
  } catch (err) {
    core.setFailed((err as Error).message);
  }
}

run();
