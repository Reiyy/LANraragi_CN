/**
 * Non-DataTables Index functions.
 * (The split is there to permit easier switch if we ever yeet datatables from the main UI)
 */
const Index = {};
Index.selectedCategory = "";
Index.awesomplete = {};
Index.carouselInitialized = false;
Index.swiper = {};
Index.serverVersion = "";
Index.debugMode = false;
Index.isProgressLocal = true;
Index.pageSize = 100;

/**
 * Initialize the Archive Index.
 */
Index.initializeAll = function () {
    // Bind events to DOM
    $(document).on("click.edit-header-1", "#edit-header-1", () => Index.promptCustomColumn(1));
    $(document).on("click.edit-header-2", "#edit-header-2", () => Index.promptCustomColumn(2));
    $(document).on("click.mode-toggle", ".mode-toggle", Index.toggleMode);
    $(document).on("change.page-select", "#page-select", () => IndexTable.dataTable.page($("#page-select").val() - 1).draw("page"));
    $(document).on("change.thumbnail-crop", "#thumbnail-crop", Index.toggleCrop);
    $(document).on("change.namespace-sortby", "#namespace-sortby", Index.handleCustomSort);
    $(document).on("click.order-sortby", "#order-sortby", Index.toggleOrder);
    $(document).on("click.open-carousel", ".collapsible-title", Index.toggleCarousel);
    $(document).on("click.reload-carousel", "#reload-carousel", Index.updateCarousel);
    $(document).on("click.close-overlay", "#overlay-shade", LRR.closeOverlay);

    // 0 = List view
    // 1 = Thumbnail view
    // List view is at 0 but became the non-default state later so here's some legacy weirdness
    if (localStorage.getItem("indexViewMode") === null) {
        localStorage.indexViewMode = 1;
    }

    // Default to crop landscape
    if (localStorage.getItem("cropthumbs") === null) {
        localStorage.cropthumbs = true;
    }

    // Default custom columns
    if (localStorage.getItem("customColumn1") === null) {
        localStorage.customColumn1 = "artist";
        localStorage.customColumn2 = "series";
    }

    // Default to on deck for carousel
    if (localStorage.getItem("carouselType") === null) {
        localStorage.carouselType = "ondeck";
    }

    // Default to opened carousel
    if (localStorage.getItem("carouselOpen") === null) {
        localStorage.carouselOpen = 1;
    }

    // Force-open the collapsible if carouselOpen = true
    if (localStorage.carouselOpen === "1") {
        $(".collapsible-title").trigger("click", [false]);
        // Index.updateCarousel(); will be executed by toggleCarousel
    } else {
        Index.updateCarousel();
    }

    // Initialize carousel mode menu
    $.contextMenu({
        selector: "#carousel-mode-menu",
        trigger: "left",
        build: () => ({
            callback(key) {
                localStorage.carouselType = key;
                Index.updateCarousel();
            },
            items: {
                ondeck: { name: "上次阅读", icon: "fas fa-book-reader" },
                random: { name: "随机", icon: "fas fa-random" },
                inbox: { name: "新档案", icon: "fas fa-envelope-open-text" },
                untagged: { name: "无标签档案", icon: "fas fa-edit" },
            },
        }),
    });

    // Tell user about the context menu
    if (localStorage.getItem("sawContextMenuToast") === null) {
        localStorage.sawContextMenuToast = true;

        LRR.toast({
            heading: `欢迎使用 LANraragi ${Index.serverVersion}!`,
            text: "如果你想对档案执行高级操作，只需右键点击它的名称。祝你阅读愉快！",
            icon: "info",
            hideAfter: 13000,
        });
    }

    // Get some info from the server: version, debug mode, local progress
    Server.callAPI("/api/info", "GET", null, "获取基本服务器信息出错！",
        (data) => {
            Index.serverVersion = data.version;
            Index.debugMode = data.debug_mode === "1";
            Index.isProgressLocal = data.server_tracks_progress !== "1";
            Index.pageSize = data.archives_per_page;

            // Check version if not in debug mode
            if (!Index.debugMode) {
                Index.checkVersion();
                Index.fetchChangelog();
            } else {
                LRR.toast({
                    heading: "<i class=\"fas fa-bug\"></i> 你正在以调试模式运行！",
                    text: "可以在 <a href=\"./debug\"> 此处</a>查看高级服务器统计信息。</a>",
                    icon: "warning",
                });
            }

            Index.migrateProgress();
            Index.loadTagSuggestions();
            Index.loadCategories();

            // Initialize DataTables
            IndexTable.initializeAll();
        });

    Index.updateTableHeaders();
};

