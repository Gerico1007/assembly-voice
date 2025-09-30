import React, { useMemo } from 'react';
import MarkdownIt from 'markdown-it';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  const md = useMemo(() => {
    return new MarkdownIt({
      html: false,
      linkify: true,
      typographer: true,
      breaks: true,
    });
  }, []);

  const htmlContent = useMemo(() => {
    return md.render(content);
  }, [content, md]);

  return (
    <div
      className={`markdown-content ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};

export default MarkdownRenderer;
