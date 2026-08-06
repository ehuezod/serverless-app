import { useEffect, useState } from 'react';
import { getOrCreateUserId } from './lib/userId';
import { requestUploadUrl, uploadFileToS3, ApiError } from './lib/apiClient';
import { pollForSummary, PollTimeoutError } from './lib/pollForSummary';
import type { SummaryItem } from './lib/types';
import { UploadScreen } from './components/UploadScreen';
import { ProcessingScreen } from './components/ProcessingScreen';
import { ResultsScreen } from './components/ResultsScreen';

type ConfigState =
    | { status: 'loading' }
    | { status: 'ready'; apiUrl: string }
    | { status: 'error'; message: string };

type FlowState =
    | { status: 'idle'; error?: string }
    | { status: 'uploading' }
    | { status: 'processing'; timedOut: boolean; uploadKey: string }
    | { status: 'results'; summary: SummaryItem };

export default function App() {
    const [config, setConfig] = useState<ConfigState>({ status: 'loading' });
    const [flow, setFlow] = useState<FlowState>({ status: 'idle' });

    useEffect(() => {
        fetch('/config.json')
            .then((res) => {
                if (!res.ok) throw new Error('bad response');
                return res.json();
            })
            .then((data: { apiUrl: string }) => setConfig({ status: 'ready', apiUrl: data.apiUrl }))
            .catch(() => setConfig({ status: 'error', message: 'Failed to load app configuration.' }));
    }, []);

    async function handleUpload(file: File) {
        if (config.status !== 'ready') return;
        setFlow({ status: 'uploading' });
        try {
            const userId = getOrCreateUserId();
            const { uploadUrl, key } = await requestUploadUrl(config.apiUrl, userId, file.name);
            await uploadFileToS3(uploadUrl, file);
            runPoll(config.apiUrl, userId, key);
        } catch (err) {
            const message = err instanceof ApiError ? err.message : 'Upload failed unexpectedly.';
            setFlow({ status: 'idle', error: message });
        }
    }

    function runPoll(apiUrl: string, userId: string, uploadKey: string) {
        setFlow({ status: 'processing', timedOut: false, uploadKey });
        pollForSummary({ apiUrl, userId, uploadKey })
            .then((summary) => setFlow({ status: 'results', summary }))
            .catch((err) => {
                if (err instanceof PollTimeoutError) {
                    setFlow({ status: 'processing', timedOut: true, uploadKey });
                } else {
                    setFlow({ status: 'idle', error: 'Something went wrong while checking on your file.' });
                }
            });
    }

    function handleRetryPoll() {
        if (config.status !== 'ready' || flow.status !== 'processing') return;
        const userId = getOrCreateUserId();
        runPoll(config.apiUrl, userId, flow.uploadKey);
    }

    return (
        <div className="app-shell">
            <h1 className="app-title">Supplier Analyzer</h1>

            {config.status === 'loading' && <p>Loading…</p>}
            {config.status === 'error' && <div className="error-banner">{config.message}</div>}

            {config.status === 'ready' && (
                <>
                    {flow.status === 'idle' && <UploadScreen onSubmit={handleUpload} errorMessage={flow.error} />}
                    {flow.status === 'uploading' && <ProcessingScreen timedOut={false} onRetry={() => {}} />}
                    {flow.status === 'processing' && (
                        <ProcessingScreen timedOut={flow.timedOut} onRetry={handleRetryPoll} />
                    )}
                    {flow.status === 'results' && (
                        <ResultsScreen summary={flow.summary} onUploadAnother={() => setFlow({ status: 'idle' })} />
                    )}
                </>
            )}
        </div>
    );
}
