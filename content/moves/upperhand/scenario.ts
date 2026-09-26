/**
 * 快手还击 / upperhand —— 可执行设计说明。
 *
 * 一句话：读到对手正在出先制招就主动踏进按停；普通原生敌人贴身抢攻时正面架掌迎住第一下、削伤反打。
 *
 * 场面一（主动掌击）：一只只会「快手还击」的怪力（50 级）对另一只只会「快手还击」的怪力（30 级）开战。
 *   快手还击原生优先度 +3；任何一方先提交它，就进了对方先制记录——另一方随即读到记录、主动踏进把它按停。
 *   必然事实：快手还击被提交过、对手受到过伤害、对手出现过共享身份 world_combat:status/flinch。
 * 场面二（正面迎掌）：一只只会「快手还击」的怪力（40 级）对一只被加厚到 200 生命的僵尸（会一直贴身近战）。
 *   僵尸没有公开的先制意图，怪力改为架起正面迎掌短窗；僵尸第一下近身接触被削伤并立刻吃一记掌根。
 *   必然事实：快手还击被提交过、僵尸受到过掌伤、僵尸出现过 shared 身份 world_combat:status/flinch，且怪力仍吃到过伤害（不是无敌）。
 * 具体哪一次读准、是否正好命中执行的招式、每次减伤多少，属时序结果，写进 note。
 */
Smoke.scenario("upperhand", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    const caster = stage.pokemon({ species: "machoke", level: 50, moves: ["upperhand"], at: [-1.5, 0, 0], properties: "nature=jolly" });
    const foe = stage.pokemon({ species: "machoke", level: 30, moves: ["upperhand"], at: [1.5, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1600, function () {
        return stage.casts("upperhand", caster) >= 1 && stage.damageTo(foe) > 0
            && stage.hadMobEffect(foe, "world_combat:status/flinch");
    }, function () {
        stage.expect(stage.casts("upperhand", caster) >= 1, "machoke committed upper hand");
        stage.expect(stage.damageTo(foe) > 0, "the active palm strike damaged the foe");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/flinch"), "the foe was left flinching");
        stage.note("the read is the foe's committed priority move (upper hand's native priority +3, non-status) recorded by world_combat:committed; once one side commits it, the other steps in with the palm. Which side commits first is timing.", {
            casts: stage.casts("upperhand", caster),
            foeDamage: Math.round(stage.damageTo(foe) * 10) / 10,
            flinched: stage.hadMobEffect(foe, "world_combat:status/flinch"),
            foeAlive: foe.alive(),
            tick: stage.tick()
        });
        stage.done();
    }, "upper hand catches the priority move");
});

Smoke.scenario("upperhand-parry", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    const caster = stage.pokemon({ species: "machoke", level: 40, moves: ["upperhand"], at: [-2, 0, 0], properties: "nature=adamant" });
    const foe = stage.mob({ type: "minecraft:zombie", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("attribute @e[type=minecraft:zombie,distance=..12,limit=1] minecraft:generic.max_health base set 200");
    stage.command("data merge entity @e[type=minecraft:zombie,distance=..12,limit=1] {Health:200f}");
    stage.until(1600, function () {
        return stage.casts("upperhand", caster) >= 1 && stage.damageTo(foe) > 0
            && stage.hadMobEffect(foe, "world_combat:status/flinch");
    }, function () {
        stage.expect(stage.casts("upperhand", caster) >= 1, "machoke committed upper hand");
        stage.expect(stage.damageTo(foe) > 0, "the counter palm damaged the zombie");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/flinch"), "the zombie was left flinching");
        stage.expect(stage.damageTo(caster) > 0, "the caster still took the reduced hit (no absolute immunity)");
        stage.note("the zombie has no public priority intent, so the manual stance opened a frontal parry window; its first native contact was intercepted through world_combat:incoming, cut by parryCut and answered with the palm. Whether a given window overlapped an attack is timing; the trace shows which casts landed.", {
            casts: stage.casts("upperhand", caster),
            foeDamage: Math.round(stage.damageTo(foe) * 10) / 10,
            casterDamage: Math.round(stage.damageTo(caster) * 10) / 10,
            flinched: stage.hadMobEffect(foe, "world_combat:status/flinch"),
            foeAlive: foe.alive(),
            tick: stage.tick()
        });
        stage.done();
    }, "upper hand parries the zombie's first contact");
});
