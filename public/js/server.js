/**
 * Functions for Generic API calls.
 */
const Server = {};

Server.isScriptRunning = false;

/**
 * Call that shows a popup to the user on success/failure.
 * Returns the promise so you can add final callbacks if needed.
 * @param {*} endpoint URL endpoint
 * @param {*} method GET/PUT/DELETE/POST
 * @param {*} successMessage Message written in the toast if request succeeded (success = 1)
 * @param {*} errorMessage Header of the error message if request fails (success = 0)
 * @param {*} successCallback called if request succeeded
 * @returns The result of the callback, or NULL.
 */
Server.callAPI = function (endpoint, method, successMessage, errorMessage, successCallback) {
    return fetch(endpoint, { method })
        .then((response) => (response.ok ? response.json() : { success: 0, error: "响应不正确" }))
        .then((data) => {
            if (Object.prototype.hasOwnProperty.call(data, "success") && !data.success) {
                throw new Error(data.error);
            } else {
                let message = successMessage;
                if ("successMessage" in data && data.successMessage) {
                    message = data.successMessage;
                }
                if (message !== null) {
                    LRR.toast({
                        heading: message,
                        icon: "success",
                        hideAfter: 7000,
                    });
                }

                if (successCallback !== null) return successCallback(data);

                return null;
            }
        })
        .catch((error) => LRR.showErrorToast(errorMessage, error));
};

Server.callAPIBody = function (endpoint, method, body, successMessage, errorMessage, successCallback) {
    return fetch(endpoint, { method, body })
        .then((response) => (response.ok ? response.json() : { success: 0, error: "响应不正确" }))
        .then((data) => {
            if (Object.prototype.hasOwnProperty.call(data, "success") && !data.success) {
                throw new Error(data.error);
            } else {
                let message = successMessage;
                if ("successMessage" in data && data.successMessage) {
                    message = data.successMessage;
                }
                if (message !== null) {
                    LRR.toast({
                        heading: message,
                        icon: "success",
                        hideAfter: 7000,
                    });
                }

                if (successCallback !== null) return successCallback(data);

                return null;
            }
        })
        .catch((error) => LRR.showErrorToast(errorMessage, error));
};

/**
 * Check the status of a Minion job until it's completed.
 * @param {*} jobId Job ID to check
 * @param {*} useDetail Whether to get full details or the job or not.
 *            This requires the user to be logged in.
 * @param {*} callback Execute a callback on successful job completion.
 * @param {*} failureCallback Execute a callback on unsuccessful job completion.
 * @param {*} progressCallback Execute a callback if the job reports progress. (aka, if there's anything in notes)
 */
Server.checkJobStatus = function (jobId, useDetail, callback, failureCallback, progressCallback = null) {
    fetch(useDetail ? `/api/minion/${jobId}/detail` : `/api/minion/${jobId}`, { method: "GET" })
        .then((response) => (response.ok ? response.json() : { success: 0, error: "响应不正确" }))
        .then((data) => {
            if (data.error) throw new Error(data.error);

            if (data.state === "failed") {
                throw new Error(data.result);
            }

            if (data.state === "inactive") {
                // Job isn't even running yet, wait longer
                setTimeout(() => {
                    Server.checkJobStatus(jobId, useDetail, callback, failureCallback, progressCallback);
                }, 5000);
                return;
            }

            if (data.state === "active") {

                if (progressCallback !== null) {
                    progressCallback(data.notes);
                }

                // Job is in progress, check again in a bit
                setTimeout(() => {
                    Server.checkJobStatus(jobId, useDetail, callback, failureCallback, progressCallback);
                }, 1000);
            } 
            
            if (data.state === "finished") { 
                // Update UI with info
                callback(data);
            }
        })
        .catch((error) => { LRR.showErrorToast("检查 Minion 任务状态时出错", error); failureCallback(error); });
};

/**
 * POSTs the data of the specified form to the page.
 * This is used for Edit, Config and Plugins.
 * @param {*} formSelector The form to POST
 * @returns the promise object so you can chain more callbacks.
 */
Server.saveFormData = function (formSelector) {
    const postData = new FormData($(formSelector)[0]);

    return fetch(window.location.href, { method: "POST", body: postData })
        .then((response) => (response.ok ? response.json() : { success: 0, error: "响应不正确" }))
        .then((data) => {
            if (data.success) {
                LRR.toast({
                    heading: "保存成功！",
                    icon: "success",
                });
            } else {
                throw new Error(data.message);
            }
        })
        .catch((error) => LRR.showErrorToast("保存出错", error));
};

Server.triggerScript = function (namespace) {
    const scriptArg = $(`#${namespace}_ARG`).val();

    if (Server.isScriptRunning) {
        LRR.showErrorToast("已有一个脚本在运行。", "请等它终止。");
        return;
    }

    Server.isScriptRunning = true;
    $(".script-running").show();
    $(".stdbtn").hide();

    // Save data before triggering script
    Server.saveFormData("#editPluginForm")
        .then(Server.callAPI(`/api/plugins/queue?plugin=${namespace}&arg=${scriptArg}`, "POST", null, "执行脚本出错 :",
            (data) => {
                // Check minion job state periodically while we're on this page
                Server.checkJobStatus(
                    data.job,
                    true,
                    (d) => {
                        Server.isScriptRunning = false;
                        $(".script-running").hide();
                        $(".stdbtn").show();

                        if (d.result.success === 1) {
                            LRR.toast({
                                heading: "脚本执行结果",
                                text: `<pre>${JSON.stringify(d.result.data, null, 4)}</pre>`,
                                icon: "info",
                                hideAfter: 10000,
                                closeOnClick: false,
                                draggable: false,
                            });
                        } else LRR.showErrorToast(`脚本执行失败: ${d.result.error}`);
                    },
                    () => {
                        Server.isScriptRunning = false;
                        $(".script-running").hide();
                        $(".stdbtn").show();
                    },
                );
            },
        ));
};

