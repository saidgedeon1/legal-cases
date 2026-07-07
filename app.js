const DEFAULT_FOLDERS = [
  {
    slug: "patrick-sayf",
    name: "باتريك سيف",
    opponent: "دعوى مع الخصم",
    case_ref: "ملف ١",
    sort_order: 1,
    accent: "folder-accent-1",
  },
  {
    slug: "folder-2",
    name: "ملف ٢",
    opponent: "دعوى مع الخصم",
    case_ref: "ملف ٢",
    sort_order: 2,
    accent: "folder-accent-2",
  },
  {
    slug: "folder-3",
    name: "ملف ٣",
    opponent: "دعوى مع الخصم",
    case_ref: "ملف ٣",
    sort_order: 3,
    accent: "folder-accent-3",
  },
  {
    slug: "folder-4",
    name: "ملف ٤",
    opponent: "دعوى مع الخصم",
    case_ref: "ملف ٤",
    sort_order: 4,
    accent: "folder-accent-4",
  },
];

const BASE_CATEGORIES = [
  {
    id: "correspondence",
    label: "المراسلات",
    description: "رسائل، إنذارات، ومخاطبات",
    icon: "✉️",
  },
  {
    id: "hearings",
    label: "جلسات المحكمة",
    description: "مواعيد الجلسات ومحاضرها",
    icon: "⚖️",
  },
  {
    id: "memos",
    label: "المذكرات والطلبات",
    description: "مذكرات دفاع وطلبات قانونية",
    icon: "📋",
  },
  {
    id: "documents",
    label: "المستندات",
    description: "عقود، وكالات، ووثائق رسمية",
    icon: "📄",
  },
  {
    id: "attachments",
    label: "المرفقات",
    description: "صور، ملفات PDF، ونسخ إضافية",
    icon: "📎",
  },
];

const foldersView = document.getElementById("folders-view");
const categoriesView = document.getElementById("categories-view");
const complaintView = document.getElementById("complaint-view");
const foldersGrid = document.getElementById("folders-grid");
const categoriesGrid = document.getElementById("categories-grid");
const foldersStatus = document.getElementById("folders-status");
const categoriesTitle = document.getElementById("categories-title");
const categoriesSubtitle = document.getElementById("categories-subtitle");
const complaintTitle = document.getElementById("complaint-title");
const complaintSubtitle = document.getElementById("complaint-subtitle");
const complaintBody = document.getElementById("complaint-body");
const complaintStatus = document.getElementById("complaint-status");

let supabase = null;
let folders = [];
let selectedFolder = null;

function getConfig() {
  return window.LEGAL_CASES_CONFIG || {};
}

function initSupabase() {
  const { supabaseUrl, supabaseAnonKey } = getConfig();
  const lib = window.supabase;
  const createClient = lib?.createClient;

  if (!supabaseUrl || !supabaseAnonKey || typeof createClient !== "function") {
    return null;
  }

  try {
    return createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.error("[legal-cases] Supabase init failed:", error);
    return null;
  }
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("timeout")), ms);
    }),
  ]);
}

function showView(view) {
  foldersView.classList.toggle("hidden", view !== "folders");
  categoriesView.classList.toggle("hidden", view !== "categories");
  complaintView.classList.toggle("hidden", view !== "complaint");
}

function getCategoriesForFolder(folder) {
  return [
    {
      id: "complaint",
      label: `الشكوى من ${folder.name}`,
      description: "نص الشكوى والوثائق الأساسية للدعوى",
      icon: "⚖️",
      featured: true,
    },
    ...BASE_CATEGORIES,
  ];
}

function renderFolders() {
  foldersGrid.innerHTML = folders
    .map(
      (folder) => `
      <article class="card ${folder.accent || ""}">
        <button class="card-button" type="button" data-folder-slug="${folder.slug}">
          <div class="folder-icon">📁</div>
          <h2>${folder.name}</h2>
          <p>${folder.opponent}</p>
          <span class="badge">${folder.case_ref}</span>
        </button>
      </article>
    `,
    )
    .join("");

  foldersGrid.querySelectorAll("[data-folder-slug]").forEach((button) => {
    button.addEventListener("click", () => {
      const folder = folders.find((item) => item.slug === button.dataset.folderSlug);
      if (folder) openFolder(folder);
    });
  });
}