Index.toggleMode = function () {
    localStorage.indexViewMode = (localStorage.indexViewMode === "1") ? "0" : "1";
    IndexTable.dataTable.draw();
};

Index.toggleCarousel = function (e, updateLocalStorage = true) {
    if (updateLocalStorage) localStorage.carouselOpen = (localStorage.carouselOpen === "1") ? "0" : "1";

    if (!Index.carouselInitialized) {
        Index.carouselInitialized = true;
        $("#reload-carousel").show();

        Index.swiper = new Swiper(".index-carousel-container", {
            breakpoints: (() => {
                const breakpoints = {
                    0: { // ensure every device have at least 1 slide
                        slidesPerView: 1,
                    },
                };
                // virtual Slides doesn't work with slidesPerView: 'auto'
                // the following loops are meant to implement same functionality by doing mathworks
                // it also helps avoid writing a billion slidesPerView combos for window widths
                // when the screen width <= 560px, every thumbnails have a different width
                // from 169px, when the width is 17px bigger, we display 0.1 more slide
                for (let width = 169, sides = 1; width <= 424; width += 17, sides += 0.1) {
                    breakpoints[width] = {
                        slidesPerView: sides,
                    };
                }
                // from 427px, when the width is 46px bigger, we display 0.2 more slide
                // the width support up to 4K resolution
                for (let width = 427, sides = 1.8; width <= 3840; width += 46, sides += 0.2) {
                    breakpoints[width] = {
                        slidesPerView: sides,
                    };
                }
                return breakpoints;
            })(),
            breakpointsBase: "container",
            centerInsufficientSlides: false,
            mousewheel: true,
            navigation: {
                nextEl: ".carousel-next",
                prevEl: ".carousel-prev",
            },
            slidesPerView: 7,
            virtual: {
                enabled: true,
                addSlidesAfter: 2,
                addSlidesBefore: 2,
            },
        });

        Index.updateCarousel();
    }
};

Index.toggleCrop = function () {
    localStorage.cropthumbs = $("#thumbnail-crop")[0].checked;
    IndexTable.dataTable.draw();
};

Index.toggleOrder = function (e) {
    e.preventDefault();
    const order = IndexTable.dataTable.order();
    order[0][1] = order[0][1] === "asc" ? "desc" : "asc";
    IndexTable.dataTable.order(order);
    IndexTable.dataTable.draw();
};

/**
 * Toggles a category filter.
 * Sets the internal selectedCategory variable and changes the button's class.
 * @param {*} button Button matching the category.
 */
Index.toggleCategory = function (button) {
    // Add/remove class to button depending on the state
    const categoryId = button.id;
    if (Index.selectedCategory === categoryId) {
        button.classList.remove("toggled");
        Index.selectedCategory = "";
    } else {
        Index.selectedCategory = categoryId;
        button.classList.add("toggled");
    }

    // Trigger search
    IndexTable.doSearch();
};

/**
 * Show a prompt to update the namespace of a column in compact mode.
 * @param {*} column Index of the column to modify, either 1 or 2
 */
Index.promptCustomColumn = function (column) {
    LRR.showPopUp({
        title: "输入要在此列中显示的标签的命名空间",
        text: "请输入不带冒号的完整命名空间，例如 \"artist\"。\n如果你有多个相同命名空间的标签，则只有最后一个标签会显示在该列中。",
        input: "text",
        inputValue: localStorage.getItem(`customColumn${column}`),
        inputPlaceholder: "标签名称空间",
        inputAttributes: {
            autocapitalize: "off",
        },
        showCancelButton: true,
        cancelButtonText: "取消",
        reverseButtons: true,
        inputValidator: (value) => {
            if (!value) {
                return "请输入一个标签命名空间";
            }
            return undefined;
        },
    }).then((result) => {
        if (result.isConfirmed) {
            if (!LRR.isNullOrWhitespace(result.value)) {
                localStorage.setItem(`customColumn${column}`, result.value.trim());

                // Absolutely disgusting
                IndexTable.dataTable.settings()[0].aoColumns[column].sName = result.value.trim();
                Index.updateTableHeaders();
                IndexTable.doSearch();
            }
        }
    });
};

