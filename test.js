desktop_state.socket = {
    websocket: null,
    is_ready: !1,
    heartbeat_interval_id: null,
    ready: function() {
        let outer = this;
        this.is_ready = !0,
        outer.heartbeat_interval_id = setInterval(function() {
            outer.send({
                activity: "heartbeat"
            })
        },
        3e4)
    },
    init: function() {
        this.is_ready = !1,
        this.heartbeat_interval_id && (clearInterval(this.heartbeat_interval_id), this.heartbeat_interval_id = null),
        this.websocket = new WebSocket("wss://" + window.location.host + "/wss/socket/"),
        this.websocket.onmessage = this.receive
    }
},



$('#submit_code_btn').click(function () {

    if ($(this).hasClass('disabled')){
        return false;
    }
    $('#run_code_btn').addClass('disabled');
    $(this).addClass('disabled');

    $('#run-code-status-block').hide();
    $('#submit-code-status-block').show();
    $('#submit-code-status-compilation-log-id').hide();
    $('#submit-code-status-loading-gif-id').show();

    let $status_value = $('#submit-code-status-value-id');
    $status_value.text('Uploading');
    $status_value.css('color', code_status_colors[$status_value.text()]);

    let mode = GLOBAL_PROBLEM_MODE;
    let record = JSON.stringify(GLOBAL_PROBLEM_RECORD);
    let ptime = 0;
    if (GLOBAL_PROBLEM_MODE === "challenge") ptime = spent_time;

    if (GLOBAL_PROBLEM_CHALLENGE_MODE_STATUS !== 0) {   // 已结束
        mode = "normal";
        record = "[]";
        ptime = 0;
    }

    let submit_func = function() {
        desktop_state.socket.websocket.send(JSON.stringify({
            'activity': "problem_submit_code",
            'problem_id': PROBLEM_ID,
            'code': ace.edit("code_editor").getValue(),
            'language': $('.code_editor_option_language').children('select').children(':selected').text(),
            'mode': mode,
            'problem_activity_id': GLOBAL_PROBLEM_ACTIVITY_ID,  // 竞赛模式下的竞赛ID
            'record': record,
            'program_time': ptime,
        }));
    };

    submit_func();

    problem_submit_code_status_func = setInterval(function () {
        desktop_state.socket.init();
        desktop_state.socket.websocket.onopen = function () {
            submit_func();
            desktop_state.socket.websocket.onopen = null;
        };
    }, 3000);

    return false;
});

$('#run_code_btn').click(function () {

    if ($(this).hasClass('disabled')){
        return false;
    }
    $('#submit_code_btn').addClass('disabled');
    $(this).addClass('disabled');

    $('#submit-code-status-block').hide();
    let $run_code_status_block = $('#run-code-status-block');
    $run_code_status_block.css('margin-top', '75px');
    $run_code_status_block.show();
    $('#run-code-status-loading-gif-id').show();

    let $status_value = $('#run-code-status-value-id');
    if ($status_value.hasClass("submit-code-status-value-chinese")) {
        $status_value.removeClass("submit-code-status-value-chinese")
            .addClass("submit-code-status-value");
    }
    $status_value.text('Uploading');
    $status_value.css('color', code_status_colors[$status_value.text()]);
    $('#run-code-stdout').text('');
    $('#run-code-time').hide();

    let run_func = function() {
        desktop_state.socket.websocket.send(JSON.stringify({
            'activity': "problem_run_code",
            'problem_id': PROBLEM_ID,
            'code': ace.edit("code_editor").getValue(),
            'language': $('.code_editor_option_language').children('select').children(':selected').text(),
            'input': $('#run-code-stdin').val(),
        }));
    };

    run_func();
    problem_run_code_status_func = setInterval(function () {
        desktop_state.socket.init();
        desktop_state.socket.websocket.onopen = function () {
            run_func();
            desktop_state.socket.websocket.onopen = null;
        };
    }, 3000);

    return false;
});


