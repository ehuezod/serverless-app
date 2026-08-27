interface QuickAnalysisCardProps {
    analysis?: string;
}

export function QuickAnalysisCard({ analysis }: QuickAnalysisCardProps) {
    if (!analysis) {
        return null;
    }

    return (
        <div className="card quick-analysis-card">
            <span className="quick-analysis-badge">Amazon Business</span>
            <p className="section-title">Quick analysis</p>
            <p className="quick-analysis-text">{analysis}</p>
        </div>
    );
}
