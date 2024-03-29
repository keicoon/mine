// '$' variable is global ( on script scope )
// 'is_debug' is only used for developer.

var $canvas = document.createElement("canvas");
document.getElementById('canvas').appendChild($canvas);

let board_width = 600;
let menu_width = 200;
// fit for mobile device
if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    const width = (window.innerWidth || document.body.clientWidth);
    board_width = width * 0.75;
    menu_width = width * 0.25;
}
$canvas.width = board_width + menu_width;
$canvas.height = board_width;
$canvas.border = "3px solid dark";

var $ctx = $canvas.getContext("2d");

var $game_config = {
    is_debug: false, // use only when debugging
    board_width, menu_width,
    mine_num: 0, block_side_num: 0,
    select_type: -1 // option for mobile
}
function getGameConfig(keyword) {
    switch (keyword) {
        case "level_table":
            return { mine_num: $game_config.mine_num, block_side_num: $game_config.block_side_num };
        default:
            return $game_config[keyword];
    }
}

var $imgs = {}
function LoadImgage() {
    function load(keyword, src, size) {
        var img = new Image(size, size);
        img.src = src;

        $imgs[keyword] = img;
    }

    load("flag", "flag.jpg", 65);
    load("mine", "mine.jpg", 65);
}
LoadImgage();

var $anim = [];

function draw() {
    var { block_side_num } = getGameConfig("level_table");
    // clear canvas
    $ctx.clearRect(0, 0, $canvas.width, $canvas.height);

    function draw_menu() {
        $ctx.font = `${menu_width * 0.1}px serif`;
        $ctx.fillStyle = "black";
        const dx = menu_width * 0.1;
        const dy = board_width * 0.1;
        var y = 0;
        y += dy;
        $ctx.fillText(`PlayTime: ${$game.current_time} s`, board_width + dx, y);
        y += dy;
        $ctx.fillText(`Block: ${$game.remain_block}`, board_width + dx, y);
        y += dy;
        $ctx.fillText(`Point: ${$game.point}`, board_width + dx, y);
        y += dy;
        const img_size = dx * 2;
        $ctx.fillText('flag: ', board_width + dx, y);
        $ctx.drawImage($imgs['flag'], board_width + dx * 4, y - img_size, img_size, img_size);
        y += dy;
        $ctx.fillText('mine: ', board_width + dx, y);
        $ctx.drawImage($imgs['mine'], board_width + dx * 4, y - img_size, img_size, img_size);
    }
    draw_menu();

    function draw_board() {
        for (var i = 0; i < block_side_num ** 2; i++) {
            var block = $game.blocks[i];

            $ctx.fillStyle = block.visibility === 0 ? "#D3D3D3" : "#AAAAAA";
            $ctx.fillRect(block.x, block.y, block.width, block.width);

            if (block.visibility === 0) {
                $ctx.fillStyle = "#C5C5C5";
                $ctx.fillRect(block.x + block.width * 0.9, block.y, block.width * 0.1, block.width);
                $ctx.fillRect(block.x, block.y + block.width * 0.9, block.width, block.width * 0.1);
                $ctx.fillStyle = "white";
                $ctx.fillRect(block.x, block.y, block.width * 0.1, block.width);
                $ctx.fillRect(block.x, block.y, block.width, block.width * 0.1);
            }

            $ctx.strokeStyle = "#3A3B3C";
            $ctx.lineWidth = 3;
            $ctx.beginPath();
            $ctx.rect(block.x, block.y, block.width, block.width);
            $ctx.stroke();
        }
    }
    draw_board();

    function draw_mine() {
        for (var i = 0; i < block_side_num ** 2; i++) {
            var block = $game.blocks[i];
            if (block.state === 1) {
                $ctx.drawImage($imgs['mine'], block.x + 2, block.y + 2, block.width - 4, block.width - 4);
            }
        }
    }
    if ($game.game_state === 0 || $game_config.is_debug) {
        draw_mine();
    }

    function draw_flag() {
        for (var i = 0; i < block_side_num ** 2; i++) {
            var block = $game.blocks[i];
            if (block.user_state === 1) {
                $ctx.drawImage($imgs['flag'], block.x + 2, block.y + 2, block.width - 4, block.width - 4);
            }
        }
    }
    draw_flag();

    function draw_mine_num() {
        const mine_num_color = [
            "blue", // 1
            "green", // 2
            "red", // 3
            "#000080", // 4
            "#570328", // 5
            "#570328", // 6
            "black", // 7
            "grey", // 8
        ]
        for (var i = 0; i < block_side_num ** 2; i++) {
            var block = $game.blocks[i];
            if (block.visibility === 1 || $game_config.is_debug) {
                if (block.nearest_mine_num > 0 && block.state === 0) {
                    $ctx.font = `${block.width * 0.5}px serif`;
                    $ctx.fillStyle = mine_num_color[block.nearest_mine_num - 1];
                    $ctx.fillText(block.nearest_mine_num, block.x + block.width * 0.4, block.y + block.width * 0.6);
                }
            }
        }
    }
    draw_mine_num();

    function draw_fx(anim) {
        $ctx.save();

        $ctx.fillStyle = anim.color;
        $ctx.globalAlpha = anim.alpha;
        $ctx.translate(anim.x, anim.y);
        $ctx.rotate(anim.degree * Math.PI / 180);
        $ctx.fillRect(-anim.width * 0.5, - anim.width * 0.5, anim.width, anim.width);

        $ctx.restore();
    }
    for (var i = 0; i < $anim.length; i++) {
        draw_fx($anim[i]);
    }
}

