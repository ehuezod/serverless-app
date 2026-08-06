import { useRef, useState } from 'react';

interface UploadScreenProps {
    onSubmit: (file: File) => void;
    errorMessage?: string;
}

export function UploadScreen({ onSubmit, errorMessage }: UploadScreenProps) {
    const [file, setFile] = useState<File | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="card">
            <p className="section-title">Upload a transactions CSV</p>
            <div className="dropzone" onClick={() => inputRef.current?.click()} role="button" tabIndex={0}>
                <input
                    ref={inputRef}
                    type="file"
                    accept=".csv,text/csv"
                    style={{ display: 'none' }}
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <p>Click to choose a .csv file, or drop it here.</p>
                {file && <p className="file-name">{file.name}</p>}
            </div>
            <button className="primary" disabled={!file} onClick={() => file && onSubmit(file)}>
                Upload &amp; analyze
            </button>
            {errorMessage && <div className="error-banner">{errorMessage}</div>}
        </div>
    );
}
