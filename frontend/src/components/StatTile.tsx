interface StatTileProps {
    label: string;
    value: string;
}

export function StatTile({ label, value }: StatTileProps) {
    return (
        <div className="stat-tile">
            <div className="stat-tile-label">{label}</div>
            <div className="stat-tile-value">{value}</div>
        </div>
    );
}
