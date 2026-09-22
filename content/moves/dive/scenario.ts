/**
 * 潜水 / Dive —— 可执行设计说明。
 *
 * 一句话：沉下去后，一道水痕贴着地面冲向锁定的落点，再从那里窜出，把脚下的目标顶飞、推开；
 * 窜出的落点留下一汪涌泉，把周围的地面火永久浇灭。
 *
 * 场面：会学潜水的 sharpedo（只带潜水，AI 就只会用它）站在软泥地上，对着 9 格外的 slowpoke
 * （只带撞击还手）发动。软地让"深潜"成立——射程 15 格、威力与顶飞更高，AI 不必先走到身边才出手。
 * 目标脚边两侧摆一圈 netherrack 上的火：netherrack 上的火不会自己熄灭，所以火灭掉只可能是窜出
 * 涌泉的 scan 干的，用来读这招留在世界里的痕迹。
 *
 * 断言只取必然事实：这招被放过、窜出的伤害落到目标身上、施术者确实被这一位移过、落点涌泉把
 * 至少一处地面火永久浇灭。命中/扑空（目标在水痕行进期间走开就会让这一击落空）、伤害与暴击、
 * 顶飞与推开多远、涌泉罩住并浇灭几处火都随局面变化，写进 note。
 */
Smoke.scenario("dive", function (stage) {
    // 施术者脚下是软土：diveSubmerged 读到软地，深潜成立（射程 15 格，命中区也更容易罩住目标）。
    for (var s = -1; s <= 1; s++) stage.block([-5, -1, s], "minecraft:dirt");
    // 目标两侧的火：netherrack 上的火永不自然熄灭，只有涌泉的 breakBlock 能把它永久打掉。
    var fireXs = [1, 2, 3, 4, 5, 6];
    for (var i = 0; i < fireXs.length; i++) {
        stage.block([fireXs[i], -1, 1], "minecraft:netherrack");
        stage.block([fireXs[i], -1, -1], "minecraft:netherrack");
        stage.block([fireXs[i], 0, 1], "minecraft:fire");
        stage.block([fireXs[i], 0, -1], "minecraft:fire");
    }
    stage.weather("clear");
    stage.time("noon");

    var a = stage.pokemon({ species: "sharpedo", level: 40, moves: ["dive"], at: [-5, 0, 0] });
    var b = stage.pokemon({ species: "slowpoke", level: 35, moves: ["tackle"], at: [4, 0, 0] });
    stage.hostile(a, b);

    function fireDoused(at: number[]): boolean {
        var blocks = stage.changedBlocks();
        for (var c = 0; c < blocks.length; c++) {
            if (blocks[c].at[0] === at[0] && blocks[c].at[1] === at[1] && blocks[c].at[2] === at[2]
                && blocks[c].before === "minecraft:fire" && blocks[c].after === "minecraft:air") return true;
        }
        return false;
    }
    function anyFireDoused(): boolean {
        for (var x = 0; x < fireXs.length; x++) {
            if (fireDoused([fireXs[x], 0, 1]) || fireDoused([fireXs[x], 0, -1])) return true;
        }
        return false;
    }

    stage.until(900, function () {
        return stage.casts("dive", a) >= 1 && stage.damageTo(b) > 0;
    }, function () {
        // 涌泉的 scan 每刻运行；给它几十刻把落点半径内的火浇掉再读。
        stage.after(20, function () {
            stage.expect(stage.casts("dive", a) >= 1, "sharpedo committed dive");
            stage.expect(stage.damageTo(b) > 0, "dive surfaced under the target and dealt damage");
            stage.expect(stage.travelled(a) > 2, "the dive moved the user to the locked landing");
            stage.expect(anyFireDoused(), "the spring at the landing doused a ground fire for good");
            stage.note("随机/位置相关：水痕锁定后目标是否走开（走开则扑空，本次以命中为准）、伤害与暴击、顶飞/推开多远、涌泉实际罩住并浇灭几处火；深潜由脚下软地触发", {
                casts: stage.casts("dive", a),
                damageToTarget: Math.round(stage.damageTo(b) * 10) / 10,
                userTravelled: Math.round(stage.travelled(a) * 10) / 10,
                targetTravelled: Math.round(stage.travelled(b) * 10) / 10,
                targetAlive: b.alive(),
                targetHealth: Math.round(b.health() * 10) / 10,
                firesDoused: stage.changedBlocks().filter(function (c) { return c.before === "minecraft:fire"; }).length,
                casterAt: a.position().map(function (n) { return Math.round(n * 10) / 10; }),
                targetAt: b.position().map(function (n) { return Math.round(n * 10) / 10; }),
                bUsedTackle: stage.casts("tackle", b)
            });
            stage.note("self-burn 与 target-burn 的浇灭分支在本单装里点不出火：world_combat:burn 由 content/rules/combat-status 注册，不是 packs.json 共享包；涌泉罩火这一条不需要灼伤即可验证");
            stage.done();
        });
    }, "dive lands and leaves its spring within 45 s");
});
