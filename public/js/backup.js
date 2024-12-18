/**
 * Backup Operations.
 */
const Backup = {};

Backup.initializeAll = function () {
    // bind events to DOM
    $(document).on("click.return", "#return", () => { window.location.href = "/"; });
    $(document).on("click.do-backup", "#do-backup", () => { window.open("./backup?dobackup=1", "_blank"); });

    // Handler for file uploading.
    $("#fileupload").fileupload({
        dataType: "json",
        done(e, data) {
            $("#processing").attr("style", "display:none");

            if (data.result.success === 1) $("#result").html("备份已恢复！");
            else $("#result").html(data.result.error);
        },

        fail() {
            $("#processing").attr("style", "display:none");
            $("#result").html("发生了服务器端错误。蛋糕了。<br/> 可能你的JSON格式有问题？");
        },

        progressall() {
            $("#result").html("");
            $("#processing").attr("style", "");
        },

    });
};

jQuery(() => {
    Backup.initializeAll();
});
