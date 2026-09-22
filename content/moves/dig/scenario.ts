/**
 * 挖洞 / Dig —— 可执行设计说明。
 *
 * 一句话：钻入地下、在起手锁定的落点破土冲出，以落点为心结算范围伤害并把敌人掀飞，落点那一层松软地表
 * 被换成粗土、留下冲击痕。落点在准备期就锁死，所以这招真正需要的场面是一个停得住的目标：施术者只带
 * 这一招就只会挖洞，目标迟钝、带撞击还手，两者相距几格，AI 一见到敌人就会下铲。
 *
 * 场面：松软地面（泥土层）、晴天正午，30 级穿山鼠（会学挖洞）对 16 级呆呆兽，相距 4 格。
 * 泥土让破土吃到软地系数：范围更大、掀得更高，冲击痕是粗土。断言只取必然发生的事实——被放出过、
 * 破土的伤害落到目标身上、位移确实把施术者送到了锁定点、落点地表留下了冲击痕（粗土）。
 * 命中/暴击/伤害量、掀飞的高度、一次卷到几个目标都随走位与掷骰变化，写进 note。
 */
Smoke.scenario("dig", function (stage) {
    // Soft ground under the whole arena: dig's material read turns this into the wide, high eruption whose scar is coarse dirt.
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:dirt");
    stage.weather("clear");
    stage.time("noon");
    var digger = stage.pokemon({ species: "sandshrew", level: 30, moves: ["dig"], at: [-2, 0, 0] });
    // A slow target stays inside the locked radius while the user burrows; a fast one can walk the point out from under it.
    var prey = stage.pokemon({ species: "slowpoke", level: 16, moves: ["tackle"], at: [2, 0, 0] });
    stage.hostile(digger, prey);
    stage.until(1200, function () {
        return stage.casts("dig", digger) >= 1 && stage.damageTo(prey) > 0;
    }, function () {
        // Terrain leases land through the world; give them a few ticks before reading the scar.
        stage.after(8, function () {
            var scars = stage.changedBlocks().filter(function (cell) {
                return cell.after === "minecraft:coarse_dirt";
            });
            stage.expect(stage.casts("dig", digger) >= 1, "sandshrew committed dig");
            stage.expect(stage.damageTo(prey) > 0, "the eruption damaged the target");
            stage.expect(stage.travelled(digger) > 0.5, "dig moved the user to the point locked at cast");
            stage.expect(scars.length > 0, "the eruption left a coarse-dirt scar on the soft ground");
            stage.note("dig always hits what stays inside the locked radius, but the point is locked during the 12t windup so a fast target can walk out; the pair stands 4 blocks apart to keep the prey inside. Variable: crit, damage roll, launch height, how many enemies a single eruption catches, and whether the prey survives.", {
                casts: stage.casts("dig", digger),
                damageToPrey: Math.round(stage.damageTo(prey) * 10) / 10,
                diggerTravelled: Math.round(stage.travelled(digger) * 10) / 10,
                scarCells: scars.length,
                preyAlive: prey.alive(),
                preyHealth: Math.round(prey.health() * 10) / 10,
                preyCasts: stage.casts("tackle", prey)
            });
            stage.done();
        });
    }, "dig is cast, lands and scars the soft ground within 60 s");
});
