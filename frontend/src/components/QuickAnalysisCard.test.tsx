import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { QuickAnalysisCard } from './QuickAnalysisCard';

describe('QuickAnalysisCard', () => {
    test('renders the analysis text when present', () => {
        const html = renderToStaticMarkup(<QuickAnalysisCard analysis="Move your office spend to Amazon Business." />);
        expect(html).toContain('Move your office spend to Amazon Business.');
        expect(html).toContain('Amazon Business');
    });

    test('renders nothing when analysis is absent', () => {
        const html = renderToStaticMarkup(<QuickAnalysisCard />);
        expect(html).toBe('');
    });

    test('renders nothing when analysis is an empty string', () => {
        const html = renderToStaticMarkup(<QuickAnalysisCard analysis="" />);
        expect(html).toBe('');
    });
});