let desktop_state = {
    init: function() {
        this.os.init(),
        this.window.init(),
        this.taskbar.init(),
        this.socket.init(),
        this.advertisement.init()
    }
};init
$(document).ready(function() {
    desktop_state.init()
}),
desktop_state.advertisement = {
    init: function() {
        this.socket.init()
    }
},
desktop_state.advertisement.close = function(data) {
    desktop_state.advertisement.close_single(),
    desktop_state.advertisement.socket.send({
        event: "close",
        advertisement_id: data.advertisement_id
    })
},
desktop_state.advertisement.close_single = function() {
    $("#fs-gui-advertisement-base").hide("slide", {
        direction: "left"
    },
    200),
    clearInterval(desktop_state.advertisement.popup.effect_func_id)
},
desktop_state.advertisement.open = function(data) {
    desktop_state.advertisement.socket.send({
        event: "open",
        advertisement_id: data.advertisement_id
    }),
    window.open(data.url, "_blank").focus(),
    desktop_state.advertisement.close_single()
},
desktop_state.advertisement.popup = function(data) {
    let $ads = $("#fs-gui-advertisement-base"),
    $close_btn = $("#fs-gui-advertisement-base-close-btn");
    clearInterval(this.effect_func_id),
    $ads.hide(),
    $ads.off("click"),
    $close_btn.off("click"),
    $ads.css({
        "background-color": "red",
        color: "white",
        "font-size": "2.4vh",
        "font-weight": "bold",
        "border-radius": "1vh",
        padding: "1.2vh 2.5vh 1vh 1vh"
    }),
    $("#fs-gui-advertisement-base-title").text(data.title),
    $("#fs-gui-advertisement-base-price").text(data.price),
    $("#fs-gui-advertisement-base-inventory").text(data.inventory),
    $ads.show("slide", {
        direction: "left"
    },
    200),
    $close_btn.on("click",
    function() {
        return desktop_state.advertisement.close(data),
        !1
    }),
    $ads.on("click",
    function() {
        desktop_state.advertisement.open(data)
    })
},
desktop_state.advertisement.socket = {
    init: function() {}
},
desktop_state.advertisement.socket.receive = function(data) {
    let event = data.event;
    "popup" === event ? desktop_state.advertisement.popup(data) : "close" === event ? desktop_state.advertisement.close_single() : "open" === event && desktop_state.advertisement.close_single()
},
desktop_state.advertisement.socket.send = function(data) {
    data.activity = "fs_gui_advertisement",
    desktop_state.socket.websocket.send(JSON.stringify(data))
},
desktop_state.os = {
    init: function() {
        this.builtin.init(),
        this.third_party.init()
    }
},
desktop_state.os.builtin = {
    init: function() {
        this.api.init(),
        this.application.init(),
        this.memory.init(),
        this.settings.init()
    }
},
desktop_state.os.builtin.api = {
    init: function() {
        this.file.init()
    }
},
desktop_state.os.builtin.api.file = {
    init: function() {
        this.operation.init()
    }
},
desktop_state.os.builtin.api.file.operation = {
    add: null,
    update: null,
    delete: null,
    update_refactor_rename: null,
    command_ls: null,
    command_cp: null,
    command_mv: null,
    command_read: null,
    set: function(urls) {
        this.add = urls.add,
        this.update = urls.update,
        this.delete = urls.delete,
        this.update_refactor_rename = urls.update_refactor_rename,
        this.command_ls = urls.command_ls,
        this.command_cp = urls.command_cp,
        this.command_mv = urls.command_mv,
        this.command_read = urls.command_read
    },
    init: function() {}
},
desktop_state.os.builtin.application = {
    applications: {},
    set: function(applications) {
        this.applications = applications
    },
    init: function() {}
},
desktop_state.os.builtin.memory = {
    init: function() {
        this.clipboard.init()
    }
},
desktop_state.os.builtin.memory.clipboard = {
    records: [],
    clear: function() {
        let length = this.records.length;
        if (length > 0) {
            let record = this.records[length - 1];
            if ("cut" === record.type) for (let i = 0; i < record.files.length; i++) {
                let $icon = record.files[i].$icon;
                $icon.length && $icon.removeClass("file-explorer-main-field-item-icon-cut")
            }
            this.records = []
        }
    },
    cut: function(files, window_id) {
        this.clear();
        for (let i = 0; i < files.length; i++) {
            files[i].$icon.addClass("file-explorer-main-field-item-icon-cut")
        }
        this.records.push({
            files,
            window_id,
            type: "cut"
        })
    },
    copy: function(files, window_id) {
        this.clear(),
        this.records.push({
            files,
            window_id,
            type: "copy"
        })
    },
    paste: function() {
        let length = this.records.length;
        if (length > 0) {
            let element = this.records[length - 1];
            "cut" === element.type ? this.clear() : element.type
        }
    },
    init: function() {}
},
desktop_state.os.builtin.settings = {
    media_url: null,
    set: function(configs) {
        this.media_url = configs.media_url,
        this.static_url = configs.static_url
    },
    init: function() {}
},
desktop_state.os.third_party = {
    init: function() {
        this.api.init()
    }
},
desktop_state.os.third_party.api = {
    init: function() {
        this.oauth2.init()
    }
},
desktop_state.os.third_party.api.oauth2 = {
    init: function() {
        this.authorize.init()
    }
},
desktop_state.os.third_party.api.oauth2.authorize = {
    init: function() {
        this.url = DESKTOP_STATE_OS_THIRD_PARTY_API_OAUTH2_AUTHORIZE_URL
    },
    authorize: function(AcWingOS, appid, redirect_uri, scope, state, callback) {
        let unquote_redirect_uri = redirect_uri;
        AcWingOS.api.oauth2.authorize__redirect_uri_callback = function(data) {
            $.ajax({
                url: unquote_redirect_uri,
                type: "GET",
                data,
                success: function(resp) {
                    callback(resp)
                }
            })
        };
        let wid = AcWingOS.settings.window_id,
        file_id = desktop_state.window.windows[wid].file_id;
        $.ajax({
            url: this.url,
            type: "GET",
            data: {
                file_id,
                appid,
                redirect_uri,
                scope,
                state
            },
            success: function(resp) {
                "waiting for user authorize" === resp.result ? (unquote_redirect_uri = resp.redirect_uri, desktop_state.window.open_inner_hard_window(file_id, wid, "api_oauth2_authorize")) : "success" === resp.result ? (unquote_redirect_uri = resp.redirect_uri, AcWingOS.api.oauth2.authorize__redirect_uri_callback({
                    code: resp.code,
                    state: resp.state
                })) : AcWingOS.api.oauth2.authorize__redirect_uri_callback(resp)
            }
        })
    }
},
desktop_state.socket = {
    websocket: null,
    is_ready: !1,
    heartbeat_interval_id: null,
    ready: function() {
        let outer = this;
        this.is_ready = !0,
        outer.heartbeat_interval_id = setInterval(function() {
            outer.send({
                activity: "heartbeat"
            })
        },
        3e4)
    },
    init: function() {
        this.is_ready = !1,
        this.heartbeat_interval_id && (clearInterval(this.heartbeat_interval_id), this.heartbeat_interval_id = null),
        this.websocket = new WebSocket("wss://" + window.location.host + "/wss/socket/"),
        this.websocket.onmessage = this.receive
    }
},
desktop_state.socket.receive = function(event) {
    let data = JSON.parse(event.data),
    activity = data.activity;
    if ("socket" === activity)"ready" === data.state && desktop_state.socket.ready();
    else if ("fs_file_app_ac_chat" === activity) {
        let ac_chat_file_id = desktop_state.os.builtin.application.applications.ac_chat,
        ac_chat = desktop_state.taskbar.widgets.apps.apps.get(ac_chat_file_id);
        ac_chat && ac_chat.obj && ac_chat.obj.socket.receive(data)
    } else if ("problem_submit_code_status" === activity) handle_problem_submit_code_status(data);
    else if ("ac_saber_problem_submit_code_status" === activity) {
        let window_id = parseInt(data.window_id);
        desktop_state.window.windows[window_id].obj.body.main.footer.handle_problem_submit_code_status(data)
    } else if ("problem_run_code_status" === activity) handle_problem_run_code_status(data);
    else if ("chat_problem_run_code_status" === activity) handle_chat_problem_run_code_status(data);
    else if ("ac_editor_run_code_status" === activity) AcEditorMenuWholeRunCodeHead.handle_ac_editor_run_code_status(data);
    else if ("ac_saber_run_code_status" === activity) {
        let window_id = parseInt(data.ac_editor_window_id);
        desktop_state.window.windows[window_id].obj.body.main.footer.handle_problem_run_code_status(data)
    } else "third_party_weixin_pay_notify_user_result" === activity ? handle_third_party_weixin_pay_notify_user_result(data) : "activity_aclass_send_message" === activity ? handle_activity_aclass_send_message(data) : "activity_aclass_broadcast_online_status" === activity ? handle_activity_aclass_broadcast_online_status(data) : "activity_aclass_pull_other_people_infos" === activity ? handle_activity_aclass_pull_other_people_infos(data) : "fs_file_app_ac_saber" === activity ? AcSaber.websocket_receive(data) : "fs_file_app_ac_terminal" === activity ? AcTerminal.websocket_receive(data) : "fs_gui_advertisement" === activity && desktop_state.advertisement.socket.receive(data)
},
desktop_state.socket.send = function(data) {
    desktop_state.socket.websocket.send(JSON.stringify(data))
},
desktop_state.taskbar = {
    init: function() {
        this.begin.init(),
        this.task_list.init(),
        this.search.init(),
        this.widgets.init()
    }
},
desktop_state.taskbar.begin = {
    init: function() {
        this.file.init(),
        this.application.init(),
        this.settings.init();
        let $menu = $(".fs-gui-taskbar-begin-menu");
        $(".fs-gui-taskbar-begin").click(function(event) {
            $menu.is(":hidden") ? $menu.show() : $menu.hide()
        }),
        $(window).mousedown(function(e) {
            0 === $(e.target).closest(".fs-gui-taskbar-begin-menu").length && 0 === $(e.target).closest(".fs-gui-taskbar-begin").length && $menu.hide()
        })
    }
},
desktop_state.taskbar.begin.application = {
    init: function() {
        $(".fs-gui-taskbar-begin-menu-item-application").click(function() {
            desktop_state.window.open_outer_window(desktop_state.os.builtin.application.applications.file_explorer, "main&address=/我的空间/应用/")
        })
    }
},
desktop_state.taskbar.begin.file = {
    init: function() {
        $(".fs-gui-taskbar-begin-menu-item-file").click(function() {
            desktop_state.window.open_outer_window(desktop_state.os.builtin.application.applications.file_explorer, "main&address=~/")
        })
    }
},
desktop_state.taskbar.begin.settings = {
    init: function() {
        $(".fs-gui-taskbar-begin-menu-item-settings").click(function() {
            desktop_state.window.open_outer_window(desktop_state.os.builtin.application.applications.settings, "menu")
        })
    }
},
desktop_state.taskbar.search = {
    init: function() {
        $("#fs-gui-taskbar-search-field").autocomplete({
            source: DESKTOP_STATE_TASKBAR_SEARCH_URL,
            delay: 1e3,
            minLength: 1,
            position: {
                my: "left bottom",
                at: "left top"
            },
            autoFocus: !0,
            select: function(event, ui) {
                let id = ui.item.id;
                desktop_state.window.open(id)
            }
        }).data("ui-autocomplete")._renderItem = function(ul, item) {
            return $("<li style='height:5vh; line-height: 5vh; border-bottom: 0.1vh;'></li>").attr("id", item.id).data("item.autocomplete", item).append("<span style='font-size: 1.7vh;'>" + item.title + "</span>").appendTo(ul)
        }
    }
},
desktop_state.taskbar.task_list = {
    size: 0,
    tasks: [],
    focus_task: !1,
    init: function() {
        $(".fs-gui-taskbar-task-list").sortable({
            containment: "parent"
        }).disableSelection()
    },
    update_item_width: function() {
        let size = desktop_state.taskbar.task_list.size;
        if (size >= 8) {
            let item_width = parseFloat($(".fs-gui-taskbar-task-list").css("width").replace("px", "")) / size;
            $(".fs-gui-taskbar-task-list-item").css("width", item_width + "px")
        }
    }
},
desktop_state.taskbar.task_list.close = function(wid, is_fake) {
    let task = desktop_state.taskbar.task_list.tasks[wid].task;
    is_fake ? task.hide() : (task.remove(), delete desktop_state.taskbar.task_list.tasks[wid]),
    desktop_state.taskbar.task_list.size--,
    desktop_state.taskbar.task_list.update_item_width()
},
desktop_state.taskbar.task_list.focus = function(wid) {
    desktop_state.taskbar.task_list.unfocus();
    let task = desktop_state.taskbar.task_list.tasks[wid];
    desktop_state.taskbar.task_list.focus_task = task,
    task.task.addClass("fs-gui-taskbar-task-list-item-focus")
},
desktop_state.taskbar.task_list.open = function(wid, title, icon_url, is_fake) {
    if (is_fake) desktop_state.taskbar.task_list.tasks[wid].task.show();
    else {
        let $task_list = $(".fs-gui-taskbar-task-list"),
        $task_item = $('<li class="btn btn-default pull-left fs-gui-taskbar-task-list-item ui-draggable">').append($(` < img src = "${icon_url}"class = "fs-gui-taskbar-task-list-item-icon-img pull-left"alt = "图标" / >`)).append($("<span>").text(title));
        $task_list.append($task_item),
        $task_item.click(function() {
            $task_item.hasClass("fs-gui-taskbar-task-list-item-focus") ? desktop_state.window.minimize(wid) : 1 === desktop_state.taskbar.task_list.tasks[wid].status ? desktop_state.window.focus(wid) : desktop_state.window.revert_to_top(wid)
        }),
        desktop_state.taskbar.task_list.tasks[wid] = {
            task: $task_item,
            status: 1
        }
    }
    desktop_state.taskbar.task_list.size++,
    desktop_state.taskbar.task_list.update_item_width()
},
desktop_state.taskbar.task_list.unfocus = function() {
    desktop_state.taskbar.task_list.focus_task && desktop_state.taskbar.task_list.focus_task.task.removeClass("fs-gui-taskbar-task-list-item-focus")
},
desktop_state.taskbar.widgets = {
    init: function() {
        this.clock.init(),
        this.apps.init()
    }
},
desktop_state.taskbar.widgets.apps = {
    init: function() {},
    apps: new Map,
    notice: function(file_id) {
        let app = this.apps.get(file_id);
        if (!app || app.notice_interval_id) return ! 1;
        app.notice_interval_id = setInterval(function() {
            "0" !== app.$app.css("opacity") ? app.$app.css("opacity", "0") : app.$app.css("opacity", "1")
        },
        500)
    },
    notice_cancel: function(file_id) {
        let app = this.apps.get(file_id);
        if (!app || !app.notice_interval_id) return ! 1;
        clearInterval(app.notice_interval_id),
        app.notice_interval_id = null,
        app.$app.css("opacity", "1")
    },
    set: function(apps) {
        $(".fs-gui-taskbar-widgets-apps");
        for (let i = 0; i < apps.length; i++) {
            let app = apps[i],
            $app = $(`.fs - gui - taskbar - widgets - apps - item - $ {
                app.file_id
            }`);
            $app.click(function() {
                desktop_state.window.open(app.file_id)
            }),
            this.apps.set(app.file_id, {
                file_id: app.file_id,
                title: app.title,
                icon: app.icon,
                $app,
                current_window_id: null,
                is_open: !1,
                obj: null
            }),
            desktop_state.window.open(app.file_id)
        }
    }
},
desktop_state.taskbar.widgets.clock = {
    init: function() {
        this.thumbnail.init(),
        this.calendar.init()
    }
},
desktop_state.taskbar.widgets.clock.calendar = {
    init: function() {
        this.create_html(),
        this.add_listening_events()
    }
},
desktop_state.taskbar.widgets.clock.calendar.add_listening_events = function() {
    let $calendar = desktop_state.taskbar.widgets.clock.calendar.$calendar,
    $clock = $(".fs-gui-taskbar-widgets-clock"),
    outer = desktop_state.taskbar.widgets.clock.calendar;
    $clock.click(function() {
        $calendar.is(":hidden") ? outer.show(desktop_state.taskbar.widgets.clock.thumbnail.month) : $calendar.hide()
    }),
    $(window).mousedown(function(e) {
        0 === $(e.target).closest(".fs-gui-taskbar-widgets-clock-calendar").length && 0 === $(e.target).closest(".fs-gui-taskbar-widgets-clock").length && $calendar.hide()
    })
},
desktop_state.taskbar.widgets.clock.calendar.create_html = function() {
    let father = desktop_state.taskbar.widgets.clock.calendar;
    father.$calendar = $('<div class="fs-gui-taskbar-widgets-clock-calendar"></div>'),
    father.$calendar.css({
        position: "fixed",
        bottom: "5vh",
        right: "0",
        width: "60vh",
        height: "40vh",
        background: "white",
        display: "none",
        "box-shadow": "0 5px 15px 0 rgba(0,0,0,0.08)",
        "border-radius": "5px",
        "background-repeat": "no-repeat",
        "background-size": "100% 100%",
        "user-select": "none",
        "z-index": "1000000"
    }),
    $("body").append(father.$calendar)
},
desktop_state.taskbar.widgets.clock.calendar.notice_texts = ["你知道吗？每当有人在吐槽区潜水，就有人在基础课刷题。", "你知道吗？每WA一道题，就有人同时AC另一道。", "心中无女人，coding自然神", "遇事不决 小学数学", "代码美如画", "勇敢牛牛，不怕困难！", "不管夜晚多么黑暗，黎明终将到来。", "我们的征途是星辰大海", "冲鸭！", "AK IOI！", "就离谱", "妙蛙种子", "米奇妙妙屋", "暴力出奇迹", "《肥肠煎蛋》", "丝滑"],
desktop_state.taskbar.widgets.clock.calendar.show = function(month) {
    let $calendar = desktop_state.taskbar.widgets.clock.calendar.$calendar,
    image_prefix = `$ {
        desktop_state.os.builtin.settings.static_url
    }
    web / img / file_system / gui / taskbar / widgets / clock / `;
    $calendar.empty();
    for (let i = 1; i <= 12; i++) {
        let $date_image = $(` < div > <img src = "${image_prefix}/months/${month}/${i}.png"width = "100%"height = "100%"alt = "${i}" > </div>`),margin_left=.9;i>=10&&(margin_left=1.6),$date_image.css({display:"inline",float:"left",width:"6%",height:"8%","margin-top":"0.8vh","margin-left":`${margin_left}vh`,cursor:"pointer"}),$date_image.click(function(){desktop_state.taskbar.widgets.clock.calendar.show(i)}),$calendar.append($date_image)}$calendar.css({"background-image":`url("${image_prefix}calendar/$ {
            month
        }.jpg ")`});let $weather=$(`<div><img src="$ {
            image_prefix
        }
        weather / 晴 - 白天.png " alt="天气"></div>`);$weather.css({position:"relative ",width:"29 % ",height:"20 % ",left:"4vh ",top:"6.4vh "}),$weather.find("img ").css({position:"absolute ",left:"50 % ",top:"50 % ",transform:"translate( - 50 % , -50 % )",width:"40 % "}),$calendar.append($weather);let texts=desktop_state.taskbar.widgets.clock.calendar.notice_texts,text=texts[(123*user_state.user_id+789*desktop_state.taskbar.widgets.clock.thumbnail.date)%texts.length],$notice=$(`<div>${text}</div>`);$notice.css({position:"relative ",width:"29 % ",height:"60 % ",left:"4vh ",top:"7.2vh ",padding:"2.4vh ",color:"white ","font - weight ":"600 ","font - size ":"2vh "}),$calendar.append($notice),$calendar.show()},desktop_state.taskbar.widgets.clock.thumbnail={init:function(){let $clock=$(".fs - gui - taskbar - widgets - clock "),$time=$clock.find(".fs - gui - taskbar - widgets - clock - time "),$date=$clock.find(".fs - gui - taskbar - widgets - clock - date "),outer=this,refresh_time=function(){let utc_time=new Date,cur_time=new Date(utc_time.getTime()-6e4*utc_time.getTimezoneOffset()),hour=cur_time.getUTCHours(),minute=cur_time.getUTCMinutes(),year=cur_time.getUTCFullYear(),month=cur_time.getUTCMonth()+1,date=cur_time.getUTCDate();outer.year=year,outer.month=month,outer.date=date,outer.hour=hour,outer.minute=minute,outer.second=cur_time.getSeconds(),hour=(hour<10?"0 ":"")+hour,minute=(minute<10?"0 ":"")+minute,month=(month<10?"0 ":"")+month,date=(date<10?"0 ":"")+date,$time.text(hour+": "+minute),$date.text(year+" - "+month+" - "+date)};refresh_time(),setInterval(refresh_time,1e3)}},desktop_state.window={uid:0,current_z_index:2e3,windows:[],pull_windows:[],focus_window:!1,maximized_window_cnt:0,init:function(){desktop_state.window.filter.init(),$(window).mousedown(function(e){0===$(e.target).closest(".fs - gui - window ").length&&0===$(e.target).closest(".fs - gui - taskbar - task - list - item ").length&&desktop_state.window.unfocus()})}},desktop_state.window.close=function(wid,is_force){if(!is_force){let sub_hard_wid=desktop_state.window.sub_window.get_hard_id(wid);if(sub_hard_wid)return desktop_state.window.sub_window.emphasize(sub_hard_wid),!1}let window=desktop_state.window.windows[wid];if("outer_window "===window.type){let app=desktop_state.taskbar.widgets.apps.apps.get(window.file_id);if(app)return app.is_open=!1,desktop_state.window.is_minimized(wid)||desktop_state.window.minimize(wid),desktop_state.taskbar.task_list.close(wid,!0),!1}if(void 0!==window.on_close)for(let i=0;i<window.on_close.length;i++)window.on_close[i]();if(!is_force&&void 0!==window.before_close){for(let i=0;i<window.before_close.length;i++)window.before_close[i]();return!1}let obj=window.obj;if(obj&&"
        function "==typeof obj.onDestroy&&obj.onDestroy(),2===window.status&&(desktop_state.window.maximized_window_cnt--,0===desktop_state.window.maximized_window_cnt&&$("body ").css("overflow ","auto ")),desktop_state.window.focus_window===window&&(desktop_state.window.focus_window=!1),void 0!==window.video_id){let video=document.getElementById(window.video_id);null!==video&&videojs(video).dispose()}let p_window=desktop_state.window.windows[window.parent_window_id];if(p_window&&p_window.sub_window_ids)for(let i=0;i<p_window.sub_window_ids.length;i++)if(p_window.sub_window_ids[i]===wid){p_window.sub_window_ids.splice(i,1);break}let l_events=window.listening_events;if(l_events&&l_events.length>0)for(let i=0;i<l_events.length;i++){let event=l_events[i];event.selector.off(event.handler)}window.window.remove(),delete desktop_state.window.windows[wid],"outer_window "===window.type&&desktop_state.taskbar.task_list.close(wid)},desktop_state.window.filter={init:function(){},all:function(wid){desktop_state.window.filter.links(wid)}},desktop_state.window.filter.links=function(wid){let window_obj=desktop_state.window.windows[wid];window_obj.window.find("a ").each(function(){let link=$(this).attr("href "),outer_a=$(this);window_obj.root_url===link.split(" ? ")[0]?$(this).click(function(){let parts=link.split(" ? "),args=" ? url_type = inner_refresh & wid = "+wid;return outer_a.hasClass("fs - gui - window - link - inner - soft - window ")?args=" ? url_type = inner_soft_window & wid = "+wid:outer_a.hasClass("fs - gui - window - link - inner - hard - window ")&&(args=" ? url_type = inner_hard_window & wid = "+wid),2===parts.length&&(args+=" & "+parts[1]),desktop_state.window.open(window_obj.file_id,args),!1}):$(this).attr("target ","_blank ")})},desktop_state.window.focus=function(wid){desktop_state.window.unfocus();let window_obj=desktop_state.window.windows[wid];desktop_state.window.notice_cancel(wid),desktop_state.taskbar.widgets.apps.notice_cancel(window_obj.file_id);let window=window_obj.window;window.css({"z - index ":desktop_state.window.current_z_index}),desktop_state.window.current_z_index++;let sub_hard_wid=desktop_state.window.sub_window.get_hard_id(wid);if(sub_hard_wid)desktop_state.window.sub_window.emphasize(sub_hard_wid);else{if(desktop_state.window.focus_window=desktop_state.window.windows[wid],window.addClass("fs - gui - window - focus "),window.find(".fs - gui - window - heading ").addClass("fs - gui - window - heading - focus "),"outer_window "===window_obj.type)desktop_state.taskbar.task_list.focus(wid);else if("inner_soft_window "===window_obj.type||"inner_hard_window "===window_obj.type){let w_obj=window_obj;for(;"outer_window "!==desktop_state.window.windows[w_obj.parent_window_id].type;)w_obj=desktop_state.window.windows[w_obj.parent_window_id];desktop_state.taskbar.task_list.focus(w_obj.parent_window_id)}window.trigger("fs - gui - window - event - focus ")}},desktop_state.window.is_focus=function(wid){return desktop_state.window.focus_window.window_id===wid},desktop_state.window.maximize=function(wid){let sub_hard_wid=desktop_state.window.sub_window.get_hard_id(wid);if(sub_hard_wid)return void desktop_state.window.sub_window.emphasize(sub_hard_wid);let w_obj=desktop_state.window.windows[wid],window=w_obj.window;if(w_obj.width=window.css("width "),w_obj.height=window.css("height "),w_obj.left=window.css("left "),w_obj.top=window.css("top "),window.css("width ","100vw "),window.css("height ","95vh "),window.css("left ",0),window.css("top ",0),w_obj.status=2,window.trigger("resize "),window.find(".fs - gui - window - heading - btn - maximize ").length){let src=window.find(".fs - gui - window - heading - btn - maximize ").find("img ").attr("src ");window.find(".fs - gui - window - heading - btn - maximize ").find("img ").attr("src ",src.replace("maximize.png ","revert.png "))}window.draggable("disable ");let resizable_children=window.find(".ui - resizable ");resizable_children.resizable("destroy "),window.resizable("disable "),resizable_children.resizable({minWidth:"5vw ",handles:"e "}),0===desktop_state.window.maximized_window_cnt&&$("body ").css("overflow ","hidden "),desktop_state.window.maximized_window_cnt++},desktop_state.window.minimize=function(wid){let sub_hard_wid=desktop_state.window.sub_window.get_hard_id(wid);if(sub_hard_wid)return void desktop_state.window.sub_window.emphasize(sub_hard_wid);let window=desktop_state.window.windows[wid];desktop_state.window.unfocus(),window.window.hide({duration:0,done:function(){2===window.status&&(desktop_state.window.maximized_window_cnt--,0===desktop_state.window.maximized_window_cnt&&$("body ").css("overflow ","auto ")),desktop_state.taskbar.task_list.tasks[wid].status=2}})},desktop_state.window.is_minimized=function(wid){return 2===desktop_state.taskbar.task_list.tasks[wid].status},desktop_state.window.notice=function(wid){let task=desktop_state.taskbar.task_list.tasks[wid];if(task){let $task=task.task;$task.hasClass("fs - gui - taskbar - task - list - item - notice ")||$task.addClass("fs - gui - taskbar - task - list - item - notice ")}},desktop_state.window.notice_cancel=function(wid){let task=desktop_state.taskbar.task_list.tasks[wid];if(task){task.task.removeClass("fs - gui - taskbar - task - list - item - notice ")}},desktop_state.window.is_notice=function(wid){let task=desktop_state.taskbar.task_list.tasks[wid];if(task){return task.task.hasClass("fs - gui - taskbar - task - list - item - notice ")}},desktop_state.window.open=function(file_id,args,url_type){args=args||"",url_type=url_type||"open_outer_window ";let get_current_open_key=function(){return file_id+" - "+args};if(get_current_open_key()in desktop_state.window.pull_windows)return!1;if("open_outer_window "===url_type){let app=desktop_state.taskbar.widgets.apps.apps.get(file_id);if(app&&app.current_window_id)return app.is_open?(desktop_state.window.is_minimized(app.current_window_id)&&desktop_state.window.revert_to_top(app.current_window_id),desktop_state.window.focus(app.current_window_id),!1):(desktop_state.taskbar.task_list.open(app.current_window_id,null,null,!0),desktop_state.window.revert_to_top(app.current_window_id),app.is_open=!0,!1)}desktop_state.window.pull_windows[get_current_open_key()]=!0;let url=DESKTOP_STATE_WINDOW_OPERATE_OPEN_URL.replace("666 ",file_id.toString());$.get({url:url+args,dataType:"json ",success:function(resp){"success "===resp.error_message&&("outer_window "===resp.type?desktop_state.window.open_outer_window_url(resp):"inner_refresh "===resp.type?desktop_state.window.open_inner_refresh_url(resp):"inner_soft_window "===resp.type?desktop_state.window.open_inner_soft_window_url(resp):"inner_hard_window "===resp.type&&desktop_state.window.open_inner_hard_window_url(resp)),delete desktop_state.window.pull_windows[get_current_open_key()]},error:function(resp){delete desktop_state.window.pull_windows[get_current_open_key()]}})},desktop_state.window.open_outer_window=function(file_id,sub_url){let args="";sub_url&&(args=`?acwing_app_url=${sub_url}`),desktop_state.window.open(file_id,args,"open_outer_window ")},desktop_state.window.open_inner_refresh=function(file_id,wid,sub_url){let args=`?url_type=inner_refresh&wid=${wid}`;sub_url&&(args+=`&acwing_app_url=${sub_url}`),desktop_state.window.open(file_id,args,"open_inner_refresh ")},desktop_state.window.open_inner_soft_window=function(file_id,wid,sub_url){let args=`?url_type=inner_soft_window&wid=${wid}`;sub_url&&(args+=`&acwing_app_url=${sub_url}`),desktop_state.window.open(file_id,args,"open_inner_soft_window ")},desktop_state.window.open_inner_hard_window=function(file_id,wid,sub_url){let args=`?url_type=inner_hard_window&wid=${wid}`;sub_url&&(args+=`&acwing_app_url=${sub_url}`),desktop_state.window.open(file_id,args,"open_inner_hard_window ")},desktop_state.window.open_inner_hard_window_url=function(resp){let parent_wid=resp.window_id,parent_window=desktop_state.window.windows[parent_wid];desktop_state.window.uid++;let wid=desktop_state.window.uid,window_obj={$window:$(resp.window),type:resp.type,file_id:resp.file_id,root_url:resp.root_url,parent_window_id:parent_wid};void 0===parent_window.sub_window_ids&&(parent_window.sub_window_ids=[]),parent_window.sub_window_ids.push(wid),window_obj.$window.css({left:"30vw ",top:"25vh "}),$("body ").append(window_obj.$window),function(window_obj,wid){let $window=window_obj.$window;desktop_state.window.windows[window_obj.parent_window_id];$window.ready(function(){$window.draggable({handle:$(this).find(".fs - gui - window - heading ")});let window_width=$(window).width(),window_height=$(window).height();$window.resizable({minWidth:.15*window_width,minHeight:.04*window_height,handles:"n, e, s, w, se, ne, sw, nw "}),$window.find(".fs - gui - window - heading - btn - close ").click(function(){desktop_state.window.close(wid)}),$window.find(".fs - gui - window - body ").on("mousewheel DOMMouseScroll ",function(e){let e0=e.originalEvent,delta=e0.wheelDelta||-e0.detail;this.scrollTop+=60*(delta<0?1:-1),e.preventDefault()}),$window.mousedown(function(){desktop_state.window.focus(wid)}),$window.find(".fs - gui - window - heading ").dblclick(function(){1===desktop_state.window.windows[wid].status?desktop_state.window.maximize(wid):desktop_state.window.revert_to_bottom(wid)}),$window.contextmenu(function(e){return e.stopPropagation(),e.preventDefault(),!1}),desktop_state.window.focus(wid)})}(window_obj,wid),function(window_obj,wid){let $window=window_obj.$window;desktop_state.window.windows[wid]={window:$window,width:$window.css("width "),height:$window.css("height "),top:$window.css("top "),left:$window.css("left "),status:1,type:window_obj.type,file_id:window_obj.file_id,root_url:window_obj.root_url,parent_window_id:window_obj.parent_window_id,window_id:wid};let video=$window.find("video ");video.length&&(desktop_state.window.windows[wid].video_id=video.attr("id "))}(window_obj,wid),desktop_state.window.filter.all(wid),desktop_state.window.start(resp.uuid,wid)},desktop_state.window.open_inner_refresh_url=function(resp){let wid=resp.window_id,window=desktop_state.window.windows[wid];if(void 0!==window.video_id){let video=document.getElementById(window.video_id);null!==video&&videojs(video).dispose()}let $content=$(resp.content);$content.ready(function(){window.window.find(".fs - gui - window - body ").html($content)}),desktop_state.window.windows[wid].file_id=resp.file_id,desktop_state.window.windows[wid].root_url=resp.root_url,desktop_state.window.filter.all(wid);let video=window.window.find("video ");video.length&&(desktop_state.window.windows[wid].video_id=video.attr("id ")),desktop_state.window.focus(wid),desktop_state.window.start(resp.uuid,wid)},desktop_state.window.open_inner_soft_window_url=function(resp){let parent_wid=resp.window_id,parent_window=desktop_state.window.windows[parent_wid];desktop_state.window.uid++;let wid=desktop_state.window.uid,window_obj={$window:$(resp.window),type:resp.type,file_id:resp.file_id,root_url:resp.root_url,parent_window_id:parent_wid};void 0===parent_window.sub_window_ids&&(parent_window.sub_window_ids=[]),parent_window.sub_window_ids.push(wid),window_obj.$window.css({left:"35vw ",top:"30vh "}),$("body ").append(window_obj.$window),function(window_obj,wid){let $window=window_obj.$window;desktop_state.window.windows[wid]={window:$window,width:$window.css("width "),height:$window.css("height "),top:$window.css("top "),left:$window.css("left "),status:1,type:window_obj.type,file_id:window_obj.file_id,root_url:window_obj.root_url,parent_window_id:window_obj.parent_window_id,window_id:wid};let video=$window.find("video ");video.length&&(desktop_state.window.windows[wid].video_id=video.attr("id "))}(window_obj,wid),function(window_obj,wid){let $window=window_obj.$window;$window.ready(function(){$window.draggable({handle:$(this).find(".fs - gui - window - heading ")});let window_width=$(window).width(),window_height=$(window).height();$window.resizable({minWidth:.15*window_width,minHeight:.04*window_height,handles:"n, e, s, w, se, ne, sw, nw "}),$window.find(".fs - gui - window - heading - btn - close ").click(function(){desktop_state.window.close(wid)}),$window.find(".fs - gui - window - body ").on("mousewheel DOMMouseScroll ",function(e){let e0=e.originalEvent,delta=e0.wheelDelta||-e0.detail;this.scrollTop+=60*(delta<0?1:-1),e.preventDefault()}),$window.contextmenu(function(e){return e.stopPropagation(),e.preventDefault(),!1}),$(window).on("mousedown.close_window_ "+wid,function(e){$window.is(e.target)||0!==$window.has(e.target).length||desktop_state.window.close(wid)}),desktop_state.window.windows[wid].listening_events=[{selector:$(window),handler:"mousedown.close_window_ "+wid}],desktop_state.window.focus(wid)})}(window_obj,wid),desktop_state.window.filter.all(wid),desktop_state.window.start(resp.uuid,wid)},desktop_state.window.open_outer_window_url=function(resp){desktop_state.window.uid++;let wid=desktop_state.window.uid,window_obj={$window:$(resp.window),type:resp.type,file_id:resp.file_id,root_url:resp.root_url},position=function(){let uid=desktop_state.window.uid-1;return{width:10+uid%22,height:10+uid%7*4}}();window_obj.$window.css({left:position.width+"vw ",top:position.height+"vh "}),$("body ").append(window_obj.$window),function(window_obj,wid){let $window=window_obj.$window;$window.ready(function(){$window.draggable({handle:$(this).find(".fs - gui - window - heading ")});let window_width=$(window).width(),window_height=$(window).height();$window.resizable({minWidth:.15*window_width,minHeight:.04*window_height,handles:"n, e, s, w, se, ne, sw, nw "}),$window.find(".fs - gui - window - heading - btn - close ").click(function(){desktop_state.window.close(wid)}),$window.find(".fs - gui - window - heading - btn - maximize ").click(function(){1===desktop_state.window.windows[wid].status?desktop_state.window.maximize(wid):desktop_state.window.revert_to_bottom(wid)}),$window.find(".fs - gui - window - heading - btn - minimize ").click(function(){desktop_state.window.minimize(wid)}),$window.find(".fs - gui - window - heading ").dblclick(function(){1===desktop_state.window.windows[wid].status?desktop_state.window.maximize(wid):desktop_state.window.revert_to_bottom(wid)}),$window.find(".fs - gui - window - body ").on("mousewheel DOMMouseScroll ",function(e){let e0=e.originalEvent,delta=e0.wheelDelta||-e0.detail;this.scrollTop+=60*(delta<0?1:-1),e.preventDefault()}),$window.mousedown(function(){desktop_state.window.focus(wid)}),$window.contextmenu(function(e){return e.stopPropagation(),e.preventDefault(),!1}),desktop_state.taskbar.widgets.apps.apps.get(resp.file_id)||desktop_state.window.focus(wid)})}(window_obj,wid),function(window_obj,wid){let $window=window_obj.$window;desktop_state.window.windows[wid]={window:$window,width:$window.css("width "),height:$window.css("height "),top:$window.css("top "),left:$window.css("left "),status:1,type:window_obj.type,file_id:window_obj.file_id,root_url:window_obj.root_url,window_id:wid};let video=$window.find("video ");video.length&&(desktop_state.window.windows[wid].video_id=video.attr("id "))}(window_obj,wid),desktop_state.window.filter.all(wid),desktop_state.taskbar.task_list.open(wid,resp.title,resp.icon_url),desktop_state.window.start(resp.uuid,wid);let app=desktop_state.taskbar.widgets.apps.apps.get(resp.file_id);app&&(app.current_window_id=wid,app.is_open=!1,desktop_state.window.is_minimized(wid)||desktop_state.window.minimize(wid),desktop_state.taskbar.task_list.close(wid,!0))},desktop_state.window.align_center=function(wid){let $window=desktop_state.window.windows[wid].window,tot_width=$(window).width(),tot_height=$(window).height(),width=$window.width(),height=$window.height();$window.css("left ",(tot_width-width)/2+"px "),$window.css("top ",(tot_height-height)/2+"px ")},desktop_state.window.rename=function(wid,name){desktop_state.window.windows[wid].window.find(".fs - gui - window - heading - title ").find("span ").text(name);let t_obj=desktop_state.taskbar.task_list.tasks[wid];t_obj&&t_obj.task.find("span ").text(name)},desktop_state.window.resize=function(wid,width,height){let $window=desktop_state.window.windows[wid].window;$window.css("width ",width+"vw "),$window.css("height ",height+"vh ")},desktop_state.window.revert_to_bottom=function(wid){let sub_hard_wid=desktop_state.window.sub_window.get_hard_id(wid);if(sub_hard_wid)return void desktop_state.window.sub_window.emphasize(sub_hard_wid);let w_obj=desktop_state.window.windows[wid],window=w_obj.window;if(window.css("width ",w_obj.width),window.css("height ",w_obj.height),window.css("left ",w_obj.left),window.css("top ",w_obj.top),window.trigger("resize "),window.find(".fs - gui - window - heading - btn - maximize ").length){let src=window.find(".fs - gui - window - heading - btn - maximize ").find("img ").attr("src ");window.find(".fs - gui - window - heading - btn - maximize ").find("img ").attr("src ",src.replace("revert.png ","maximize.png "))}w_obj.status=1,window.draggable("enable "),window.resizable("enable "),desktop_state.window.maximized_window_cnt--,0===desktop_state.window.maximized_window_cnt&&$("body ").css("overflow ","auto ")},desktop_state.window.revert_to_top=function(wid){let window=desktop_state.window.windows[wid];window.window.show({duration:0,done:function(){desktop_state.taskbar.task_list.tasks[wid].status=1,desktop_state.window.focus(wid),2===window.status&&(0===desktop_state.window.maximized_window_cnt&&$("body ").css("overflow ","hidden "),desktop_state.window.maximized_window_cnt++),window.window.trigger("resize ")}})},desktop_state.window.start=function(uuid,wid){desktop_state.window.windows[wid].window.ready(function(){try{let file_namespace=eval("namespace_builtin_ "+uuid);file_namespace&&file_namespace.start(wid)}catch(e){}let cnt=0,func_id=setInterval(function(){if(++cnt>300)return clearInterval(func_id),!1;try{let file_namespace=eval("namespace_ "+uuid);file_namespace&&file_namespace.start(wid),clearInterval(func_id)}catch(e){if(0!==e.toString().search(`ReferenceError: namespace_${uuid} is not defined`))throw clearInterval(func_id),e}let wd=desktop_state.window.windows[wid];if(wd){let file_id=wd.file_id;desktop_state.taskbar.widgets.apps.apps.has(file_id)&&clearInterval(func_id)}else clearInterval(func_id)},10)})},desktop_state.window.sub_window={get_hard_id:function(wid){let window_obj=desktop_state.window.windows[wid];if(window_obj.sub_window_ids&&window_obj.sub_window_ids.length>0)for(let i=0;i<window_obj.sub_window_ids.length;i++){let s_window_id=window_obj.sub_window_ids[i];if("inner_hard_window "===desktop_state.window.windows[s_window_id].type)return s_window_id}return null},emphasize:function(wid){desktop_state.window.focus(wid);let cnt=3,window=desktop_state.window.windows[wid].window,blink=function(){setTimeout(function(){window.removeClass("fs - gui - window - focus "),window.find(".fs - gui - window - heading ").removeClass("fs - gui - window - heading - focus "),setTimeout(function(){window.addClass("fs - gui - window - focus "),window.find(".fs - gui - window - heading ").addClass("fs - gui - window - heading - focus "),--cnt>0&&blink()},75)},75)};blink()}},desktop_state.window.unfocus=function(){desktop_state.window.focus_window&&(desktop_state.window.focus_window.window.removeClass("fs - gui - window - focus "),desktop_state.window.focus_window.window.find(".fs - gui - window - heading ").removeClass("fs - gui - window - heading - focus "),desktop_state.window.focus_window=!1),desktop_state.taskbar.task_list.unfocus()},desktop_state.window.get_json_response_url=function(file_id,sub_url){let args=" ? url_type = json_response ";return sub_url&&(args+=`&acwing_app_url=${sub_url}`),DESKTOP_STATE_WINDOW_OPERATE_OPEN_URL.replace("666 ",file_id.toString())+args};
"