/**
 * 将 Markdown 报告转换为带真正 HTML 表格的网页文件
 * 用法: node scripts/convert-md-to-html.cjs
 */
const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '..', '项目全面深度分析报告-2026-04-05-更新版.md');
const outputFile = path.join(__dirname, '..', '项目全面深度分析报告-2026-04-05-更新版.html');

const md = fs.readFileSync(inputFile, 'utf-8');

// --- Markdown to HTML converter (minimal, handles tables, headers, lists, code, bold, etc.) ---

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inlineFormat(text) {
  // bold
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // inline code
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  // links
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  // emoji-safe
  return text;
}

function parseTable(lines) {
  // lines[0] = header, lines[1] = separator, lines[2..] = data rows
  const parseRow = (line) => {
    let cells = line.split('|').map(c => c.trim());
    // Remove empty first/last entries caused by leading/trailing |
    if (cells.length > 0 && cells[0] === '') cells.shift();
    if (cells.length > 0 && cells[cells.length - 1] === '') cells.pop();
    return cells;
  };

  const headers = parseRow(lines[0]);
  const rows = lines.slice(2).map(parseRow);

  let html = '<table>\n<thead>\n<tr>\n';
  headers.forEach(h => { html += '  <th>' + inlineFormat(h) + '</th>\n'; });
  html += '</tr>\n</thead>\n<tbody>\n';
  rows.forEach(row => {
    html += '<tr>\n';
    row.forEach((cell, i) => {
      // pad if row has fewer cells than header
      html += '  <td>' + inlineFormat(cell || '') + '</td>\n';
    });
    // pad missing cells
    for (let i = row.length; i < headers.length; i++) {
      html += '  <td></td>\n';
    }
    html += '</tr>\n';
  });
  html += '</tbody>\n</table>\n';
  return html;
}

function convert(md) {
  const lines = md.split('\n');
  let html = '';
  let i = 0;
  let inCodeBlock = false;
  let codeContent = '';
  let inList = false;

  while (i < lines.length) {
    const line = lines[i];

    // Code blocks
    if (line.trimStart().startsWith('```')) {
      if (!inCodeBlock) {
        if (inList) { html += '</ul>\n'; inList = false; }
        inCodeBlock = true;
        codeContent = '';
        i++;
        continue;
      } else {
        inCodeBlock = false;
        html += '<pre><code>' + escapeHtml(codeContent) + '</code></pre>\n';
        i++;
        continue;
      }
    }
    if (inCodeBlock) {
      codeContent += line + '\n';
      i++;
      continue;
    }

    // HTML comments - skip
    if (line.trim().startsWith('<!--')) {
      i++;
      continue;
    }

    // Table detection: current line has |, next line has |---|
    if (line.includes('|') && i + 1 < lines.length && /^\s*\|[\s\-:|]+\|/.test(lines[i + 1])) {
      if (inList) { html += '</ul>\n'; inList = false; }
      // Collect all table lines
      const tableLines = [];
      let j = i;
      while (j < lines.length && lines[j].includes('|') && lines[j].trim() !== '') {
        tableLines.push(lines[j]);
        j++;
      }
      html += parseTable(tableLines);
      i = j;
      continue;
    }

    // Horizontal rule
    if (/^---+\s*$/.test(line.trim())) {
      if (inList) { html += '</ul>\n'; inList = false; }
      html += '<hr>\n';
      i++;
      continue;
    }

    // Headers
    const headerMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headerMatch) {
      if (inList) { html += '</ul>\n'; inList = false; }
      const level = headerMatch[1].length;
      html += '<h' + level + '>' + inlineFormat(headerMatch[2]) + '</h' + level + '>\n';
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('>')) {
      if (inList) { html += '</ul>\n'; inList = false; }
      html += '<blockquote>' + inlineFormat(line.substring(1).trim()) + '</blockquote>\n';
      i++;
      continue;
    }

    // Unordered list
    const listMatch = line.match(/^(\s*)[-*]\s+(.+)/);
    if (listMatch) {
      if (!inList) { html += '<ul>\n'; inList = true; }
      html += '<li>' + inlineFormat(listMatch[2]) + '</li>\n';
      i++;
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^(\s*)\d+\.\s+(.+)/);
    if (olMatch) {
      if (!inList) { html += '<ul>\n'; inList = true; }
      html += '<li>' + inlineFormat(olMatch[2]) + '</li>\n';
      i++;
      continue;
    }

    // Close list if we hit non-list content
    if (inList && line.trim() === '') {
      html += '</ul>\n';
      inList = false;
      i++;
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Regular paragraph
    if (inList) { html += '</ul>\n'; inList = false; }
    html += '<p>' + inlineFormat(line) + '</p>\n';
    i++;
  }

  if (inList) html += '</ul>\n';
  return html;
}

const bodyHtml = convert(md);

const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>云客CRM系统 - 全项目深度分析报告（2026-04-05 更新版）</title>
<style>
  body {
    font-family: "Microsoft YaHei", "PingFang SC", "Helvetica Neue", Arial, sans-serif;
    max-width: 1100px;
    margin: 0 auto;
    padding: 30px 40px;
    color: #333;
    line-height: 1.7;
    background: #fff;
  }
  h1 { color: #1a5276; border-bottom: 3px solid #2980b9; padding-bottom: 12px; font-size: 28px; }
  h2 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 8px; margin-top: 40px; font-size: 22px; }
  h3 { color: #34495e; margin-top: 25px; font-size: 18px; }
  h4 { color: #5d6d7e; margin-top: 18px; font-size: 16px; }
  blockquote { border-left: 4px solid #3498db; padding: 8px 16px; margin: 10px 0; background: #eaf2f8; color: #2c3e50; }
  hr { border: none; border-top: 1px solid #d5dbdb; margin: 30px 0; }
  code { background: #f4f6f7; padding: 2px 6px; border-radius: 3px; font-size: 14px; color: #c0392b; font-family: Consolas, "Courier New", monospace; }
  pre { background: #2c3e50; color: #ecf0f1; padding: 16px 20px; border-radius: 6px; overflow-x: auto; line-height: 1.5; }
  pre code { background: none; color: inherit; padding: 0; font-size: 13px; }
  strong { color: #2c3e50; }
  a { color: #2980b9; text-decoration: none; }
  a:hover { text-decoration: underline; }
  p { margin: 8px 0; }
  ul, ol { padding-left: 24px; }
  li { margin: 4px 0; }

  /* ===== 核心：真正的单元格表格样式 ===== */
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 16px 0 24px 0;
    font-size: 14px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  th, td {
    border: 1px solid #bdc3c7;
    padding: 10px 14px;
    text-align: left;
    vertical-align: top;
  }
  th {
    background: #2c3e50;
    color: #fff;
    font-weight: 600;
    font-size: 13px;
    text-transform: none;
  }
  tr:nth-child(even) { background: #f8f9fa; }
  tr:nth-child(odd) { background: #fff; }
  tr:hover { background: #eaf2f8; }
  td code { font-size: 12px; }

  /* 打印优化 */
  @media print {
    body { padding: 10px; }
    table { page-break-inside: avoid; }
    h2 { page-break-before: always; }
    pre { white-space: pre-wrap; }
  }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;

fs.writeFileSync(outputFile, fullHtml, 'utf-8');
console.log('Done! Output: ' + outputFile);
console.log('File size: ' + (fs.statSync(outputFile).size / 1024).toFixed(1) + ' KB');