function add_block_fx(block, delay = 0) {
    var x = block.x + block.width * 0.5;
    var y = block.y + block.width * 0.5;
    $fx_event_queue.push({
        x, y, width: block.width,
        // delay is smaller then 7 ( depth )
        delay: Math.min(delay, 7)
    });
}

var $event_queue = [];
var $fx_event_queue = [];
function update() {
    for (var i = $anim.length - 1; i >= 0; i--) {
        var anim = $anim[i];
        // change
        anim.width *= 0.9; anim.alpha -= 0.1; anim.degree += 15;
        if (anim.alpha < 0) {
            $anim.splice(i, 1);
        }
    }

    if ($game.game_state === 0) return;

    var { block_side_num } = getGameConfig("level_table");

    function process_event() {
        for (var i = 0; i < $event_queue.length; i++) {
            var { which, x, y } = $event_queue[i];
            for (var i = 0; i < block_side_num ** 2; i++) {
                var block = $game.blocks[i];
                // AABB
                if (block.is_on({ x, y })) {
                    handle_button(which, block);
                    break;
                }
            }
        }
        $event_queue = [];
    }
    function process_fx() {
        for (var i = $fx_event_queue.length - 1; i >= 0; i--) {
            var fx = $fx_event_queue[i];
            if (fx.delay <= 0) {
                $anim.push({
                    x: fx.x, y: fx.y, width: fx.width,
                    // color for animation
                    color: "yellow",
                    alpha: 1.0, degree: 0
                })
                $fx_event_queue.splice(i, 1);
            } else {
                fx.delay -= 1;
            }
        }
    }
    if ($game.game_state === 1) {
        process_event($event_queue[i]);
        process_fx();
    }
    function process_chain_block(block) {
        var { block_side_num } = getGameConfig("level_table");
        var blocks = $game.blocks;

        var chain_blocks = [];
        var chain_block_depth = {};
        function recursive(i, depth) {
            if (chain_blocks.includes(i)) return;
            else {
                chain_blocks.push(i);
                chain_block_depth[i] = depth;
            }

            function get(dx, dy) {
                var x = i % block_side_num, y = Math.floor(i / block_side_num);
                x += dx;
                y += dy;

                if (0 <= x && x < block_side_num
                    && 0 <= y && y < block_side_num
                    && blocks[y * block_side_num + x].visibility === 0) {
                    return blocks[y * block_side_num + x].id;
                }
                return -1;
            }

            if (blocks[i].nearest_mine_num !== 0) return;

            if (get(0, -1) !== -1) recursive((get(0, -1)), depth + 1);
            if (get(-1, 0) !== -1) recursive((get(-1, 0)), depth + 1);
            if (get(1, 0) !== -1) recursive((get(1, 0)), depth + 1);
            if (get(0, 1) !== -1) recursive((get(0, 1)), depth + 1);
        }

        recursive(block.id, 0);

        for (var i = 0; i < chain_blocks.length; i++) {
            var id = chain_blocks[i];
            if (id === block.id) continue;

            var chain_block = blocks[id];
            if (chain_block.user_state === 1) {
                $game.point -= 1; // penalty
            } else {
                const bonus = 1;
                $game.point += 10 + bonus;
            }

            chain_block.user_state = 0;
            chain_block.visibility = 1;

            add_block_fx(chain_block, chain_block_depth[i]);

            $game.remain_block -= 1;
        }
    }
    function add_bonus_flag() {
        for (var i = 0; i < block_side_num ** 2; i++) {
            var block = $game.blocks[i];

            if (block.user_state === 1 && block.state === 1) {
                $game.point += 100;
            }
        }
    }
    function left_button(block) {
        if (block.visibility === 0) {
            block.user_state = 0;
            block.visibility = 1;

            if (block.state === 1) {
                $game.end_time = Date.now();
                game_over(false);
                return;
            }

            $game.remain_block -= 1;
            // succ
            $game.point += 10;
            add_block_fx(block);

            process_chain_block(block);

            if ($game.remain_block === 0) {
                $game.end_time = Date.now();

                add_bonus_flag();

                game_over(true);
            }
        }
    }
    function right_button(block) {
        // flag
        if (block.visibility === 0) {
            block.user_state = Math.abs(block.user_state - 1);
        }
    }
    function handle_button(which, block) {
        if (which === 0) {
            left_button(block);
        } else if (which === 1) {
            right_button(block);
        }
    }

    // update time
    const prev_seoncds = $game.current_time;
    $game.current_time = Math.floor((Date.now() - $game.start_time) * 0.001); // for seconds
    if ($game.current_time - prev_seoncds >= 1) {
        update_by_one_seconds();
    }
}

