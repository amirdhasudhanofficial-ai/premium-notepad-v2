const STORAGE_KEY = "amir-notes-phase3";
const THEME_KEY = "amir-notes-theme";
const FOLDER_KEY = "amir-notes-folders";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js");
  });
}

const isAppPage = !!document.getElementById("notesList");

if (isAppPage) {
  const notesList = document.getElementById("notesList");
  const newNoteBtn = document.getElementById("newNoteBtn");
  const deleteNoteBtn = document.getElementById("deleteNoteBtn");
  const duplicateNoteBtn = document.getElementById("duplicateNoteBtn");
  const downloadNoteBtn = document.getElementById("downloadNoteBtn");
  const clearNoteBtn = document.getElementById("clearNoteBtn");
  const pinNoteBtn = document.getElementById("pinNoteBtn");
  const themeToggleBtn = document.getElementById("themeToggleBtn");
  const exportNotesBtn = document.getElementById("exportNotesBtn");
  const importNotesBtn = document.getElementById("importNotesBtn");
  const importFileInput = document.getElementById("importFileInput");
  const addFolderBtn = document.getElementById("addFolderBtn");
  const folderList = document.getElementById("folderList");
  const tagFilterList = document.getElementById("tagFilterList");
  const noteFolderSelect = document.getElementById("noteFolderSelect");
  const noteTagsInput = document.getElementById("noteTagsInput");
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
  const installAppBtn = document.getElementById("installAppBtn");

  let deferredPrompt = null;
  let notes = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  let folders = JSON.parse(localStorage.getItem(FOLDER_KEY)) || ["All Notes", "Personal", "Work", "Ideas"];
  let selectedNoteId = null;
  let selectedFolderFilter = "All Notes";
  let selectedTagFilter = "";
  let saveTimeout = null;

  function showToast(message = "Done") {
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 1800);
  }

  function saveNotes() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    saveStatus.textContent = "Saved";
  }

  function saveFolders() {
    localStorage.setItem(FOLDER_KEY, JSON.stringify(folders));
  }

  function scheduleSave() {
    saveStatus.textContent = "Saving...";
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => saveNotes(), 250);
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
    themeToggleBtn.textContent = theme === "dark" ? "🌙 Theme" : "☀ Theme";
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    applyTheme(current === "dark" ? "light" : "dark");
    showToast("Theme changed");
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

  function escapeHtml(text) {
    return String(text)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getSortedNotes(list = notes) {
    return [...list].sort((a, b) => {
      if (a.pinned !== b.pinned) return b.pinned - a.pinned;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
  }

  function getAllTags() {
    const tags = new Set();
    notes.forEach(note => {
      (note.tags || []).forEach(tag => tags.add(tag));
    });
    return [...tags].sort();
  }

  function renderFolders() {
    folderList.innerHTML = "";
    folders.forEach(folder => {
      const chip = document.createElement("button");
      chip.className = `folder-chip ${selectedFolderFilter === folder ? "active" : ""}`;
      chip.textContent = folder;
      chip.addEventListener("click", () => {
        selectedFolderFilter = folder;
        renderFolders();
        renderNotes(searchInput.value);
      });
      folderList.appendChild(chip);
    });

    noteFolderSelect.innerHTML = folders
      .filter(folder => folder !== "All Notes")
      .map(folder => `<option value="${folder}">${folder}</option>`)
      .join("");
  }

  function renderTagFilters() {
    tagFilterList.innerHTML = "";

    const allTags = getAllTags();

    if (selectedTagFilter) {
      const clearChip = document.createElement("button");
      clearChip.className = "active-filter-chip";
      clearChip.textContent = `#${selectedTagFilter} ×`;
      clearChip.addEventListener("click", () => {
        selectedTagFilter = "";
        renderTagFilters();
        renderNotes(searchInput.value);
      });
      tagFilterList.appendChild(clearChip);
    }

    allTags.forEach(tag => {
      const chip = document.createElement("button");
      chip.className = `tag-chip ${selectedTagFilter === tag ? "active" : ""}`;
      chip.textContent = `#${tag}`;
      chip.addEventListener("click", () => {
        selectedTagFilter = tag;
        renderTagFilters();
        renderNotes(searchInput.value);
      });
      tagFilterList.appendChild(chip);
    });
  }

  function updateCounts() {
    const content = noteContent.value.trim();
    const words = content ? content.split(/\s+/).length : 0;
    const chars = noteContent.value.length;
    wordCount.textContent = `${words} words`;
    charCount.textContent = `${chars} characters`;
  }

  function filterNotes(filter = "") {
    return getSortedNotes().filter(note => {
      const q = filter.toLowerCase();
      const searchMatch =
        note.title.toLowerCase().includes(q) ||
        note.content.toLowerCase().includes(q) ||
        (note.tags || []).join(" ").toLowerCase().includes(q);

      const folderMatch =
        selectedFolderFilter === "All Notes" || note.folder === selectedFolderFilter;

      const tagMatch =
        !selectedTagFilter || (note.tags || []).includes(selectedTagFilter);

      return searchMatch && folderMatch && tagMatch;
    });
  }

  function renderNotes(filter = "") {
    notesList.innerHTML = "";
    const filtered = filterNotes(filter);

    noteCount.textContent = `${filtered.length} note${filtered.length !== 1 ? "s" : ""}`;

    if (filtered.length === 0) {
      notesList.innerHTML = `
        <div class="empty-state">
          <h3>No notes found</h3>
          <p>Create a new note or adjust your folder/tag filters.</p>
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
          <span>${note.pinned ? "📌" : ""}</span>
        </div>
        <div class="note-preview">${escapeHtml((note.content || "Empty note").slice(0, 90))}</div>
        <div class="note-extra">${escapeHtml(note.folder || "General")} • ${(note.tags || []).map(tag => "#" + escapeHtml(tag)).join(" ")}</div>
        <div class="note-date">Updated ${formatDate(note.updatedAt)}</div>
      `;
      card.addEventListener("click", () => selectNote(note.id));
      notesList.appendChild(card);
    });
  }

  function selectNote(id) {
    const note = notes.find(n => n.id === id);
    if (!note) return;

    selectedNoteId = id;
    noteTitle.value = note.title;
    noteContent.value = note.content;
    noteFolderSelect.value = note.folder || folders[1] || "Personal";
    noteTagsInput.value = (note.tags || []).join(", ");
    createdAt.textContent = `Created: ${formatDate(note.createdAt)}`;
    updatedAt.textContent = `Updated: ${formatDate(note.updatedAt)}`;
    pinNoteBtn.textContent = note.pinned ? "📌 Pinned" : "📌";
    updateCounts();
    renderNotes(searchInput.value);
  }

  function createNote(prefill = {}) {
    const now = new Date().toISOString();
    const defaultFolder = folders.find(f => f !== "All Notes") || "Personal";
    const newNote = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      title: prefill.title || "Untitled note",
      content: prefill.content || "",
      folder: prefill.folder || defaultFolder,
      tags: prefill.tags || [],
      pinned: false,
      createdAt: now,
      updatedAt: now
    };

    notes.unshift(newNote);
    selectedNoteId = newNote.id;
    saveNotes();
    renderTagFilters();
    renderNotes(searchInput.value);
    selectNote(newNote.id);
    showToast("New note created");
  }

  function updateCurrentNote() {
    const note = notes.find(n => n.id === selectedNoteId);
    if (!note) return;

    note.title = noteTitle.value.trim() || "Untitled note";
    note.content = noteContent.value;
    note.folder = noteFolderSelect.value;
    note.tags = noteTagsInput.value
      .split(",")
      .map(tag => tag.trim().toLowerCase())
      .filter(Boolean);
    note.updatedAt = new Date().toISOString();

    updatedAt.textContent = `Updated: ${formatDate(note.updatedAt)}`;
    updateCounts();
    renderTagFilters();
    scheduleSave();
    renderNotes(searchInput.value);
  }

  function deleteCurrentNote() {
    if (selectedNoteId === null) return;
    const ok = confirm("Delete this note?");
    if (!ok) return;

    notes = notes.filter(note => note.id !== selectedNoteId);
    saveNotes();
    renderTagFilters();

    if (notes.length > 0) {
      selectedNoteId = getSortedNotes(notes)[0].id;
      renderNotes(searchInput.value);
      selectNote(selectedNoteId);
    } else {
      selectedNoteId = null;
      clearEditorUI();
      renderNotes(searchInput.value);
    }

    showToast("Note deleted");
  }

  function clearEditorUI() {
    noteTitle.value = "";
    noteContent.value = "";
    noteTagsInput.value = "";
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
      content: note.content,
      folder: note.folder,
      tags: [...(note.tags || [])]
    });
    showToast("Note duplicated");
  }

  function downloadCurrentNote() {
    const note = notes.find(n => n.id === selectedNoteId);
    if (!note) return;

    const text = `${note.title}\nFolder: ${note.folder}\nTags: ${(note.tags || []).join(", ")}\n\n${note.content}`;
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
    const ok = confirm("Clear this note?");
    if (!ok) return;

    note.title = "Untitled note";
    note.content = "";
    note.tags = [];
    note.updatedAt = new Date().toISOString();
    saveNotes();
    renderTagFilters();
    selectNote(note.id);
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

  function addFolder() {
    const name = prompt("Enter folder name:");
    if (!name) return;
    const clean = name.trim();
    if (!clean) return;
    if (folders.includes(clean)) {
      alert("Folder already exists.");
      return;
    }
    folders.push(clean);
    saveFolders();
    renderFolders();
    showToast("Folder added");
  }

  function exportAllNotes() {
    const payload = { notes, folders };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "amir-notes-backup.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("Backup exported");
  }

  function importAllNotesFromFile(file) {
    const reader = new FileReader();
    reader.onload = function(event) {
      try {
        const data = JSON.parse(event.target.result);

        if (Array.isArray(data)) {
          notes = data;
        } else {
          notes = Array.isArray(data.notes) ? data.notes : [];
          folders = Array.isArray(data.folders) ? data.folders : folders;
        }

        saveNotes();
        saveFolders();
        renderFolders();
        renderTagFilters();

        if (notes.length > 0) {
          selectedNoteId = getSortedNotes(notes)[0].id;
          renderNotes();
          selectNote(selectedNoteId);
        } else {
          clearEditorUI();
          renderNotes();
        }

        showToast("Backup imported");
      } catch {
        alert("Invalid backup file.");
      }
    };
    reader.readAsText(file);
  }

  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    deferredPrompt = e;
    installAppBtn.style.display = "inline-flex";
  });

  installAppBtn.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installAppBtn.style.display = "none";
    showToast("Install prompt shown");
  });

  newNoteBtn.addEventListener("click", () => createNote());
  deleteNoteBtn.addEventListener("click", deleteCurrentNote);
  duplicateNoteBtn.addEventListener("click", duplicateCurrentNote);
  downloadNoteBtn.addEventListener("click", downloadCurrentNote);
  clearNoteBtn.addEventListener("click", clearCurrentNote);
  pinNoteBtn.addEventListener("click", togglePinCurrentNote);
  themeToggleBtn.addEventListener("click", toggleTheme);
  exportNotesBtn.addEventListener("click", exportAllNotes);
  importNotesBtn.addEventListener("click", () => importFileInput.click());
  importFileInput.addEventListener("change", e => {
    const file = e.target.files[0];
    if (file) importAllNotesFromFile(file);
    e.target.value = "";
  });
  addFolderBtn.addEventListener("click", addFolder);
  noteTitle.addEventListener("input", updateCurrentNote);
  noteContent.addEventListener("input", updateCurrentNote);
  noteFolderSelect.addEventListener("change", updateCurrentNote);
  noteTagsInput.addEventListener("input", updateCurrentNote);
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

  const savedTheme = localStorage.getItem(THEME_KEY) || "dark";
  applyTheme(savedTheme);

  renderFolders();
  renderTagFilters();

  if (notes.length === 0) {
    createNote({
      title: "Welcome to Amir Notes",
      content: "Now your app is installable and works offline after first load.",
      folder: "Personal",
      tags: ["welcome", "offline", "pwa"]
    });
  } else {
    selectedNoteId = getSortedNotes(notes)[0].id;
    renderNotes();
    selectNote(selectedNoteId);
  }
}