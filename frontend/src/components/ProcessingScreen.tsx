interface ProcessingScreenProps {
    timedOut: boolean;
    onRetry: () => void;
}

export function ProcessingScreen({ timedOut, onRetry }: ProcessingScreenProps) {
    if (timedOut) {
        return (
            <div className="card processing-screen">
                <p>Still processing — this is taking longer than expected.</p>
                <button className="secondary" onClick={onRetry}>
                    Try again
                </button>
            </div>
        );
    }

    return (
        <div className="card processing-screen">
            <div className="spinner" />
            <p>Processing your file…</p>
        </div>
    );
}
