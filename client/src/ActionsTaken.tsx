import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
type ActionStatus = "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
type Person = { id: number; name: string; role: string };
type ActionTaken = {
  id: number;
  ticketId: number;
  actionAt: string;
  description: string;
  result: string;
  status: ActionStatus;
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
  assignedToUserId: number | null;
  assignedTo: Person | null;
  performedBy: Person;
  createdAt: string;
  updatedAt: string;
};
type ActionDraft = {
  actionAt: string;
  description: string;
  result: string;
  assignedToUserId: string;
  status: ActionStatus;
  followUpRequired: boolean;
  followUpNote: string;
  attachmentNotes: string;
};

class ActionApiError extends Error {
  constructor(message: string, readonly code: string, readonly status: number) { super(message); }
}

const ACTION_TRANSITIONS: Record<ActionStatus, ActionStatus[]> = {
  OPEN: ["OPEN", "IN_PROGRESS", "COMPLETED"],
  IN_PROGRESS: ["IN_PROGRESS", "COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

function localDateTime(value: string | Date = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function isoInstant(value: string) {
  return new Date(value).toISOString();
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function newDraft(): ActionDraft {
  return { actionAt: localDateTime(), description: "", result: "", assignedToUserId: "", status: "OPEN", followUpRequired: false, followUpNote: "", attachmentNotes: "" };
}

function draftFrom(action: ActionTaken): ActionDraft {
  return {
    actionAt: localDateTime(action.actionAt),
    description: action.description,
    result: action.result,
    assignedToUserId: action.assignedToUserId === null ? "" : String(action.assignedToUserId),
    status: action.status,
    followUpRequired: action.followUpRequired,
    followUpNote: action.followUpNote ?? "",
    attachmentNotes: action.attachmentNotes ?? "",
  };
}

function createIdempotencyKey() {
  return globalThis.crypto?.randomUUID?.() ?? `action-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function request<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(API + path, {
      ...options,
      headers: { ...options.headers, "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new Error("Unable to reach the backend. Your form values are saved so you can retry.");
  }
  const data = await response.json().catch(() => null) as { error?: string; code?: string } | T | null;
  if (!response.ok) {
    const error = data && typeof data === "object" && "error" in data ? data.error : undefined;
    const code = data && typeof data === "object" && "code" in data ? data.code : undefined;
    throw new ActionApiError(error || `Request failed with HTTP ${response.status}.`, code || "SERVER_ERROR", response.status);
  }
  return data as T;
}

export default function ActionsTaken({ ticketId, token, canManage, ticketActive }: {
  ticketId: number;
  token: string;
  canManage: boolean;
  ticketActive: boolean;
}) {
  const [actions, setActions] = useState<ActionTaken[]>([]);
  const [assignees, setAssignees] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [assigneeError, setAssigneeError] = useState("");
  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ActionTaken | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<number | null>(null);
  const [draft, setDraft] = useState<ActionDraft>(newDraft);
  const savingRef = useRef(false);
  const idempotencyKey = useRef<string | null>(null);
  const loadSequence = useRef(0);
  const canEdit = canManage && ticketActive;

  const loadActions = async (showLoading = false): Promise<ActionTaken[] | null> => {
    const sequence = ++loadSequence.current;
    if (showLoading) {
      setLoading(true);
      setActions([]);
    }
    setLoadError("");
    try {
      const data = await request<{ items: ActionTaken[] }>(`/api/tickets/${ticketId}/actions`, token);
      if (!Array.isArray(data.items)) throw new Error("Actions Taken request returned an unexpected response.");
      if (sequence === loadSequence.current) setActions(data.items);
      return data.items;
    } catch (reason) {
      if (sequence === loadSequence.current) setLoadError(reason instanceof Error ? reason.message : "Unable to load Actions Taken.");
      return null;
    } finally {
      if (showLoading && sequence === loadSequence.current) setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    setAssignees([]);
    setAssigneeError("");
    void loadActions(true);
    if (canEdit) {
      request<Person[]>("/api/staff/users", token).then((people) => {
        if (active) setAssignees(people);
      }).catch((reason: unknown) => {
        if (active) setAssigneeError(reason instanceof Error ? reason.message : "Unable to load active staff.");
      });
    }
    return () => { active = false; };
  }, [ticketId, token, canEdit]);

  const orderedActions = useMemo(() => [...actions].sort((left, right) =>
    Date.parse(left.actionAt) - Date.parse(right.actionAt) || left.id - right.id), [actions]);

  const startCreate = () => {
    setEditing(null);
    setCreating(true);
    setDraft(newDraft());
    setFormError("");
    setMessage("");
  };

  const startEdit = (action: ActionTaken) => {
    setCreating(false);
    setEditing(action);
    setDraft(draftFrom(action));
    setFormError("");
    setMessage("");
  };

  const closeForm = () => {
    setCreating(false);
    setEditing(null);
    setDraft(newDraft());
    setFormError("");
    idempotencyKey.current = null;
  };

  const changeDraft = (key: keyof ActionDraft, value: string | boolean) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setFormError("");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setFormError("");
    setMessage("");
    const payload = {
      actionAt: isoInstant(draft.actionAt),
      description: draft.description.trim(),
      result: draft.result.trim(),
      assignedToUserId: draft.assignedToUserId ? Number(draft.assignedToUserId) : null,
      status: draft.status,
      followUpRequired: draft.followUpRequired,
      followUpNote: draft.followUpRequired ? draft.followUpNote.trim() : null,
      attachmentNotes: draft.attachmentNotes.trim() || null,
    };
    try {
      if (editing) {
        await request(`/api/staff/tickets/${ticketId}/actions/${editing.id}`, token, {
          method: "PATCH",
          body: JSON.stringify({ ...payload, expectedUpdatedAt: editing.updatedAt }),
        });
        setMessage("Action Taken updated.");
        setEditing(null);
        setDraft(newDraft());
      } else {
        idempotencyKey.current ??= createIdempotencyKey();
        await request(`/api/staff/tickets/${ticketId}/actions`, token, {
          method: "POST",
          headers: { "Idempotency-Key": idempotencyKey.current },
          body: JSON.stringify({ ...payload, status: undefined }),
        });
        idempotencyKey.current = null;
        setCreating(false);
        setDraft(newDraft());
        setMessage("Action Taken recorded.");
      }
      await loadActions();
    } catch (reason) {
      const fallback = editing ? "Unable to update the Action Taken." : "Unable to record the Action Taken. Your values are saved so you can retry.";
      setFormError(reason instanceof Error ? reason.message : fallback);
      if (reason instanceof ActionApiError && reason.status === 409) {
        const latest = await loadActions();
        if (editing && latest) setEditing(latest.find((item) => item.id === editing.id) ?? editing);
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const updateStatus = async (action: ActionTaken, status: "IN_PROGRESS" | "COMPLETED") => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setMessage("");
    setFormError("");
    try {
      await request(`/api/staff/tickets/${ticketId}/actions/${action.id}`, token, {
        method: "PATCH",
        body: JSON.stringify({ status, expectedUpdatedAt: action.updatedAt }),
      });
      setMessage(status === "COMPLETED" ? "Action Taken completed." : "Action Taken moved to in progress.");
      await loadActions();
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "Unable to update the Action Taken.");
      if (reason instanceof ActionApiError && reason.status === 409) await loadActions();
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const cancelAction = async (action: ActionTaken) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setMessage("");
    setFormError("");
    try {
      await request(`/api/staff/tickets/${ticketId}/actions/${action.id}/cancel`, token, {
        method: "POST",
        body: JSON.stringify({ expectedUpdatedAt: action.updatedAt }),
      });
      setConfirmCancelId(null);
      setMessage("Action Taken cancelled.");
      await loadActions();
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "Unable to cancel the Action Taken.");
      if (reason instanceof ActionApiError && reason.status === 409) await loadActions();
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return <section className="border-top pt-3 mt-4" aria-labelledby="actions-taken-heading">
    <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
      <h2 id="actions-taken-heading" className="h5 mb-0 me-auto">Actions Taken</h2>
      {canEdit && !creating && !editing && <button type="button" className="btn btn-toktickit-primary" disabled={saving} onClick={startCreate}>Add Action Taken</button>}
    </div>
    {loading && <p role="status" aria-live="polite">Loading Actions Taken…</p>}
    {loadError && <div className="alert alert-danger" role="alert">{loadError}<button type="button" className="btn btn-sm btn-outline-danger ms-2" onClick={() => void loadActions(true)}>Retry</button></div>}
    {assigneeError && canEdit && <div className="alert alert-warning" role="status">{assigneeError} You can still record an unassigned action.</div>}
    {formError && <div className="alert alert-danger" role="alert">{formError}</div>}
    {message && <div className="alert alert-success" role="status" aria-live="polite">{message}</div>}
    {!loading && !loadError && !orderedActions.length && <p className="text-secondary">No Actions Taken yet.</p>}
    <ol className="list-group list-unstyled mb-0">
      {orderedActions.map((action) => {
        const terminal = action.status === "COMPLETED" || action.status === "CANCELLED";
        return <li className="list-group-item mb-3 rounded" key={action.id}>
          <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
            <h3 className="h6 mb-0 me-auto">Action #{action.id}</h3>
            <span className="badge text-bg-secondary">{action.status.replace("_", " ")}</span>
            <time dateTime={action.actionAt}>{displayDate(action.actionAt)}</time>
          </div>
          <dl className="row small mb-0">
            <dt className="col-sm-3">Description</dt><dd className="col-sm-9 text-break">{action.description}</dd>
            <dt className="col-sm-3">Result</dt><dd className="col-sm-9 text-break">{action.result}</dd>
            <dt className="col-sm-3">Performed By</dt><dd className="col-sm-9">{action.performedBy.name}</dd>
            <dt className="col-sm-3">Assigned To</dt><dd className="col-sm-9">{action.assignedTo?.name ?? "Unassigned"}</dd>
            <dt className="col-sm-3">Follow-Up Required</dt><dd className="col-sm-9">{action.followUpRequired ? "Yes" : "No"}</dd>
            {action.followUpNote && <><dt className="col-sm-3">Follow-up note</dt><dd className="col-sm-9 text-break">{action.followUpNote}</dd></>}
            {action.attachmentNotes && <><dt className="col-sm-3">Attachment notes</dt><dd className="col-sm-9 text-break">{action.attachmentNotes}</dd></>}
          </dl>
          {canEdit && !terminal && <div className="d-flex flex-wrap gap-2 mt-3">
            {action.status === "OPEN" && <button type="button" className="btn btn-sm btn-toktickit-outline" disabled={saving} onClick={() => void updateStatus(action, "IN_PROGRESS")}>Start action #{action.id}</button>}
            <button type="button" className="btn btn-sm btn-toktickit-outline" disabled={saving} onClick={() => startEdit(action)}>Edit action #{action.id}</button>
            <button type="button" className="btn btn-sm btn-toktickit-primary" disabled={saving} onClick={() => void updateStatus(action, "COMPLETED")}>Complete action #{action.id}</button>
            <button type="button" className="btn btn-sm btn-outline-danger" disabled={saving} onClick={() => setConfirmCancelId(action.id)}>Cancel action #{action.id}</button>
          </div>}
          {canEdit && confirmCancelId === action.id && <div className="alert alert-warning mt-3 mb-0" role="group" aria-label={`Confirm cancellation of action ${action.id}`}>
            <p className="mb-2">Cancel this Action Taken?</p>
            <button type="button" className="btn btn-sm btn-danger me-2" disabled={saving} onClick={() => void cancelAction(action)}>Confirm cancellation</button>
            <button type="button" className="btn btn-sm btn-outline-secondary" disabled={saving} onClick={() => setConfirmCancelId(null)}>Keep action</button>
          </div>}
          {canEdit && editing?.id === action.id && <ActionForm title="Edit Action Taken" draft={draft} assignees={assignees} saving={saving} onChange={changeDraft} onSubmit={submit} onCancel={closeForm} onReset={closeForm} />}
        </li>;
      })}
    </ol>
    {canEdit && creating && <ActionForm title="Record Action Taken" draft={draft} assignees={assignees} saving={saving} onChange={changeDraft} onSubmit={submit} onCancel={closeForm} onReset={closeForm} />}
  </section>;
}

function ActionForm({ title, draft, assignees, saving, onChange, onSubmit, onCancel, onReset }: {
  title: string;
  draft: ActionDraft;
  assignees: Person[];
  saving: boolean;
  onChange: (key: keyof ActionDraft, value: string | boolean) => void;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
  onReset: () => void;
}) {
  return <form className="card border mt-3" onSubmit={onSubmit} aria-busy={saving}>
    <div className="card-body">
      <h3 className="h6">{title}</h3>
      <div className="row g-3">
        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="action-at">Action Date/Time</label>
          <input id="action-at" className="form-control" type="datetime-local" disabled={saving} required value={draft.actionAt} onChange={(event) => onChange("actionAt", event.target.value)} />
        </div>
        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="action-assignee">Assigned To</label>
          <select id="action-assignee" className="form-select" disabled={saving} value={draft.assignedToUserId} onChange={(event) => onChange("assignedToUserId", event.target.value)}>
            <option value="">Unassigned</option>
            {assignees.map((person) => <option key={person.id} value={person.id}>{person.name} ({person.role.replace("_", " ")})</option>)}
          </select>
        </div>
        <div className="col-12">
          <label className="form-label" htmlFor="action-description">Description</label>
          <textarea id="action-description" className="form-control" rows={3} maxLength={2000} disabled={saving} required value={draft.description} onChange={(event) => onChange("description", event.target.value)} />
        </div>
        <div className="col-12">
          <label className="form-label" htmlFor="action-result">Result</label>
          <textarea id="action-result" className="form-control" rows={3} maxLength={2000} disabled={saving} required value={draft.result} onChange={(event) => onChange("result", event.target.value)} />
        </div>
        {title.startsWith("Edit") && <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="action-status">Status</label>
          <select id="action-status" className="form-select" disabled={saving} value={draft.status} onChange={(event) => onChange("status", event.target.value as ActionStatus)}>
            {ACTION_TRANSITIONS[draft.status].map((status) => <option key={status} value={status}>{status.replace("_", " ")}</option>)}
          </select>
        </div>}
        <div className="col-12">
          <div className="form-check">
            <input id="action-follow-up-required" className="form-check-input" type="checkbox" disabled={saving} checked={draft.followUpRequired} onChange={(event) => onChange("followUpRequired", event.target.checked)} />
            <label className="form-check-label" htmlFor="action-follow-up-required">Follow-Up Required</label>
          </div>
        </div>
        {draft.followUpRequired && <div className="col-12">
          <label className="form-label" htmlFor="action-follow-up-note">Follow-up note</label>
          <textarea id="action-follow-up-note" className="form-control" rows={2} maxLength={1000} disabled={saving} required value={draft.followUpNote} onChange={(event) => onChange("followUpNote", event.target.value)} />
        </div>}
        <div className="col-12">
          <label className="form-label" htmlFor="action-attachment-notes">Attachment notes</label>
          <textarea id="action-attachment-notes" className="form-control" rows={2} maxLength={1000} disabled={saving} value={draft.attachmentNotes} onChange={(event) => onChange("attachmentNotes", event.target.value)} />
        </div>
      </div>
      <div className="d-flex flex-wrap gap-2 mt-3">
        <button type="submit" className="btn btn-toktickit-primary" disabled={saving}>{saving ? "Saving…" : title.startsWith("Edit") ? "Save changes" : "Record action"}</button>
        <button type="button" className="btn btn-toktickit-outline" disabled={saving} onClick={onCancel}>Close form</button>
        {!title.startsWith("Edit") && <button type="button" className="btn btn-outline-secondary" disabled={saving} onClick={onReset}>Clear form and start over</button>}
      </div>
    </div>
  </form>;
}