/**
 * Update table controls to reflect the current status.
 * @param {*} currentSort Current sort column
 * @param {*} currentOrder Current sort order
 * @param {*} totalPages Total pages of the table
 * @param {*} currentPage Current page of the table
 */
Index.updateTableControls = function (currentSort, currentOrder, totalPages, currentPage) {
    $(".table-options").show();
    $("#thumbnail-crop")[0].checked = localStorage.cropthumbs === "true";

    $("#namespace-sortby").val(currentSort);
    $("#order-sortby")[0].classList.remove("fa-sort-alpha-down", "fa-sort-alpha-up");
    $("#order-sortby")[0].classList.add(currentOrder === "asc" ? "fa-sort-alpha-down" : "fa-sort-alpha-up");
    
    if ($("#order-sortby")[0].classList.contains("fa-sort-alpha-down")) {
        $("#order-sortby").text(" 升序");
        $("#order-sortby").attr("title", "排列顺序按照选择的排序方式升序排列");
    } else if ($("#order-sortby")[0].classList.contains("fa-sort-alpha-up")) {
        $("#order-sortby").text(" 降序");
        $("#order-sortby").attr("title", "排列顺序按照选择的排序方式降序排列");
    }

    if (localStorage.indexViewMode === "1") {
        $(".thumbnail-options").show();
        $(".thumbnail-toggle").show();
        $(".compact-toggle").hide();
    } else {
        $(".thumbnail-options").hide();
        $(".thumbnail-toggle").hide();
        $(".compact-toggle").show();
    }

    // Page selector
    const pageSelect = $("#page-select");
    pageSelect.empty();

    for (let j = 1; j <= totalPages; j++) {
        const oOption = document.createElement("option");
        oOption.text = j;
        oOption.value = j;
        pageSelect[0].add(oOption, null);
    }

    pageSelect.val(currentPage);
};

Index.handleCustomSort = function () {
    const namespace = $("#namespace-sortby").val();
    const order = IndexTable.dataTable.order();

    // Special case for title sorting, as that uses column 0
    if (namespace === "title") {
        order[0][0] = 0;
    } else {
        // The order set in the combobox uses customColumn1
        order[0][0] = 1;
        localStorage.customColumn1 = namespace;
        IndexTable.dataTable.settings()[0].aoColumns[1].sName = namespace;
        Index.updateTableHeaders();
    }

    IndexTable.dataTable.order(order);
    IndexTable.dataTable.draw();
};