function update_by_one_seconds() {
    $game.point = Math.max($game.point - 1, 0); // penalty
}

var $game = {
    blocks: [],
    // game_state ( 0 is gameover / 1 is running / 2 is ready)
    game_state: 2,
    remain_block: 0,
    start_time: 0,
    point: 0
};
function game_over(win) {
    $game.game_state = 0;

    if (!win) { alert("game over"); }
    else { alert("game win"); }
}
function init() {
    var { block_side_num, mine_num } = getGameConfig("level_table");
    var board_width = getGameConfig("board_width");
    var block_width = board_width / block_side_num;

    var blocks = [];
    function add_block(state) {
        // state ( 0 is none / 1 is mine )
        // user_state ( 0 is none / 1 is flag )
        return {
            state, user_state: 0, visibility: 0, nearest_mine_num: 0,
            id: 0, x: 0, y: 0, width: block_width
        }
    }
    function shuffle_block() {
        for (var i = block_side_num ** 2 - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
        }
    }
    function $is_on_block(pos) {
        return (this.x < pos.x && pos.x < this.x + this.width
            && this.y < pos.y && pos.y < this.y + this.width);
    }
    for (var i = 0; i < block_side_num ** 2; i++) {
        var state = 0;
        if (i < mine_num) {
            state = 1;
        }
        blocks.push(add_block(state));
        blocks[i].is_on = $is_on_block;
    }

    shuffle_block();

    function get_nearest_mine_num(i) {
        function get(dx, dy) {
            var x = i % block_side_num, y = Math.floor(i / block_side_num);
            x += dx;
            y += dy;

            return 0 <= x && x < block_side_num
                && 0 <= y && y < block_side_num
                && blocks[y * block_side_num + x].state === 1;
        }
        var mine_num = 0;

        if (get(-1, -1)) mine_num += 1;
        if (get(0, -1)) mine_num += 1;
        if (get(1, -1)) mine_num += 1;
        if (get(-1, 0)) mine_num += 1;
        if (get(1, 0)) mine_num += 1;
        if (get(-1, 1)) mine_num += 1;
        if (get(0, 1)) mine_num += 1;
        if (get(1, 1)) mine_num += 1;

        return mine_num;
    }
    // set nearest_mine_num
    for (var i = 0; i < block_side_num ** 2; i++) {
        var num = get_nearest_mine_num(i);
        blocks[i].nearest_mine_num = num;
    }

    // set x, y
    var x = 0, y = 0;
    for (var i = 0; i < block_side_num ** 2; i++) {
        if (i != 0 && i % block_side_num == 0) {
            x = 0;
            y += block_width;
        }

        blocks[i].id = i;
        blocks[i].x = x;
        blocks[i].y = y;

        x += block_width;
    }
    $game.blocks = blocks;
    $game.game_state = 1;
    $game.remain_block = getGameConfig("level_table").block_side_num ** 2 - getGameConfig("level_table").mine_num;
    $game.start_time = Date.now();
    $game.point = 0;

    // @events
    $canvas.addEventListener('contextmenu', (event) => {
        event.preventDefault();
    })
    $canvas.addEventListener("mouseup", (event) => {
        var rect = $canvas.getBoundingClientRect();
        $event_queue.push({
            which: (event.button == 2 || $game_config.select_type === 1) ? 1 : 0,
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        });
    });
}

var interval_id;
// html event handler
document.getElementById("run_button").addEventListener('click', () => {
    // validate
    var block_num = parseInt(document.getElementById("block_num").value);
    var mine_num = parseInt(document.getElementById("mine_num").value);

    if (mine_num > (block_num ** 2) * 0.5) {
        alert("too big of mine. decreate mine num");
        return;
    }

    $game_config.mine_num = mine_num;
    $game_config.block_side_num = block_num;

    if (!interval_id) {
        clearInterval(interval_id);
    }

    init();

    interval_id = setInterval(() => {
        draw();
        update();
    }, 34); // 30 fps
})

var radioButtonList = document.getElementsByName('clickType');
radioButtonList.forEach(button => button.addEventListener('click', () => {
    radioButtonList.forEach(button => {
        if (button.checked) {
            $game_config.select_type = button.value === 'Click' ? 0 : 1;
        }
    });
}));
