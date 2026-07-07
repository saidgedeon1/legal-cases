(function () {
  "use strict";

  var DEFAULT_FOLDERS = [
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

  var BASE_CATEGORIES = [
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

  var dom = {};
  var supabase = null;
  var folders = DEFAULT_FOLDERS.slice();
  var selectedFolder = null;

  function getConfig() {
    return window.LEGAL_CASES_CONFIG || {};
  }

  function bindDom() {
    dom.foldersView = document.getElementById("folders-view");
    dom.categoriesView = document.getElementById("categories-view");
    dom.complaintView = document.getElementById("complaint-view");
    dom.foldersGrid = document.getElementById("folders-grid");
    dom.categoriesGrid = document.getElementById("categories-grid");
    dom.foldersStatus = document.getElementById("folders-status");
    dom.categoriesTitle = document.getElementById("categories-title");
    dom.categoriesSubtitle = document.getElementById("categories-subtitle");
    dom.complaintTitle = document.getElementById("complaint-title");
    dom.complaintSubtitle = document.getElementById("complaint-subtitle");
    dom.complaintBody = document.getElementById("complaint-body");
    dom.complaintStatus = document.getElementById("complaint-status");
    dom.backToFolders = document.getElementById("back-to-folders");
    dom.backToCategories = document.getElementById("back-to-categories");
    dom.saveComplaint = document.getElementById("save-complaint");
    dom.clearComplaint = document.getElementById("clear-complaint");
  }

  function loadSupabaseScript() {
    return new Promise(function (resolve) {
      if (window.supabase && typeof window.supabase.createClient === "function") {
        resolve(true);
        return;
      }

      var script = document.createElement("script");
      script.src =
        "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";
      script.async = true;
      script.onload = function () {
        resolve(true);
      };
      script.onerror = function () {
        resolve(false);
      };
      document.head.appendChild(script);
    });
  }

  function initSupabase() {
    var config = getConfig();
    var lib = window.supabase;

    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      return null;
    }
    if (!lib || typeof lib.createClient !== "function") {
      return null;
    }

    try {
      return lib.createClient(config.supabaseUrl, config.supabaseAnonKey);
    } catch (error) {
      console.error("[legal-cases] Supabase init failed:", error);
      return null;
    }
  }

  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise(function (_, reject) {
        setTimeout(function () {
          reject(new Error("timeout"));
        }, ms);
      }),
    ]);
  }

  function showView(view) {
    dom.foldersView.classList.toggle("hidden", view !== "folders");
    dom.categoriesView.classList.toggle("hidden", view !== "categories");
    dom.complaintView.classList.toggle("hidden", view !== "complaint");
  }

  function getCategoriesForFolder(folder) {
    return [
      {
        id: "complaint",
        label: "الشكوى من " + folder.name,
        description: "نص الشكوى والوثائق الأساسية للدعوى",
        icon: "⚖️",
        featured: true,
      },
    ].concat(BASE_CATEGORIES);
  }

  function renderFolders() {
    dom.foldersGrid.innerHTML = folders
      .map(function (folder) {
        return (
          '<article class="card ' +
          (folder.accent || "") +
          '">' +
          '<button class="card-button" type="button" data-folder-slug="' +
          folder.slug +
          '">' +
          '<div class="folder-icon">📁</div>' +
          "<h2>" +
          folder.name +
          "</h2>" +
          "<p>" +
          folder.opponent +
          "</p>" +
          '<span class="badge">' +
          folder.case_ref +
          "</span>" +
          "</button>" +
          "</article>"
        );
      })
      .join("");
  }

  function renderCategories(folder) {
    dom.categoriesTitle.textContent = folder.name;
    dom.categoriesSubtitle.textContent = folder.opponent;

    var categories = getCategoriesForFolder(folder);
    dom.categoriesGrid.innerHTML = categories
      .map(function (category) {
        return (
          '<article class="card' +
          (category.featured ? " card-featured" : "") +
          '">' +
          '<button class="card-button" type="button" data-category-id="' +
          category.id +
          '">' +
          '<div class="category-icon">' +
          category.icon +
          "</div>" +
          "<h3>" +
          category.label +
          "</h3>" +
          "<p>" +
          category.description +
          "</p>" +
          "</button>" +
          "</article>"
        );
      })
      .join("");
  }

  function findFolder(slug) {
    for (var i = 0; i < folders.length; i += 1) {
      if (folders[i].slug === slug) {
        return folders[i];
      }
    }
    return null;
  }

  function syncFoldersFromSupabase() {
    if (!supabase) {
      dom.foldersStatus.textContent =
        "وضع محلي — شغّل schema.sql في Supabase للربط الكامل.";
      return Promise.resolve();
    }

    dom.foldersStatus.textContent = "جارٍ مزامنة الملفات من Supabase...";

    return withTimeout(
      supabase
        .from("case_folders")
        .select("id, slug, name, opponent, case_ref, sort_order, accent")
        .order("sort_order", { ascending: true }),
      8000,
    )
      .then(function (result) {
        if (result.error) {
          dom.foldersStatus.textContent =
            "تعذر الاتصال بقاعدة البيانات. تأكد من تشغيل supabase/schema.sql في لوحة Supabase.";
          dom.foldersStatus.className = "status error";
          return;
        }

        if (result.data && result.data.length > 0) {
          folders = result.data;
          renderFolders();
          dom.foldersStatus.textContent = "تم تحميل الملفات من Supabase.";
          dom.foldersStatus.className = "status success";
          return;
        }

        dom.foldersStatus.textContent =
          "لا توجد ملفات في Supabase بعد — يتم عرض الملفات الافتراضية.";
        dom.foldersStatus.className = "status";
      })
      .catch(function (error) {
        dom.foldersStatus.textContent =
          error && error.message === "timeout"
            ? "انتهت مهلة الاتصال بـ Supabase — يتم عرض الملفات الافتراضية."
            : "تعذر الاتصال بـ Supabase — يتم عرض الملفات الافتراضية.";
        dom.foldersStatus.className = "status error";
      });
  }

  function openFolder(folder) {
    selectedFolder = folder;
    renderCategories(folder);
    showView("categories");
  }

  function openComplaint(folder) {
    selectedFolder = folder;
    dom.complaintTitle.textContent = "الشكوى من " + folder.name;
    dom.complaintSubtitle.textContent = folder.opponent;
    dom.complaintBody.value = "";
    dom.complaintStatus.textContent = "جارٍ تحميل الشكوى...";
    dom.complaintStatus.className = "status";
    showView("complaint");

    if (!supabase || !folder.id) {
      dom.complaintBody.value = localStorage.getItem("complaint:" + folder.slug) || "";
      dom.complaintStatus.textContent = folder.id
        ? ""
        : "حفظ محلي — شغّل schema.sql في Supabase للحفظ السحابي.";
      return;
    }

    supabase
      .from("complaints")
      .select("body")
      .eq("folder_id", folder.id)
      .maybeSingle()
      .then(function (result) {
        if (result.error) {
          dom.complaintStatus.textContent = "تعذر تحميل الشكوى من Supabase.";
          dom.complaintStatus.className = "status error";
          return;
        }

        dom.complaintBody.value = (result.data && result.data.body) || "";
        dom.complaintStatus.textContent = "";
      });
  }

  function saveComplaint() {
    if (!selectedFolder) {
      return;
    }

    var body = dom.complaintBody.value.trim();
    dom.complaintStatus.textContent = "جارٍ الحفظ...";
    dom.complaintStatus.className = "status";

    if (!supabase || !selectedFolder.id) {
      localStorage.setItem("complaint:" + selectedFolder.slug, body);
      dom.complaintStatus.textContent = "تم الحفظ محلياً على هذا الجهاز.";
      dom.complaintStatus.className = "status success";
      return;
    }

    supabase
      .from("complaints")
      .upsert(
        {
          folder_id: selectedFolder.id,
          title: "الشكوى من " + selectedFolder.name,
          body: body,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "folder_id" },
      )
      .then(function (result) {
        if (result.error) {
          dom.complaintStatus.textContent = "تعذر الحفظ: " + result.error.message;
          dom.complaintStatus.className = "status error";
          return;
        }

        dom.complaintStatus.textContent = "تم حفظ الشكوى في Supabase.";
        dom.complaintStatus.className = "status success";
      });
  }

  function clearComplaint() {
    dom.complaintBody.value = "";
    dom.complaintStatus.textContent = "";
  }

  function bindEvents() {
    dom.foldersGrid.addEventListener("click", function (event) {
      var button = event.target.closest("[data-folder-slug]");
      if (!button) {
        return;
      }
      var folder = findFolder(button.getAttribute("data-folder-slug"));
      if (folder) {
        openFolder(folder);
      }
    });

    dom.categoriesGrid.addEventListener("click", function (event) {
      var button = event.target.closest("[data-category-id]");
      if (!button || !selectedFolder) {
        return;
      }
      if (button.getAttribute("data-category-id") === "complaint") {
        openComplaint(selectedFolder);
      }
    });

    dom.backToFolders.addEventListener("click", function () {
      showView("folders");
    });

    dom.backToCategories.addEventListener("click", function () {
      showView("categories");
    });

    dom.saveComplaint.addEventListener("click", saveComplaint);
    dom.clearComplaint.addEventListener("click", clearComplaint);
  }

  function boot() {
    bindDom();
    bindEvents();
    showView("folders");
    dom.foldersStatus.textContent = "";
    dom.foldersStatus.className = "status";

    loadSupabaseScript().then(function () {
      supabase = initSupabase();
      syncFoldersFromSupabase();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