Index.updateCarousel = function (e) {
    e?.preventDefault();
    $("#carousel-empty").hide();
    $("#carousel-loading").show();
    $(".swiper-wrapper").hide();

    $("#reload-carousel").addClass("fa-spin");

    // Hit a different API endpoint depending on the requested localStorage carousel type
    let endpoint;
    switch (localStorage.carouselType) {
    case "random":
        $("#carousel-icon")[0].classList = "fas fa-random";
        $("#carousel-title").text("随机");
        endpoint = `/api/search/random?filter=${IndexTable.currentSearch}&category=${Index.selectedCategory}&count=15`;
        break;
    case "inbox":
        $("#carousel-icon")[0].classList = "fas fa-envelope-open-text";
        $("#carousel-title").text("新档案");
        endpoint = `/api/search?filter=${IndexTable.currentSearch}&category=${Index.selectedCategory}&newonly=true&sortby=date_added&order=desc&start=-1`;
        break;
    case "untagged":
        $("#carousel-icon")[0].classList = "fas fa-edit";
        $("#carousel-title").text("无标签档案");
        endpoint = `/api/search?filter=${IndexTable.currentSearch}&category=${Index.selectedCategory}&untaggedonly=true&sortby=date_added&order=desc&start=-1`;
        break;
    case "ondeck":
        $("#carousel-icon")[0].classList = "fas fa-book-reader";
        $("#carousel-title").text("上次阅读");
        endpoint = `/api/search?filter=${IndexTable.currentSearch}&sortby=lastread`;
        break;
    default:
        $("#carousel-icon")[0].classList = "fas fa-pastafarianism";
        $("#carousel-title").text("未定义");
        endpoint = `/api/search?filter=${IndexTable.currentSearch}&category=${Index.selectedCategory}`;
        break;
    }

    if (Index.carouselInitialized) {
        Server.callAPI(endpoint, "GET", null, "获取轮播数据时出错！",
            (results) => {
                Index.swiper.virtual.removeAllSlides();
                const slides = results.data
                    .map((archive) => LRR.buildThumbnailDiv(archive));
                Index.swiper.virtual.appendSlide(slides);
                Index.swiper.virtual.update();

                if (results.data.length === 0) {
                    $("#carousel-empty").show();
                }

                $("#carousel-loading").hide();
                $(".swiper-wrapper").show();
                $("#reload-carousel").removeClass("fa-spin");
            },
        );
    }
};

/**
 * Update the Table Headers based on the custom namespaces set in localStorage.
 */
Index.updateTableHeaders = function () {
    const cc1 = localStorage.customColumn1;
    const cc2 = localStorage.customColumn2;

    $("#customcol1").val(cc1);
    $("#customcol2").val(cc2);

    // Modify text of <a> in headers
    $("#header-1").html(cc1.charAt(0).toUpperCase() + cc1.slice(1));
    $("#header-2").html(cc2.charAt(0).toUpperCase() + cc2.slice(1));
};

/**
 * Check the GitHub API to see if an update was released.
 * If so, flash another friendly notification inviting the user to check it out
 */
Index.checkVersion = function () {
    const githubAPI = "https://api.github.com/repos/difegue/lanraragi/releases/latest";

    fetch(githubAPI)
        .then((response) => response.json())
        .then((data) => {
            const expr = /(\d+)/g;
            const latestVersionArr = Array.from(data.tag_name.match(expr));
            let latestVersion = "";
            const currentVersionArr = Array.from(Index.serverVersion.match(expr));
            let currentVersion = "";

            latestVersionArr.forEach((element, index) => {
                if (index + 1 < latestVersionArr.length) {
                    latestVersion = `${latestVersion}${element}`;
                } else {
                    latestVersion = `${latestVersion}.${element}`;
                }
            });
            currentVersionArr.forEach((element, index) => {
                if (index + 1 < currentVersionArr.length) {
                    currentVersion = `${currentVersion}${element}`;
                } else {
                    currentVersion = `${currentVersion}.${element}`;
                }
            });

            if (latestVersion > currentVersion) {
                LRR.toast({
                    heading: `新的LANraragi版本 (${data.tag_name}) 可用！`,
                    text: `<a href="${data.html_url}">点击此处查看详情。</a>`,
                    icon: "info",
                    closeOnClick: false,
                    draggable: false,
                    hideAfter: 7000,
                });
            }
        })
        // eslint-disable-next-line no-console
        .catch((error) => console.log("检查最新版本时出错。", error));
};

/**
 * Fetch the latest LRR changelog and show it to the user if he just updated
 */
Index.fetchChangelog = function () {
    if (localStorage.lrrVersion !== Index.serverVersion) {
        localStorage.lrrVersion = Index.serverVersion;

        fetch("https://api.github.com/repos/difegue/lanraragi/releases/latest", { method: "GET" })
            .then((response) => (response.ok ? response.json() : { error: "响应不正确" }))
            .then((data) => {
                if (data.error) throw new Error(data.error);

                if (data.state === "failed") {
                    throw new Error(data.result);
                }

                marked.parse(data.body, {
                    gfm: true,
                    breaks: true,
                    sanitize: true,
                }, (err, html) => {
                    document.getElementById("changelog").innerHTML = html;
                    $("#updateOverlay").scrollTop(0);
                });

                $("#overlay-shade").fadeTo(150, 0.6, () => {
                    $("#updateOverlay").css("display", "block");
                });
            })
            .catch((error) => { LRR.showErrorToast("获取新版更新日志时出错", error); });
    }
};