Server.cleanTemporaryFolder = function () {
    Server.callAPI("/api/tempfolder", "DELETE", "已清空临时文件夹！", "清空临时文件夹出错 :",
        (data) => {
            $("#tempsize").html(data.newsize);
        },
    );
};

Server.invalidateCache = function () {
    Server.callAPI("/api/search/cache", "DELETE", "已丢弃搜索缓存！", "删除缓存时出错！请检查日志。", null);
};

Server.clearAllNewFlags = function () {
    Server.callAPI("/api/database/isnew", "DELETE", "所有档案都不再是新的！", "清除NEW标记时出错！请检查日志。", null);
};

Server.dropDatabase = function () {
    LRR.showPopUp({
        title: "这是一个（非常）破坏性的操作！",
        text: "你确定要清空数据库吗？",
        icon: "warning",
        showCancelButton: true,
        focusConfirm: false,
        confirmButtonText: "太确定了，淦他丫的！",
        cancelButtonText: "算了，不淦了",
        reverseButtons: true,
        confirmButtonColor: "#d33",
    }).then((result) => {
        if (result.isConfirmed) {
            Server.callAPI("/api/database/drop", "POST", "撒由那拉！重定向中...", "重置数据库时出错，请检查日志。",
                () => {
                    setTimeout(() => { document.location.href = "./"; }, 1500);
                },
            );
        }
    });
};

Server.cleanDatabase = function () {
    Server.callAPI("/api/database/clean", "POST", null, "清理数据库时出错，请检查日志。",
        (data) => {
            LRR.toast({
                heading: `清理数据库成功，删除了 ${data.deleted} 条记录！`,
                icon: "success",
                hideAfter: 7000,
            });

            if (data.unlinked > 0) {
                LRR.toast({
                    heading: `${data.unlinked} 其他记录已从数据库中解除链接，将在下次清理时删除！`,
                    text: "如果某些文件从你的档案索引中消失，请立即进行备份。",
                    icon: "warning",
                    hideAfter: 16000,
                });
            }
        },
    );
};

Server.regenerateThumbnails = function (force) {
    const forceparam = force ? 1 : 0;
    Server.callAPI(`/api/regen_thumbs?force=${forceparam}`, "POST",
        "已在队列中添加重新生成缩略图任务！请关注更新，或查看Minion控制台来获取更新。",
        "发送任务到Minion时发出错：",
        (data) => {
            // Disable the buttons to avoid accidental double-clicks.
            $("#genthumb-button").prop("disabled", true);
            $("#forcethumb-button").prop("disabled", true);

            // Check minion job state periodically while we're on this page
            Server.checkJobStatus(
                data.job,
                true,
                (d) => {
                    $("#genthumb-button").prop("disabled", false);
                    $("#forcethumb-button").prop("disabled", false);
                    LRR.toast({
                        heading: "所有缩略图已生成！遇到以下错误：",
                        text: d.result.errors,
                        icon: "success",
                        hideAfter: 15000,
                        closeOnClick: false,
                        draggable: false,
                    });
                },
                (error) => {
                    $("#genthumb-button").prop("disabled", false);
                    $("#forcethumb-button").prop("disabled", false);
                    LRR.showErrorToast("重新生成缩略图任务失败！", error);
                },
            );
        },
    );
};

// Adds an archive to a category. Basic implementation to use everywhere.
Server.addArchiveToCategory = function (arcId, catId) {
    Server.callAPI(`/api/categories/${catId}/${arcId}`, "PUT", `已将 ${arcId} 添加到分类 ${catId}!`, "添加/删除档案到分类时出错", null);
};

// Ditto, but for removing.
Server.removeArchiveFromCategory = function (arcId, catId) {
    Server.callAPI(`/api/categories/${catId}/${arcId}`, "DELETE", `已将 ${arcId} 从分类 ${catId} 中删除!`, "添加/删除档案到分类时出错", null);
};

/**
 * Sends a DELETE request for that archive ID,
 * deleting the Redis key and attempting to delete the archive file.
 * @param {*} arcId Archive ID
 * @param {*} callback Callback to execute once the archive is deleted (usually a redirection)
 */
Server.deleteArchive = function (arcId, callback) {
    fetch(`/api/archives/${arcId}`, { method: "DELETE" })
        .then((response) => (response.ok ? response.json() : { success: 0, error: "响应不正确" }))
        .then((data) => {
            if (!data.success) {
                LRR.toast({
                    heading: "无法删除档案文件。<br> (该文件可能已被删除？)",
                    text: "档案元数据已删除。<br> 请在返回库视图之前手动删除文件。",
                    icon: "warning",
                    hideAfter: 20000,
                });
                $(".stdbtn").hide();
                $("#goback").show();
            } else {
                LRR.toast({
                    heading: "档案已删除。重定向中...",
                    text: `文件名 : ${data.filename}`,
                    icon: "success",
                    hideAfter: 7000,
                });
                setTimeout(callback, 1500);
            }
        })
        .catch((error) => LRR.showErrorToast("删除档案时出错", error));
};
