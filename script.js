const STORAGE_KEY = "premium-notepad-v2";

const notesList = document.getElementById("notesList");
const newNoteBtn = document.getElementById("newNoteBtn");
const deleteNoteBtn = document.getElementById("deleteNoteBtn");
const duplicateNoteBtn = document.getElementById("duplicateNoteBtn");
const downloadNoteBtn = document.getElementById("downloadNoteBtn");
const clearNoteBtn = document.getElementById("clearNoteBtn");
const pinNoteBtn = document.getElementById("pinNoteBtn");
const noteTitle = document.getElementById("noteTitle");
const noteContent = document.getElementById("noteContent");
const searchInput = document.getElementById("searchInput");
const saveStatus = document.getElementById("saveStatus");
const wordCount = document.getElementById("wordCount");
const charCount = document.getElementById("charCount");
const createdAt = document.getElementById("createdAt");
const updatedAt = document.getElementById("updatedAt");
const noteCount = document.getElementById("noteCount");
const toast = document.getElementById("toast");

let notes = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let selectedNoteId = null;
let saveTimeout = null;

function showToast(message = "Done") {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1800);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function saveNotes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  saveStatus.textContent = "Saved";
}

function scheduleSave() {
  saveStatus.textContent = "Saving...";
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveNotes();
  }, 250);
}

function getSortedNotes(list = notes) {
  return [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return b.pinned - a.pinned;
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });
}

function updateCounts() {
  const content = noteContent.value.trim();
  const words = content ? content.split(/\s+/).length : 0;
  const chars = noteContent.value.length;
  wordCount.textContent = `${words} words`;
  charCount.textContent = `${chars} characters`;
}

function renderNotes(filter = "") {
  notesList.innerHTML = "";

  const filtered = getSortedNotes().filter(note => {
    const q = filter.toLowerCase();
    return (
      note.title.toLowerCase().includes(q) ||
      note.content.toLowerCase().includes(q)
    );
  });

  noteCount.textContent = `${filtered.length} note${filtered.length !== 1 ? "s" : ""}`;

  if (filtered.length === 0) {
    notesList.innerHTML = `
      <div class="empty-state">
        <h3>No notes found</h3>
        <p>Create a new note or try a different search.</p>
      </div>
    `;
    return;
  }

  filtered.forEach(note => {
    const card = document.createElement("div");
    card.className = `note-card ${note.id === selectedNoteId ? "active" : ""}`;
    card.innerHTML = `
      <div class="note-card-top">
        <h3>${escapeHtml(note.title || "Untitled")}</h3>
        <span class="pin-badge">${note.pinned ? "📌" : ""}</span>
      </div>
      <div class="note-preview">${escapeHtml((note.content || "Empty note").slice(0, 90))}</div>
      <div class="note-date">Updated ${formatDate(note.updatedAt)}</div>
    `;
    card.addEventListener("click", () => selectNote(note.id));
    notesList.appendChild(card);
  });
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function selectNote(id) {
  const note = notes.find(n => n.id === id);
  if (!note) return;

  selectedNoteId = id;
  noteTitle.value = note.title;
  noteContent.value = note.content;
  createdAt.textContent = `Created: ${formatDate(note.createdAt)}`;
  updatedAt.textContent = `Updated: ${formatDate(note.updatedAt)}`;
  pinNoteBtn.textContent = note.pinned ? "📌 Pinned" : "📌";
  updateCounts();
  renderNotes(searchInput.value);
}

function createNote(prefill = {}) {
  const now = new Date().toISOString();
  const newNote = {
    id: Date.now(),
    title: prefill.title || "Untitled note",
    content: prefill.content || "",
    pinned: false,
    createdAt: now,
    updatedAt: now
  };

  notes.unshift(newNote);
  selectedNoteId = newNote.id;
  saveNotes();
  renderNotes(searchInput.value);
  selectNote(newNote.id);
  showToast("New note created");
}

function updateCurrentNote() {
  const note = notes.find(n => n.id === selectedNoteId);
  if (!note) return;

  note.title = noteTitle.value.trim() || "Untitled note";
  note.content = noteContent.value;
  note.updatedAt = new Date().toISOString();

  updatedAt.textContent = `Updated: ${formatDate(note.updatedAt)}`;
  updateCounts();
  scheduleSave();
  renderNotes(searchInput.value);
}

function deleteCurrentNote() {
  if (selectedNoteId === null) return;
  const ok = confirm("Are you sure you want to delete this note?");
  if (!ok) return;

  notes = notes.filter(note => note.id !== selectedNoteId);

  if (notes.length > 0) {
    selectedNoteId = getSortedNotes(notes)[0].id;
    saveNotes();
    renderNotes(searchInput.value);
    selectNote(selectedNoteId);
  } else {
    selectedNoteId = null;
    saveNotes();
    renderNotes(searchInput.value);
    clearEditorUI();
  }

  showToast("Note deleted");
}

function clearEditorUI() {
  noteTitle.value = "";
  noteContent.value = "";
  createdAt.textContent = "Created: --";
  updatedAt.textContent = "Updated: --";
  wordCount.textContent = "0 words";
  charCount.textContent = "0 characters";
  pinNoteBtn.textContent = "📌";
}

function duplicateCurrentNote() {
  const note = notes.find(n => n.id === selectedNoteId);
  if (!note) return;

  createNote({
    title: `${note.title} (Copy)`,
    content: note.content
  });
  showToast("Note duplicated");
}

function downloadCurrentNote() {
  const note = notes.find(n => n.id === selectedNoteId);
  if (!note) return;

  const text = `${note.title}\n\n${note.content}`;
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(note.title || "note").replace(/[^\w\s-]/g, "").trim() || "note"}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  showToast("Note downloaded");
}