/**
 * Load the categories a given ID belongs to.
 * @param {*} id The ID of the archive to check
 * @returns Categories
 */
Index.loadContextMenuCategories = function (id) {
    return Server.callAPI(`/api/archives/${id}/categories`, "GET", null, `获取 ${id} 的分类出错。`,
        (data) => {
            const items = {};

            for (let i = 0; i < data.categories.length; i++) {
                const cat = data.categories[i];
                items[`delcat-${cat.id}`] = { name: cat.name, icon: "fas fa-stream" };
            }

            if (Object.keys(items).length === 0) {
                items.noop = { name: "该档案不存在于任何分类。", icon: "far fa-sad-cry" };
            }

            return items;
        },
    );
};

/**
 * Build category list for contextMenu and checkoff the ones the given ID belongs to.
 * @param {*} catList The list of categories, obtained statically
 * @param {*} id The ID of the archive to check
 * @returns Categories
 */
Index.loadContextMenuCategories = (catList, id) => Server.callAPI(`/api/archives/${id}/categories`, "GET", null, `Error finding categories for ${id}!`,
    (data) => {
        const items = {};

        for (let i = 0; i < catList.length; i++) {
            const catId = catList[i].id;

            // If the category is also in the API results,
            // we can pre-check it when creating the checkbox
            const isSelected = data.categories.map((x) => x.id).includes(catId);
            items[catId] = { name: catList[i].name, type: "checkbox" };
            if (isSelected) { items[catId].selected = true; }

            items[catId].events = {
                click() {
                    if ($(this).is(":checked")) {
                        Server.addArchiveToCategory(id, catId);
                    } else {
                        Server.removeArchiveFromCategory(id, catId);
                    }
                },
            };
        }

        if (Object.keys(items).length === 0) {
            items.noop = { name: "还没有分类...", icon: "far fa-sad-cry" };
        }

        return items;
    },
);

/**
 * Handle context menu clicks.
 * @param {*} option The clicked option
 * @param {*} id The Archive ID
 * @returns
 */
Index.handleContextMenu = function (option, id) {
    switch (option) {
    case "edit":
        LRR.openInNewTab(`./edit?id=${id}`);
        break;
    case "delete":
        LRR.showPopUp({
            text: "你确定要删除这个档案吗？",
            icon: "warning",
            showCancelButton: true,
            focusConfirm: false,
            confirmButtonText: "对，删！",
            cancelButtonText: "算了，不删了",
            reverseButtons: true,
            confirmButtonColor: "#d33",
        }).then((result) => {
            if (result.isConfirmed) {
                Server.deleteArchive(id, () => { document.location.reload(true); });
            }
        });
        break;
    case "read":
        LRR.openInNewTab(`./reader?id=${id}`);
        break;
    case "download":
        LRR.openInNewTab(`./api/archives/${id}/download`);
        break;
    default:
        break;
    }
};

/**
 * Load tag suggestions for the tag search bar.
 */
Index.loadTagSuggestions = function () {
    // Query the tag cloud API to get the most used tags.
    Server.callAPI("/api/database/stats?minweight=2", "GET", null, "无法加载标签建议",
        (data) => {
            // Get namespaces objects in the data array to fill the namespace-sortby combobox
            const namespacesSet = new Set(data.map((element) => (element.namespace === "parody" ? "series" : element.namespace)));
            namespacesSet.forEach((element) => {
                if (element !== "" && element !== "date_added") {
                    $("#namespace-sortby").append(`<option value="${element}">${element.charAt(0).toUpperCase() + element.slice(1)}</option>`);
                }
            });

            // Setup awesomplete for the tag search bar
            Index.awesomplete = new Awesomplete("#search-input", {
                list: data,
                data(tag) {
                    // Format tag objects from the API into a format awesomplete likes.
                    let label = tag.text;
                    if (tag.namespace !== "") label = `${tag.namespace}:${tag.text}`;

                    return { label, value: tag.weight };
                },
                // Sort by weight
                sort(a, b) {
                    return b.value - a.value;
                },
                filter(text, input) {
                    return Awesomplete.FILTER_CONTAINS(text, input.match(/[^, -]*$/)[0]);
                },
                item(text, input) {
                    return Awesomplete.ITEM(text, input.match(/[^, -]*$/)[0]);
                },
                replace(text) {
                    const before = this.input.value.match(/^.*(,|-)\s*-*|/)[0];
                    this.input.value = `${before + text}$, `;
                },
            });
        },
    );
};

