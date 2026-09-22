/**
 * 快手还击 / upperhand —— 可执行设计说明。
 *
 * 一句话：读到对手正在使出一记先制招，迎上一记掌根把它按停。
 *
 * 场面：一只只带「快手还击」的怪力（40 级，另配一记「撞击」用来先出手）对一只只会「突袭」（优先度 +1）的
 *   卡比兽（40 级）开战。怪力的撞击会让卡比兽的突袭读准、出手；卡比兽的突袭一提交，就进了快手还击的
 *   先制记录，怪力随即用快手还击把它按停并造成伤害。
 *   本单元自检只装配共享包与本单元，而「撞击」是另一单元；为了让上面的链路真的跑起来，这一批 smoke 额外
 *   传入 `content/moves/tackle` 作为先手招式的来源（会顺带跑一遍它自己的场景）。
 * 必然事实：快手还击被提交过、卡比兽受到过伤害、卡比兽被挂上共享身份 world_combat:status/flinch。
 *   具体哪一次读准、是否正好打断到执行的招式，写进 note。
 */
Smoke.scenario("upperhand", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    const caster = stage.pokemon({ species: "machoke", level: 40, moves: ["tackle", "upperhand"], at: [-2, 0, 0], properties: "nature=adamant" });
    const foe = stage.pokemon({ species: "snorlax", level: 40, moves: ["suckerpunch"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1600, function () {
        return stage.casts("upperhand", caster) >= 1 && stage.damageTo(foe) > 0
            && stage.hadMobEffect(foe, "world_combat:status/flinch");
    }, function () {
        stage.expect(stage.casts("upperhand", caster) >= 1, "machoke committed upper hand");
        stage.expect(stage.damageTo(foe) > 0, "the palm strike damaged the snorlax");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/flinch"), "the snorlax was left flinching");
        stage.note("the read is the target's committed priority move (native priority > 0, non-status) recorded by world_combat:committed; whether the interrupt landed while the sucker punch was still executing is timing. The scripted tackle exists only to provoke the foe's sucker punch.", {
            casts: stage.casts("upperhand", caster),
            foeDamage: Math.round(stage.damageTo(foe) * 10) / 10,
            flinched: stage.hadMobEffect(foe, "world_combat:status/flinch"),
            foeAlive: foe.alive(),
            tick: stage.tick()
        });
        stage.done();
    }, "upper hand catches the priority move");
});
