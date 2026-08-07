interface StatTileMetric {
    label: string;
    value: string;
}

interface StatTileProps {
    label: string;
    value: string;
    metrics?: StatTileMetric[];
}

export function StatTile({ label, value, metrics }: StatTileProps) {
    return (
        <div className="stat-tile">
            <div className="stat-tile-label">{label}</div>
            <div className="stat-tile-value">{value}</div>
            {metrics && metrics.length > 0 && (
                <div className="stat-tile-metrics">
                    {metrics.map((m) => (
                        <div className="stat-tile-metric" key={m.label}>
                            <span className="stat-tile-metric-label">{m.label}</span>
                            <span className="stat-tile-metric-value">{m.value}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
