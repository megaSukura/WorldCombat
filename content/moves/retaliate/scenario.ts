/**
 * 报仇 / retaliate —— 可执行设计说明。
 *
 * 一句话：带着「同伴倒下」的哀兵之痛，朝敌人直直撞过去；这一记比平时加重。
 * 场面：Lucario（Lv36，只带报仇）与同队的 Magikarp（Lv2，只带跃起），面对一只不会还手的高血 Blissey。
 *   开场直接击杀同队、20 格内的 Magikarp——真的走一遍 world_combat:actor_died：活着的观察者 Lucario
 *   在快照 friendly=true 时自动获得共享身份 world_combat:status/retaliate，并记下凶手 Blissey。
 * 断言：本招被撞出过、Blissey 吃到过伤害、Lucario 身上出现过共享身份 retaliate（自动链真的发生）。
 * 是否翻倍、命中后哀兵是否泄掉、暴击与移动距离写进 note 供读轨迹判断。
 */
Smoke.scenario("retaliate", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var mourner = stage.pokemon({ species: "lucario", level: 36, moves: ["retaliate"], at: [-2, 0, 0] });
    var ally = stage.pokemon({ species: "magikarp", level: 2, moves: ["splash"], at: [-2, 0, 2] });
    var foe = stage.pokemon({ species: "blissey", level: 50, moves: ["splash"], at: [3, 0, 0] });
    stage.team("mourners", [mourner, ally]);
    stage.noai(foe);
    stage.hostile(mourner, foe);
    // 真正的同伴死亡链：同队的 Magikarp 被 Blissey 击杀，同队、20 格内的 Lucario 由 actor_died 自动获得哀兵。
    stage.after(1, function () { stage.hurt(ally, 100000, "minecraft:generic", { source: foe }); });
    stage.until(1600, function () {
        return stage.casts("retaliate", mourner) > 0 && stage.damageTo(foe) > 0 && stage.hadMobEffect(mourner, "world_combat:status/retaliate");
    }, function () {
        stage.expect(stage.casts("retaliate", mourner) > 0, "the mourner struck back");
        stage.expect(stage.damageTo(foe) > 0, "the retribution damaged the foe");
        stage.expect(stage.hadMobEffect(mourner, "world_combat:status/retaliate"), "the auto death chain left the grief identity on the nearby ally");
        stage.note("哀兵由 world_combat:actor_died 自动挂上：magikarp 被 blissey 击杀，同队且 20 格内的 lucario 获得共享身份 retaliate 并记下凶手。翻倍与命中后解除由共享身份决定，AI 也按这个身份排序。", {
            casts: stage.casts("retaliate", mourner),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            moved: Math.round(stage.travelled(mourner) * 10) / 10,
            mourning: stage.hadMobEffect(mourner, "world_combat:status/retaliate"),
            foeAlive: foe.alive()
        });
        stage.done();
    }, "retaliate auto-grief chain");
});
