import { Fragment } from "react";

const INLINE_TOKEN =
  /(\[([^\]]+)\]\(([^)\s]+)(?:\s+["']([^"']*)["'])?\)|\*\*(.+?)\*\*|__(.+?)__|~~(.+?)~~|`([^`]+)`|\*([^*\n]+)\*|_([^_\n]+)_)/g;

function safeLinkTarget(value) {
  const target = value.trim();
  if (/^(https?:|mailto:|tel:)/i.test(target)) return target;
  if (target.startsWith("/") && !target.startsWith("//")) return target;
  if (target.startsWith("#")) return target;
  return null;
}

function renderInline(value, keyPrefix) {
  const nodes = [];
  let cursor = 0;
  let match;
  let tokenIndex = 0;
  const tokenPattern = new RegExp(INLINE_TOKEN.source, "g");

  while ((match = tokenPattern.exec(value)) !== null) {
    if (match.index > cursor) nodes.push(value.slice(cursor, match.index));
    const key = `${keyPrefix}-${tokenIndex++}`;
    if (match[2] !== undefined) {
      const href = safeLinkTarget(match[3]);
      const label = renderInline(match[2], `${key}-label`);
      nodes.push(
        href ? (
          <a
            key={key}
            href={href}
            title={match[4]}
            target={/^https?:/i.test(href) ? "_blank" : undefined}
            rel={/^https?:/i.test(href) ? "noreferrer" : undefined}
            className="font-medium text-lime-300 underline decoration-lime-300/60 underline-offset-4 hover:text-lime-200"
          >
            {label}
          </a>
        ) : (
          <Fragment key={key}>{label}</Fragment>
        )
      );
    } else if (match[5] !== undefined || match[6] !== undefined) {
      nodes.push(
        <strong key={key} className="font-semibold text-slate-100 dark:text-slate-100">
          {renderInline(match[5] ?? match[6], key)}
        </strong>
      );
    } else if (match[7] !== undefined) {
      nodes.push(
        <del key={key} className="text-slate-400">
          {renderInline(match[7], key)}
        </del>
      );
    } else if (match[8] !== undefined) {
      nodes.push(
        <code
          key={key}
          className="rounded-md border border-white/[0.08] bg-[#111111] px-1.5 py-0.5 font-mono text-[0.9em] text-lime-200"
        >
          {match[8]}
        </code>
      );
    } else {
      nodes.push(
        <em key={key} className="italic text-slate-200">
          {renderInline(match[9] ?? match[10], key)}
        </em>
      );
    }
    cursor = match.index + match[0].length;
  }

  if (cursor < value.length) nodes.push(value.slice(cursor));
  return nodes;
}

function isBlockStart(line) {
  return /^(\s*```|\s*#{1,6}\s|\s*[-*+]\s+|\s*\d+[.)]\s+|\s*>|\s*---+\s*$)/.test(line);
}

function renderBlocks(markdown) {
  const lines = String(markdown || "")
    .replace(/\r\n?/g, "\n")
    .split("\n");
  const blocks = [];
  let index = 0;
  let blockIndex = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }
    const key = `block-${blockIndex++}`;

    if (/^\s*```/.test(line)) {
      index += 1;
      const codeLines = [];
      while (index < lines.length && !/^\s*```/.test(lines[index])) codeLines.push(lines[index++]);
      if (index < lines.length) index += 1;
      blocks.push(
        <pre
          key={key}
          className="max-w-full overflow-x-auto rounded-xl border border-white/[0.08] bg-[#111111] p-4 text-sm leading-6 text-slate-100 dark:border-white/[0.08] dark:bg-black/25 dark:text-slate-200"
        >
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      continue;
    }

    const heading = line.match(/^\s*(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      index += 1;
      const level = Math.min(heading[1].length, 4);
      const Heading = `h${level}`;
      const className =
        level === 1
          ? "text-2xl font-bold tracking-tight text-slate-100 dark:text-white"
          : level === 2
            ? "text-xl font-bold tracking-tight text-slate-100 dark:text-white"
            : "text-base font-semibold text-slate-100 dark:text-slate-100";
      blocks.push(
        <Heading key={key} className={className}>
          {renderInline(heading[2], key)}
        </Heading>
      );
      continue;
    }

    if (/^\s*---+\s*$/.test(line)) {
      index += 1;
      blocks.push(<hr key={key} className="border-white/[0.08] dark:border-white/[0.1]" />);
      continue;
    }

    if (/^\s*>/.test(line)) {
      const quoteLines = [];
      while (index < lines.length && /^\s*>/.test(lines[index]))
        quoteLines.push(lines[index++].replace(/^\s*>\s?/, ""));
      blocks.push(
        <blockquote
          key={key}
          className="border-l-2 border-lime-300/70 pl-4 text-slate-300"
        >
          {renderBlocks(quoteLines.join("\n"))}
        </blockquote>
      );
      continue;
    }

    const unordered = line.match(/^\s*[-*+]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (unordered || ordered) {
      const isOrdered = Boolean(ordered);
      const items = [];
      while (index < lines.length) {
        const item = lines[index].match(isOrdered ? /^\s*\d+[.)]\s+(.+)$/ : /^\s*[-*+]\s+(.+)$/);
        if (!item) break;
        items.push(item[1]);
        index += 1;
      }
      const List = isOrdered ? "ol" : "ul";
      blocks.push(
        <List
          key={key}
          className={`space-y-2 pl-6 text-slate-200 dark:text-slate-300 ${isOrdered ? "list-decimal" : "list-disc"}`}
        >
          {items.map((item, itemIndex) => (
            <li key={`${key}-${itemIndex}`} className="pl-1 leading-7">
              {renderInline(item, `${key}-${itemIndex}`)}
            </li>
          ))}
        </List>
      );
      continue;
    }

    const paragraph = [];
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines[index]))
      paragraph.push(lines[index++]);
    if (paragraph.length === 0) {
      paragraph.push(lines[index]);
      index += 1;
    }
    blocks.push(
      <p
        key={key}
        className="whitespace-pre-wrap text-sm leading-7 text-slate-200 dark:text-slate-300 sm:text-base sm:leading-8"
      >
        {renderInline(paragraph.join(" "), key)}
      </p>
    );
  }

  return blocks;
}

export default function MarkdownContent({ children, className = "" }) {
  if (typeof children !== "string" || !children.trim()) return null;
  return (
    <div className={`min-w-0 space-y-4 break-words [&_li]:break-words ${className}`}>
      {renderBlocks(children)}
    </div>
  );
}