function renderCategories(folder) {
  categoriesTitle.textContent = folder.name;
  categoriesSubtitle.textContent = folder.opponent;
  const categories = getCategoriesForFolder(folder);

  categoriesGrid.innerHTML = categories
    .map(
      (category) => `
      <article class="card ${category.featured ? "card-featured" : ""}">
        <button
          class="card-button"
          type="button"
          data-category-id="${category.id}"
        >
          <div class="category-icon">${category.icon}</div>
          <h3>${category.label}</h3>
          <p>${category.description}</p>
        </button>
      </article>
    `,
    )
    .join("");

  categoriesGrid.querySelectorAll("[data-category-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const categoryId = button.dataset.categoryId;
      if (categoryId === "complaint") {
        openComplaint(folder);
      }
    });
  });
}

async function loadFolders() {
  folders = DEFAULT_FOLDERS;
  renderFolders();
  foldersStatus.textContent = "";
  foldersStatus.className = "status";

  if (!supabase) {
    foldersStatus.textContent = "وضع محلي — شغّل schema.sql في Supabase للربط الكامل.";
    return;
  }

  foldersStatus.textContent = "جارٍ مزامنة الملفات من Supabase...";

  try {
    const { data, error } = await withTimeout(
      supabase
        .from("case_folders")
        .select("id, slug, name, opponent, case_ref, sort_order, accent")
        .order("sort_order", { ascending: true }),
      8000,
    );

    if (error) {
      foldersStatus.textContent =
        "تعذر الاتصال بقاعدة البيانات. تأكد من تشغيل supabase/schema.sql في لوحة Supabase.";
      foldersStatus.className = "status error";
      return;
    }

    if (Array.isArray(data) && data.length > 0) {
      folders = data;
      renderFolders();
      foldersStatus.textContent = "تم تحميل الملفات من Supabase.";
      foldersStatus.className = "status success";
      return;
    }

    foldersStatus.textContent = "لا توجد ملفات في Supabase بعد — يتم عرض الملفات الافتراضية.";
    foldersStatus.className = "status";
  } catch (error) {
    foldersStatus.textContent =
      error?.message === "timeout"
        ? "انتهت مهلة الاتصال بـ Supabase — يتم عرض الملفات الافتراضية."
        : "تعذر الاتصال بـ Supabase — يتم عرض الملفات الافتراضية.";
    foldersStatus.className = "status error";
  }
}

function openFolder(folder) {
  selectedFolder = folder;
  renderCategories(folder);
  showView("categories");
}

async function openComplaint(folder) {
  selectedFolder = folder;
  complaintTitle.textContent = `الشكوى من ${folder.name}`;
  complaintSubtitle.textContent = folder.opponent;
  complaintBody.value = "";
  complaintStatus.textContent = "جارٍ تحميل الشكوى...";
  complaintStatus.className = "status";
  showView("complaint");

  if (!supabase || !folder.id) {
    const local = localStorage.getItem(`complaint:${folder.slug}`);
    complaintBody.value = local || "";
    complaintStatus.textContent = folder.id
      ? ""
      : "حفظ محلي — شغّل schema.sql في Supabase للحفظ السحابي.";
    return;
  }

  const { data, error } = await supabase
    .from("complaints")
    .select("body")
    .eq("folder_id", folder.id)
    .maybeSingle();

  if (error) {
    complaintStatus.textContent = "تعذر تحميل الشكوى من Supabase.";
    complaintStatus.className = "status error";
    return;
  }

  complaintBody.value = data?.body || "";
  complaintStatus.textContent = "";
}

async function saveComplaint() {
  if (!selectedFolder) return;

  const body = complaintBody.value.trim();
  complaintStatus.textContent = "جارٍ الحفظ...";
  complaintStatus.className = "status";

  if (!supabase || !selectedFolder.id) {
    localStorage.setItem(`complaint:${selectedFolder.slug}`, body);
    complaintStatus.textContent = "تم الحفظ محلياً على هذا الجهاز.";
    complaintStatus.className = "status success";
    return;
  }

  const payload = {
    folder_id: selectedFolder.id,
    title: `الشكوى من ${selectedFolder.name}`,
    body,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("complaints").upsert(payload, {
    onConflict: "folder_id",
  });

  if (error) {
    complaintStatus.textContent = `تعذر الحفظ: ${error.message}`;
    complaintStatus.className = "status error";
    return;
  }

  complaintStatus.textContent = "تم حفظ الشكوى في Supabase.";
  complaintStatus.className = "status success";
}

function clearComplaint() {
  complaintBody.value = "";
  complaintStatus.textContent = "";
}

document.getElementById("back-to-folders").addEventListener("click", () => {
  showView("folders");
});

document.getElementById("back-to-categories").addEventListener("click", () => {
  showView("categories");
});

document.getElementById("save-complaint").addEventListener("click", saveComplaint);
document.getElementById("clear-complaint").addEventListener("click", clearComplaint);

function boot() {
  showView("folders");
  supabase = initSupabase();
  loadFolders();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
