/**
 * 隐形岩 / stealthrock —— 可执行设计说明。
 *
 * 一句话：把一圈碎石抬到敌人所在地点悬浮成 6 枚悬石；有人闯进这片空域，最近的一枚离轨飞出，真的砸中才伤。
 *
 * 场面：会隐形岩的化石翼龙带这一招；前方是一只贴地、被冻住的铁傀儡。石阵落在它附近，它进入时一枚悬石离轨
 *   并真实飞向它；随后用 `stage.field` 在一只悬浮的恶魂身旁放一片同样的石阵，验证浮岩对空。恶魂体积大，
 *   飞行中的岩块不会从它身上穿过去。
 *
 * 断言只取必然事实：这招被放过、贴地目标被飞出的岩块砸到、悬浮目标也能被浮岩砸到、站定不再被砸。
 *   相性倍率、暴击、轨位与岩块是否被躲开写进 note。
 */
Smoke.scenario("stealthrock", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "aerodactyl", level: 40, moves: ["stealthrock"], at: [-5, 0, 0] });
    var heavy = stage.mob({ type: "minecraft:iron_golem", at: [1, 0, 0] });
    stage.hostile(caster, heavy);
    stage.noai(heavy);
    stage.setPp(caster, "stealthrock", 1);
    stage.until(900, function () {
        return stage.casts("stealthrock", caster) >= 1 && stage.damageTo(heavy) > 0;
    }, function () {
        stage.after(20, function () {
            var entry = stage.damageTo(heavy);
            stage.expect(stage.casts("stealthrock", caster) >= 1, "aerodactyl committed stealth rock");
            stage.expect(entry > 0, "the grounded golem entering the stone field was struck by a launched rock");
            // 浮岩对空：直接布一片同样的石阵到一只悬浮的恶魂身上，验证浮岩会朝空中发射。
            // 石阵放大、恶魂抬高，让每个轨位都在它的碰撞箱之外，岩块从下方向它飞入（避免在体内生成）。
            var flyer = stage.mob({ type: "minecraft:ghast", at: [6, 2.5, 0] });
            stage.command("data merge entity @e[type=minecraft:ghast,distance=..24,limit=1] {NoAI:1b,NoGravity:1b,Silent:1b}");
            stage.hostile(caster, flyer);
            stage.field("world_combat:hazard/stealthrock", [6, 0, 0], 220, 5,
                { fall: 40, interval: 20, alert: 40, launchSpeed: 0.9, heavy: 0,
                    slots: [1, 1, 1, 1, 1, 1], refill: [0, 0, 0, 0, 0, 0], next: {}, armed: {} }, caster);
            stage.after(70, function () {
                var still = stage.damageTo(heavy);
                stage.expect(stage.damageTo(flyer) > 0, "the floating ghast triggered a hovering rock and was struck");
                stage.expect(still <= entry + 0.01, "standing still in the stone field takes no further rock");
                stage.note("only the entrance shot lands on a stationary target; a real projectile must touch it, so misses, wall hits, rock matchup and crits are positional/random. The field holds six slots and refills one after stoneInterval.", {
                    casts: stage.casts("stealthrock", caster),
                    golemEntry: Math.round(entry * 10) / 10,
                    golemStill: Math.round(still * 10) / 10,
                    ghastDamage: Math.round(stage.damageTo(flyer) * 10) / 10,
                    golemAlive: heavy.alive(),
                    ghastAlive: flyer.alive()
                });
                stage.done();
            });
        });
    }, "stealth rock launches a real rock at the first intruder");
});
