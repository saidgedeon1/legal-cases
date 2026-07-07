(function () {
  "use strict";

  var STORAGE_BUCKET = "legal-case-files";

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
  var selectedCategory = null;

  function getConfig() {
    return window.LEGAL_CASES_CONFIG || {};
  }

  function bindDom() {
    dom.foldersView = document.getElementById("folders-view");
    dom.categoriesView = document.getElementById("categories-view");
    dom.categoryDetailView = document.getElementById("category-detail-view");
    dom.foldersGrid = document.getElementById("folders-grid");
    dom.categoriesGrid = document.getElementById("categories-grid");
    dom.foldersStatus = document.getElementById("folders-status");
    dom.categoriesTitle = document.getElementById("categories-title");
    dom.categoriesSubtitle = document.getElementById("categories-subtitle");
    dom.categoryDetailTitle = document.getElementById("category-detail-title");
    dom.categoryDetailSubtitle = document.getElementById("category-detail-subtitle");
    dom.categoryDetailStatus = document.getElementById("category-detail-status");
    dom.complaintSection = document.getElementById("complaint-section");
    dom.complaintBody = document.getElementById("complaint-body");
    dom.fileUploadInput = document.getElementById("file-upload-input");
    dom.fileList = document.getElementById("file-list");
    dom.uploadDropzone = document.querySelector(".upload-dropzone");
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
    dom.categoryDetailView.classList.toggle("hidden", view !== "category-detail");
  }

  function setDetailStatus(message, type) {
    dom.categoryDetailStatus.textContent = message || "";
    dom.categoryDetailStatus.className = "status" + (type ? " " + type : "");
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

  function findCategory(folder, categoryId) {
    var categories = getCategoriesForFolder(folder);
    for (var i = 0; i < categories.length; i += 1) {
      if (categories[i].id === categoryId) {
        return categories[i];
      }
    }
    return null;
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

  function formatFileSize(bytes) {
    var size = Number(bytes) || 0;
    if (size < 1024) {
      return size + " B";
    }
    if (size < 1024 * 1024) {
      return (size / 1024).toFixed(1) + " KB";
    }
    return (size / (1024 * 1024)).toFixed(1) + " MB";
  }

  function sanitizeFileName(name) {
    return String(name || "file")
      .replace(/[^\w.\-()\s\u0600-\u06FF]/g, "_")
      .replace(/\s+/g, "-");
  }

  function buildStoragePath(folderSlug, categoryId, fileName) {
    return (
      folderSlug +
      "/" +
      categoryId +
      "/" +
      Date.now() +
      "-" +
      Math.random().toString(36).slice(2, 8) +
      "-" +
      sanitizeFileName(fileName)
    );
  }

  function getPublicFileUrl(storagePath) {
    if (!supabase) {
      return "#";
    }
    var result = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
    return result.data.publicUrl;
  }

  function renderFileList(files) {
    if (!files || !files.length) {
      dom.fileList.innerHTML =
        '<li class="file-item"><span class="file-meta"><span class="file-name">لا توجد ملفات مرفوعة بعد.</span></span></li>';
      return;
    }

    dom.fileList.innerHTML = files
      .map(function (file) {
        var url = getPublicFileUrl(file.storage_path);
        return (
          '<li class="file-item" data-file-id="' +
          file.id +
          '">' +
          '<div class="file-meta">' +
          '<span class="file-name">' +
          file.file_name +
          "</span>" +
          '<span class="file-size">' +
          formatFileSize(file.size_bytes) +
          "</span>" +
          "</div>" +
          '<div class="file-actions">' +
          '<a class="link-btn" href="' +
          url +
          '" target="_blank" rel="noopener">فتح</a>' +
          '<button class="danger-btn" type="button" data-delete-file="' +
          file.id +
          '" data-storage-path="' +
          file.storage_path +
          '">حذف</button>' +
          "</div>" +
          "</li>"
        );
      })
      .join("");
  }

  function loadCategoryFiles() {
    if (!selectedFolder || !selectedCategory) {
      return Promise.resolve();
    }

    if (!supabase) {
      renderFileList([]);
      setDetailStatus("شغّل supabase/schema.sql في Supabase لرفع الملفات.", "error");
      return Promise.resolve();
    }

    setDetailStatus("جارٍ تحميل الملفات...");

    return supabase
      .from("case_files")
      .select("id, file_name, storage_path, mime_type, size_bytes, created_at")
      .eq("folder_slug", selectedFolder.slug)
      .eq("category_id", selectedCategory.id)
      .order("created_at", { ascending: false })
      .then(function (result) {
        if (result.error) {
          renderFileList([]);
          setDetailStatus("تعذر تحميل الملفات: " + result.error.message, "error");
          return;
        }

        renderFileList(result.data || []);
        setDetailStatus("");
      });
  }

  function uploadFiles(fileList) {
    if (!selectedFolder || !selectedCategory) {
      return;
    }
    if (!fileList || !fileList.length) {
      return;
    }
    if (!supabase) {
      setDetailStatus("شغّل supabase/schema.sql في Supabase لرفع الملفات.", "error");
      return;
    }

    var files = Array.prototype.slice.call(fileList);
    var uploaded = 0;
    var failed = 0;

    setDetailStatus("جارٍ رفع " + files.length + " ملف...");

    function uploadNext(index) {
      if (index >= files.length) {
        if (failed === 0) {
          setDetailStatus("تم رفع " + uploaded + " ملف بنجاح.", "success");
        } else {
          setDetailStatus(
            "تم رفع " + uploaded + " ملف، وفشل " + failed + " ملف.",
            "error",
          );
        }
        loadCategoryFiles();
        return;
      }

      var file = files[index];
      var storagePath = buildStoragePath(
        selectedFolder.slug,
        selectedCategory.id,
        file.name,
      );

      supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || "application/octet-stream",
        })
        .then(function (uploadResult) {
          if (uploadResult.error) {
            failed += 1;
            uploadNext(index + 1);
            return;
          }

          supabase
            .from("case_files")
            .insert({
              folder_id: selectedFolder.id || null,
              folder_slug: selectedFolder.slug,
              category_id: selectedCategory.id,
              file_name: file.name,
              storage_path: storagePath,
              mime_type: file.type || null,
              size_bytes: file.size || 0,
            })
            .then(function (dbResult) {
              if (dbResult.error) {
                failed += 1;
              } else {
                uploaded += 1;
              }
              uploadNext(index + 1);
            });
        });
    }

    uploadNext(0);
  }

  function deleteFile(fileId, storagePath) {
    if (!supabase) {
      setDetailStatus("لا يمكن الحذف بدون Supabase.", "error");
      return;
    }

    if (!window.confirm("هل تريد حذف هذا الملف؟")) {
      return;
    }

    setDetailStatus("جارٍ حذف الملف...");

    supabase.storage
      .from(STORAGE_BUCKET)
      .remove([storagePath])
      .then(function () {
        return supabase.from("case_files").delete().eq("id", fileId);
      })
      .then(function (result) {
        if (result.error) {
          setDetailStatus("تعذر حذف الملف: " + result.error.message, "error");
          return;
        }
        setDetailStatus("تم حذف الملف.", "success");
        loadCategoryFiles();
      });
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

  function loadComplaintText() {
    if (!selectedFolder || selectedCategory.id !== "complaint") {
      return;
    }

    dom.complaintBody.value = "";

    if (!supabase || !selectedFolder.id) {
      dom.complaintBody.value =
        localStorage.getItem("complaint:" + selectedFolder.slug) || "";
      return;
    }

    supabase
      .from("complaints")
      .select("body")
      .eq("folder_id", selectedFolder.id)
      .maybeSingle()
      .then(function (result) {
        if (!result.error) {
          dom.complaintBody.value = (result.data && result.data.body) || "";
        }
      });
  }

  function openCategory(folder, category) {
    selectedFolder = folder;
    selectedCategory = category;

    dom.categoryDetailTitle.textContent = category.label;
    dom.categoryDetailSubtitle.textContent = folder.name + " — " + folder.opponent;
    dom.complaintSection.classList.toggle("hidden", category.id !== "complaint");
    dom.fileUploadInput.value = "";
    setDetailStatus("");
    showView("category-detail");

    if (category.id === "complaint") {
      loadComplaintText();
    }

    loadCategoryFiles();
  }

  function saveComplaint() {
    if (!selectedFolder || !selectedCategory || selectedCategory.id !== "complaint") {
      return;
    }

    var body = dom.complaintBody.value.trim();
    setDetailStatus("جارٍ حفظ الشكوى...");

    if (!supabase || !selectedFolder.id) {
      localStorage.setItem("complaint:" + selectedFolder.slug, body);
      setDetailStatus("تم حفظ نص الشكوى محلياً على هذا الجهاز.", "success");
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
          setDetailStatus("تعذر حفظ الشكوى: " + result.error.message, "error");
          return;
        }
        setDetailStatus("تم حفظ نص الشكوى في Supabase.", "success");
      });
  }

  function clearComplaint() {
    dom.complaintBody.value = "";
    setDetailStatus("");
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
      var category = findCategory(
        selectedFolder,
        button.getAttribute("data-category-id"),
      );
      if (category) {
        openCategory(selectedFolder, category);
      }
    });

    dom.fileUploadInput.addEventListener("change", function (event) {
      uploadFiles(event.target.files);
      event.target.value = "";
    });

    dom.uploadDropzone.addEventListener("dragover", function (event) {
      event.preventDefault();
      dom.uploadDropzone.classList.add("dragover");
    });

    dom.uploadDropzone.addEventListener("dragleave", function () {
      dom.uploadDropzone.classList.remove("dragover");
    });

    dom.uploadDropzone.addEventListener("drop", function (event) {
      event.preventDefault();
      dom.uploadDropzone.classList.remove("dragover");
      uploadFiles(event.dataTransfer.files);
    });

    dom.fileList.addEventListener("click", function (event) {
      var button = event.target.closest("[data-delete-file]");
      if (!button) {
        return;
      }
      deleteFile(
        button.getAttribute("data-delete-file"),
        button.getAttribute("data-storage-path"),
      );
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