function clearCurrentNote() {
  const note = notes.find(n => n.id === selectedNoteId);
  if (!note) return;

  const ok = confirm("Clear this note's title and content?");
  if (!ok) return;

  note.title = "Untitled note";
  note.content = "";
  note.updatedAt = new Date().toISOString();

  selectNote(note.id);
  saveNotes();
  renderNotes(searchInput.value);
  showToast("Note cleared");
}

function togglePinCurrentNote() {
  const note = notes.find(n => n.id === selectedNoteId);
  if (!note) return;

  note.pinned = !note.pinned;
  note.updatedAt = new Date().toISOString();
  saveNotes();
  renderNotes(searchInput.value);
  selectNote(note.id);
  showToast(note.pinned ? "Note pinned" : "Note unpinned");
}

newNoteBtn.addEventListener("click", () => createNote());
deleteNoteBtn.addEventListener("click", deleteCurrentNote);
duplicateNoteBtn.addEventListener("click", duplicateCurrentNote);
downloadNoteBtn.addEventListener("click", downloadCurrentNote);
clearNoteBtn.addEventListener("click", clearCurrentNote);
pinNoteBtn.addEventListener("click", togglePinCurrentNote);
noteTitle.addEventListener("input", updateCurrentNote);
noteContent.addEventListener("input", updateCurrentNote);
searchInput.addEventListener("input", e => renderNotes(e.target.value));

document.addEventListener("keydown", e => {
  const isMac = navigator.platform.toUpperCase().includes("MAC");
  const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

  if (cmdOrCtrl && e.key.toLowerCase() === "n") {
    e.preventDefault();
    createNote();
  }

  if (cmdOrCtrl && e.key.toLowerCase() === "s") {
    e.preventDefault();
    saveNotes();
    showToast("Saved manually");
  }
});

if (notes.length === 0) {
  createNote({
    title: "Welcome Note",
    content:
      "Welcome to Premium Notepad V2.\n\nFeatures:\n- Create notes\n- Auto-save\n- Pin notes\n- Duplicate notes\n- Download as text\n- Search instantly\n\nStart writing and your notes will be saved in this browser."
  });
} else {
  selectedNoteId = getSortedNotes(notes)[0].id;
  renderNotes();
  selectNote(selectedNoteId);
}