import type { Submission } from '@workspace/api-client-react';

// Spreadsheet apps run cells starting with = + - @ as formulas; prefix them so exports stay inert.
function cell(v: unknown) {
  const value = String(v ?? '');
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

function download(name: string, rows: unknown[][]) {
  const csv = '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function body(s: Submission) {
  const meta = [
    `Campaign: ${s.campaignTitle}`,
    `Tester: @${s.username}`,
    s.mediaUrl && `Recording: ${s.mediaUrl}`,
    s.accountEmail && `Account email: ${s.accountEmail}`,
    `BETADROP report #${s.id}, ${s.createdAt.slice(0, 10)}`,
  ].filter(Boolean);
  return `${s.content}\n\n${meta.join('\n')}`;
}

export function exportCsv(subs: Submission[]) {
  download('betadrop-reports', [
    ['id', 'campaign', 'tester', 'title', 'severity', 'status', 'reason', 'account_email', 'media_url', 'created_at', 'content'],
    ...subs.map((s) => [s.id, s.campaignTitle, s.username, s.title, s.severity, s.status, s.reason, s.accountEmail, s.mediaUrl, s.createdAt, s.content]),
  ]);
}

const JIRA_PRIORITY: Record<string, string> = { critical: 'Highest', high: 'High', medium: 'Medium', low: 'Low' };

/** Columns match Jira's CSV importer defaults (Summary, Description, Priority, Labels). */
export function exportJira(subs: Submission[]) {
  download('betadrop-jira', [
    ['Summary', 'Description', 'Priority', 'Labels', 'Labels'],
    ...subs.map((s) => [s.title, body(s), JIRA_PRIORITY[s.severity] ?? 'Medium', 'betadrop', `severity-${s.severity}`]),
  ]);
}

/** Prefilled "new issue" link; GitHub opens it in the founder's own session. */
export function githubIssueUrl(repo: string, s: Submission) {
  const params = new URLSearchParams({ title: s.title, body: body(s), labels: 'betadrop' });
  return `https://github.com/${repo}/issues/new?${params}`;
}
