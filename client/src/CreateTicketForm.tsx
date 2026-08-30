import { FormEvent, useEffect, useState } from "react";
import {
  createTicket,
  uploadAttachment,
  fetchCategories,
  fetchRelatedSystems,
  type Category,
  type DevelopmentRequester,
  type RelatedSystem,
  type RequestedPriority,
  type Ticket,
} from "./api";

type ReferenceState = "loading" | "ready" | "error";
type FormValues = { categoryId: string; relatedSystemId: string; summary: string; requestedPriority: "" | RequestedPriority; description: string; };
type FormErrors = Partial<Record<keyof FormValues, string>>;

const initialValues: FormValues = { categoryId: "", relatedSystemId: "", summary: "", requestedPriority: "", description: "" };

export default function CreateTicketForm({ requester, onCancel }: { requester: DevelopmentRequester; onCancel: () => void }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [relatedSystems, setRelatedSystems] = useState<RelatedSystem[]>([]);
  const [referenceState, setReferenceState] = useState<ReferenceState>("loading");
  const [referenceError, setReferenceError] = useState("");
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "error" | "success">("idle");
  const [submitError, setSubmitError] = useState("");
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentError, setAttachmentError] = useState("");

  async function loadReferenceData() {
    setReferenceState("loading");
    setReferenceError("");
    try {
      const [loadedCategories, loadedSystems] = await Promise.all([fetchCategories(), fetchRelatedSystems()]);
      setCategories(loadedCategories);
      setRelatedSystems(loadedSystems);
      setReferenceState("ready");
    } catch (error) {
      setReferenceError(error instanceof Error ? error.message : "Unable to load ticket reference data.");
      setReferenceState("error");
    }
  }

  useEffect(() => { void loadReferenceData(); }, []);

  function update<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function validate(): FormErrors {
    const nextErrors: FormErrors = {};
    if (!values.categoryId) nextErrors.categoryId = "Choose a category.";
    if (!values.relatedSystemId) nextErrors.relatedSystemId = "Choose a related system.";
    if (values.summary.trim().length < 5 || values.summary.trim().length > 160) nextErrors.summary = "Summary must be between 5 and 160 characters.";
    if (!values.requestedPriority) nextErrors.requestedPriority = "Choose a requested priority.";
    if (values.description.trim().length < 10 || values.description.trim().length > 4_000) nextErrors.description = "Description must be between 10 and 4,000 characters.";
    return nextErrors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSubmitState("submitting");
    setSubmitError("");
    try {
      const ticket = await createTicket({
        requesterId: requester.id,
        categoryId: Number(values.categoryId),
        relatedSystemId: Number(values.relatedSystemId),
        summary: values.summary.trim(),
        requestedPriority: values.requestedPriority as RequestedPriority,
        description: values.description.trim(),
      });
      setCreatedTicket(ticket);
      if (attachmentFile) { try { await uploadAttachment(ticket.id, requester.id, attachmentFile); } catch (error) { setAttachmentError(error instanceof Error ? error.message : "Ticket was created, but the attachment could not be uploaded."); } }
      setSubmitState("success");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to create the ticket.");
      setSubmitState("error");
    }
  }

  if (createdTicket) {
    return <section className="card shadow-sm border-0"><div className="card-body p-4"><h1 className="h3">Ticket created</h1><div className="alert toktickit-context" role="status">Your official ticket number is <strong>{createdTicket.ticketNumber}</strong>.</div>{attachmentError && <div className="alert alert-warning" role="alert"><strong>Ticket created, attachment not uploaded</strong><div>{attachmentError}</div></div>}<button className="btn btn-toktickit-primary" onClick={onCancel}>Back to My Tickets</button></div></section>;
  }

  return <section className="card shadow-sm border-0" aria-labelledby="create-ticket-heading"><div className="card-body p-4 p-md-5"><h1 id="create-ticket-heading" className="h3 mb-4">Create Ticket</h1>
    <form onSubmit={(event) => void handleSubmit(event)} noValidate>
      <div className="row g-3">
        <div className="col-md-6"><label className="form-label fw-semibold" htmlFor="ticket-requester">Requester</label><input id="ticket-requester" className="form-control toktickit-readonly" value={requester.name} readOnly /></div>
        <div className="col-md-3"><label className="form-label fw-semibold" htmlFor="ticket-date">Ticket Date</label><input id="ticket-date" className="form-control toktickit-readonly" value="Set by server on submission" readOnly /></div>
        <div className="col-md-3"><label className="form-label fw-semibold" htmlFor="ticket-number">Ticket Number</label><input id="ticket-number" className="form-control toktickit-readonly" value="Generated on submission" readOnly /></div>
      </div>
      {referenceState === "loading" && <p className="mt-4" role="status">Loading ticket reference data...</p>}
      {referenceState === "error" && <div className="alert alert-danger mt-4" role="alert"><strong>Reference data unavailable</strong><div>{referenceError}</div><button type="button" className="btn btn-outline-danger mt-3" onClick={() => void loadReferenceData()}>Try again</button></div>}
      {referenceState === "ready" && <>
        <div className="row g-3 mt-1">
          <FieldSelect id="ticket-category" label="Category" required value={values.categoryId} error={errors.categoryId} onChange={(value) => update("categoryId", value)} options={categories} placeholder="Choose a category" />
          <FieldSelect id="ticket-system" label="Related System" required value={values.relatedSystemId} error={errors.relatedSystemId} onChange={(value) => update("relatedSystemId", value)} options={relatedSystems} placeholder="Choose a related system" />
          <div className="col-md-6"><label className="form-label fw-semibold" htmlFor="ticket-priority">Requested Priority <span className="text-danger" aria-hidden="true">*</span></label><select id="ticket-priority" className={`form-select ${errors.requestedPriority ? "is-invalid" : ""}`} value={values.requestedPriority} onChange={(event) => update("requestedPriority", event.target.value as FormValues["requestedPriority"])} aria-describedby={errors.requestedPriority ? "ticket-priority-error" : undefined}><option value="">Choose a priority</option><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option></select>{errors.requestedPriority && <div id="ticket-priority-error" className="invalid-feedback">{errors.requestedPriority}</div>}</div>
          <div className="col-12"><label className="form-label fw-semibold" htmlFor="ticket-summary">Ticket Summary <span className="text-danger" aria-hidden="true">*</span></label><input id="ticket-summary" className={`form-control ${errors.summary ? "is-invalid" : ""}`} value={values.summary} onChange={(event) => update("summary", event.target.value)} aria-describedby={errors.summary ? "ticket-summary-error" : undefined} />{errors.summary && <div id="ticket-summary-error" className="invalid-feedback">{errors.summary}</div>}</div>
          <div className="col-12"><label className="form-label fw-semibold" htmlFor="ticket-description">Description <span className="text-danger" aria-hidden="true">*</span></label><textarea id="ticket-description" rows={5} className={`form-control ${errors.description ? "is-invalid" : ""}`} value={values.description} onChange={(event) => update("description", event.target.value)} aria-describedby={errors.description ? "ticket-description-error" : undefined} />{errors.description && <div id="ticket-description-error" className="invalid-feedback">{errors.description}</div>}</div>
          <div className="col-12"><label className="form-label fw-semibold" htmlFor="ticket-attachment">Attachments</label><input id="ticket-attachment" className="form-control" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(event) => setAttachmentFile(event.target.files?.[0] ?? null)} aria-describedby="ticket-attachment-help" /><div id="ticket-attachment-help" className="form-text">Optional: JPG, PNG, WEBP, or PDF up to 5 MB. It uploads after the ticket is created.</div></div>
        </div>
        {submitState === "error" && <div className="alert alert-danger mt-4" role="alert"><strong>Ticket not created</strong><div>{submitError}</div></div>}
        <div className="d-flex gap-2 mt-4"><button type="button" className="btn btn-toktickit-outline" onClick={onCancel} disabled={submitState === "submitting"}>Cancel</button><button type="submit" className="btn btn-toktickit-primary" disabled={submitState === "submitting"}>{submitState === "submitting" ? "Submitting…" : "Submit Ticket"}</button></div>
      </>}
    </form>
  </div></section>;
}

function FieldSelect({ id, label, required, value, error, onChange, options, placeholder }: { id: string; label: string; required: boolean; value: string; error?: string; onChange: (value: string) => void; options: { id: number; name: string }[]; placeholder: string }) {
  return <div className="col-md-6"><label className="form-label fw-semibold" htmlFor={id}>{label} {required && <span className="text-danger" aria-hidden="true">*</span>}</label><select id={id} className={`form-select ${error ? "is-invalid" : ""}`} value={value} onChange={(event) => onChange(event.target.value)} aria-describedby={error ? `${id}-error` : undefined}><option value="">{placeholder}</option>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select>{error && <div id={`${id}-error`} className="invalid-feedback">{error}</div>}</div>;
}
