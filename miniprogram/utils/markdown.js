/**
 * Markdown → HTML 转换工具
 * 供 report 页和 reports 收藏页共享
 */

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function markdownToHtml(markdown) {
  if (!markdown || typeof markdown !== 'string') return '';

  let headingCount = 0;
  const spacer = '<div style="display:block;height:28rpx;"></div>';

  const styles = {
    h1: 'font-size:32rpx;color:#2c2c2c;font-weight:600;margin:24rpx 0 16rpx;padding-bottom:12rpx;line-height:1.6;display:block;border-bottom:1rpx solid #eee;',
    h2: 'font-size:30rpx;color:#2c2c2c;font-weight:600;margin:0 0 12rpx;line-height:1.6;display:block;',
    h2_first: 'font-size:30rpx;color:#2c2c2c;font-weight:600;margin:20rpx 0 12rpx;line-height:1.6;display:block;',
    h3: 'font-size:30rpx;color:#333;font-weight:600;margin:0 0 10rpx;line-height:1.6;display:block;',
    h3_first: 'font-size:30rpx;color:#333;font-weight:600;margin:20rpx 0 10rpx;line-height:1.6;display:block;',
    h4: 'font-size:28rpx;color:#444;font-weight:500;margin:0 0 8rpx;line-height:1.6;display:block;',
    h4_first: 'font-size:28rpx;color:#444;font-weight:500;margin:16rpx 0 8rpx;line-height:1.6;display:block;',
    p: 'margin:12rpx 0;line-height:1.8;font-size:28rpx;color:#555;display:block;',
    ul: 'margin:12rpx 0;padding-left:36rpx;display:block;list-style-type:disc;',
    ol: 'margin:12rpx 0;padding-left:36rpx;display:block;list-style-type:decimal;',
    li: 'margin:8rpx 0;line-height:1.8;font-size:28rpx;color:#555;display:list-item;',
    table: 'width:100%;border-collapse:collapse;margin:20rpx 0;font-size:24rpx;display:table;table-layout:fixed;',
    th: 'border:1rpx solid #ddd;padding:16rpx 12rpx;text-align:center;background:#f8f8f8;color:#333;font-weight:500;font-size:24rpx;word-break:break-all;letter-spacing:1rpx;',
    td: 'border:1rpx solid #ddd;padding:14rpx 10rpx;text-align:center;color:#666;font-size:24rpx;word-break:break-all;vertical-align:middle;letter-spacing:2rpx;',
    strong: 'color:#2c2c2c;font-weight:600;',
    em: 'font-style:italic;color:#666;',
  };

  let html = markdown;

  // 表格
  html = html.replace(/\|(.+)\|\n\|[-:\|\s]+\|\n((?:\|.+\|\n?)+)/g, (_, header, body) => {
    const headerCells = header.split('|').filter(c => c.trim()).map(c => `<th style="${styles.th}">${escapeHtml(c.trim())}</th>`).join('');
    const rows = body.trim().split('\n').map(row => {
      const cells = row.split('|').filter(c => c.trim()).map(c => `<td style="${styles.td}">${escapeHtml(c.trim())}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('');
    return `<table style="${styles.table}"><thead><tr>${headerCells}</tr></thead><tbody>${rows}</tbody></table>`;
  });

  // 标题
  html = html.replace(/^\s*####\s+(.+)$/gm, (_, content) => {
    headingCount++;
    return headingCount > 1
      ? `${spacer}<h4 style="${styles.h4}">${escapeHtml(content.trim())}</h4>`
      : `<h4 style="${styles.h4_first}">${escapeHtml(content.trim())}</h4>`;
  });
  html = html.replace(/^\s*###\s+(.+)$/gm, (_, content) => {
    headingCount++;
    return headingCount > 1
      ? `${spacer}<h3 style="${styles.h3}">${escapeHtml(content.trim())}</h3>`
      : `<h3 style="${styles.h3_first}">${escapeHtml(content.trim())}</h3>`;
  });
  html = html.replace(/^\s*##\s+(.+)$/gm, (_, content) => {
    headingCount++;
    return headingCount > 1
      ? `${spacer}<h2 style="${styles.h2}">${escapeHtml(content.trim())}</h2>`
      : `<h2 style="${styles.h2_first}">${escapeHtml(content.trim())}</h2>`;
  });
  html = html.replace(/^\s*#\s+(.+)$/gm, (_, content) => `<h1 style="${styles.h1}">${escapeHtml(content.trim())}</h1>`);

  // 粗体和斜体
  html = html.replace(/\*\*\*([^\s*][^*]*?[^\s*])\*\*\*/g, `<strong style="${styles.strong}"><em style="${styles.em}">$1</em></strong>`);
  html = html.replace(/___([^\s_][^_]*?[^\s_])___/g, `<strong style="${styles.strong}"><em style="${styles.em}">$1</em></strong>`);
  html = html.replace(/\*\*([^\s*][^*]*?[^\s*])\*\*/g, `<strong style="${styles.strong}">$1</strong>`);
  html = html.replace(/__([^\s_][^_]*?[^\s_])__/g, `<strong style="${styles.strong}">$1</strong>`);
  html = html.replace(/\*([^\s*][^*]*?[^\s*])\*/g, `<em style="${styles.em}">$1</em>`);
  html = html.replace(/\*\*([^\s*])\*\*/g, `<strong style="${styles.strong}">$1</strong>`);
  html = html.replace(/\*([^\s*])\*/g, `<em style="${styles.em}">$1</em>`);

  // 列表和段落
  const lines = html.split('\n');
  const processed = [];
  let listItems = [];
  let listType = null;
  let paragraphContent = [];

  const flushParagraph = () => {
    if (paragraphContent.length > 0) {
      processed.push(`<p style="${styles.p}">${paragraphContent.join('<br/>')}</p>`);
      paragraphContent = [];
    }
  };
  const flushList = () => {
    if (listItems.length > 0 && listType) {
      const ls = listType === 'ul' ? styles.ul : styles.ol;
      processed.push(`<${listType} style="${ls}">${listItems.join('')}</${listType}>`);
      listItems = [];
      listType = null;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const isHtml = trimmed.startsWith('<h') || trimmed.startsWith('<table') || trimmed.startsWith('<div') || trimmed.startsWith('</');
    const ulMatch = trimmed.match(/^[-*]\s+(.+)$/);
    const olMatch = trimmed.match(/^\d+\.\s+(.+)$/);

    if (trimmed === '') { flushParagraph(); flushList(); continue; }
    if (ulMatch) { flushParagraph(); if (listType && listType !== 'ul') flushList(); listType = 'ul'; listItems.push(`<li style="${styles.li}">${ulMatch[1]}</li>`); }
    else if (olMatch) { flushParagraph(); if (listType && listType !== 'ol') flushList(); listType = 'ol'; listItems.push(`<li style="${styles.li}">${olMatch[1]}</li>`); }
    else if (isHtml) { flushParagraph(); flushList(); processed.push(line); }
    else { flushList(); paragraphContent.push(trimmed); }
  }
  flushParagraph();
  flushList();

  return processed.join('');
}

module.exports = { markdownToHtml, escapeHtml };
