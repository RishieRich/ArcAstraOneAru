import { useState } from "react";
import { uploadFinancialFile } from "../api";
import { IconCheck, IconUpload } from "../icons";

const KINDS = ["sales", "purchase", "expense"];

export default function FinancialUpload({ tenantId, t, onImported, onClose }) {
  const [uploading, setUploading] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function upload(kind, event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(kind);
    setResult(null);
    setError("");
    try {
      const imported = await uploadFinancialFile({ tenantId, kind, file });
      setResult(imported);
      await onImported(imported);
    } catch (uploadError) {
      setError(uploadError.message || t.uploadFailed);
    } finally {
      setUploading("");
    }
  }

  return (
    <section className="card upload-panel" aria-labelledby="upload-title">
      <div className="upload-head">
        <div>
          <h3 id="upload-title"><IconUpload /> {t.uploadTitle}</h3>
          <p className="sub">{t.uploadSub}</p>
        </div>
        <button className="panel-close" type="button" onClick={onClose} aria-label={t.close}>
          ×
        </button>
      </div>

      <div className="upload-kinds">
        {KINDS.map((kind) => (
          <label className={`upload-kind ${kind}`} key={kind}>
            <span className="upload-kind-name">{t.kindLabels[kind]}</span>
            <span className="upload-kind-help">{t.uploadKindHelp[kind]}</span>
            <span className="upload-action">
              <IconUpload width={15} height={15} />
              {uploading === kind ? t.uploading : t.chooseFile}
            </span>
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              disabled={Boolean(uploading)}
              onChange={(event) => upload(kind, event)}
            />
          </label>
        ))}
      </div>

      <p className="upload-privacy">{t.uploadPrivacy}</p>

      <div className="upload-feedback" aria-live="polite">
        {error && <div className="upload-message error">{t.uploadFailed}: {error}</div>}
        {result && (
          <div className="upload-message success">
            <IconCheck width={17} height={17} />
            <span>
              {result.duplicate
                ? t.alreadyImported(result.transactions)
                : t.uploadSuccess(
                    t.kindLabels[result.detected_kind],
                    result.transactions,
                  )}
              {result.date_range?.from && (
                <small>
                  {result.date_range.from} — {result.date_range.to || result.date_range.from}
                </small>
              )}
              <small>
                {result.source_format === "adaptive-flat-register"
                  ? t.adaptiveSchemaDetected
                  : t.standardSchemaDetected}
              </small>
              {result.possible_duplicate_groups > 0 && (
                <small className="upload-warning">
                  {t.possibleDuplicateGroups(result.possible_duplicate_groups)}
                </small>
              )}
              {result.warnings?.some((warning) =>
                warning.includes("does not reconcile"),
              ) && (
                <small className="upload-warning">{t.totalMismatchWarning}</small>
              )}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