/**
 * Query the category API to build the filter buttons.
 */
Index.loadCategories = function () {
    Server.callAPI("/api/categories", "GET", null, "无法加载分类",
        (data) => {
            // Sort by pinned + alpha
            // Pinned categories are shown at the beginning
            data.sort((b, a) => b.name.localeCompare(a.name));
            data.sort((a, b) => b.pinned - a.pinned);
            let html = "";

            const iteration = (data.length > 10 ? 10 : data.length);

            for (let i = 0; i < iteration; i++) {
                const category = data[i];
                const pinned = category.pinned === "1";

                let catName = (pinned ? "📌" : "") + category.name;
                catName = LRR.encodeHTML(catName);

                const div = `<div style='display:inline-block'>
                    <input class='favtag-btn ${((category.id === Index.selectedCategory) ? "toggled" : "")}' 
                            type='button' id='${category.id}' value='${catName}' 
                            onclick='Index.toggleCategory(this)' title='点击此处显示该分类中包含的档案。'/>
                </div>`;

                html += div;
            }

            // If more than 10 categories, the rest goes into a dropdown
            if (data.length > 10) {
                html += `<select id="catdropdown" class="favtag-btn">
                            <option selected disabled>...</option>`;

                for (let i = 10; i < data.length; i++) {
                    const category = data[i];

                    html += `<option id='${category.id}'>
                                ${LRR.encodeHTML(category.name)}
                            </option>`;
                }
                html += "</select>";
            }

            $("#category-container").html(html);

            // Add a listener on dropdown selection
            $("#catdropdown").on("change", () => Index.toggleCategory($("#catdropdown")[0].selectedOptions[0]));
        },
    );
};

/**
 * If server-side progress tracking is enabled, migrate local progression to the server.
 */
Index.migrateProgress = function () {
    // No migration if local progress is enabled
    if (Index.isProgressLocal) {
        return;
    }

    const localProgressKeys = Object.keys(localStorage).filter((x) => x.endsWith("-reader")).map((x) => x.slice(0, -7));
    if (localProgressKeys.length > 0) {
        LRR.toast({
            heading: "你的阅读进度现已保存到服务器！",
            text: "看起来你有一些本地进度还未同步 -- 请稍等片刻，我们正在将其上传到服务器。☕",
            icon: "info",
            hideAfter: 23000,
        });

        const promises = [];
        localProgressKeys.forEach((id) => {
            const progress = localStorage.getItem(`${id}-reader`);

            promises.push(fetch(`api/archives/${id}/metadata`, { method: "GET" })
                .then((response) => response.json())
                .then((data) => {
                    // Don't migrate if the server progress is already further
                    if (progress !== null
                        && data !== undefined
                        && data !== null
                        && progress > data.progress) {
                        Server.callAPI(`api/archives/${id}/progress/${progress}?force=1`, "PUT", null, "更新阅读进度出错！", null);
                    }

                    // Clear out localStorage'd progress
                    localStorage.removeItem(`${id}-reader`);
                    localStorage.removeItem(`${id}-totalPages`);
                }));
        });

        Promise.all(promises).then(() => LRR.toast({
            heading: "阅读进度已全部上传！🎉",
            text: "你需要在阅读器中重新打开档案来查看已同步的进度。",
            icon: "success",
            hideAfter: 13000,
        }));
    } else {
        // eslint-disable-next-line no-console
        console.log("没有需要上传的本地阅读进度");
    }
};

jQuery(() => {
    Index.initializeAll();
});
