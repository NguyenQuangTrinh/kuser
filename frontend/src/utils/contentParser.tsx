import React from 'react';

export const parseContent = (content: string) => {
    if (!content) return null;

    // Split by newline first
    const lines = content.split('\n');

    return lines.map((line, lineIndex) => {
        // Regex to find URLs
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = line.split(urlRegex);

        const parsedLine = parts.map((part, partIndex) => {
            if (part.match(urlRegex)) {
                return (
                    <a
                        key={`${lineIndex}-${partIndex}`}
                        href={part}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline break-all"
                    >
                        {part}
                    </a>
                );
            }
            return <span key={`${lineIndex}-${partIndex}`}>{part}</span>;
        });

        return (
            <div key={lineIndex} className="min-h-[1.5em]">
                {parsedLine}
            </div>
        );
    });
};
