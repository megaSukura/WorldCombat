/**
 * 磨砺 / laserfocus 的可执行设计说明。
 *
 * 场面：一只物攻型的飞天螳螂带着「磨砺 + 撞击」对一只弱小的小拉达开战，隔开一小段距离。技能表里的两招
 * 都由本仓库实现，AI 会在贴身之前先磨好这一下，再出手把锐意用掉。
 * 必然事实：磨砺被提交过；施术者身上出现过共享身份 world_combat:status/laserfocus 的锐意窗口。
 * 要害是否真的被抬成必暴、锐意何时被用掉，是这一击的时机与共享结算结果，写进 note 供读轨迹判断
 * （私有装配没有读取原生暴击结果的读取原语，因此不断言暴击本身）。
 */
Smoke.scenario("laserfocus", function (stage) {
    stage.fill([-10, -1, -10], [10, -1, 10], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "scyther", level: 34, moves: ["laserfocus", "tackle"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 16, moves: ["tackle"], at: [4, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("laserfocus", caster) > 0 && stage.hadMobEffect(caster, "world_combat:status/laserfocus");
    }, function () {
        stage.expect(stage.casts("laserfocus", caster) > 0, "the hone was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/laserfocus"), "the edge window carried the shared laserfocus identity");
        stage.after(200, function () {
            stage.note("磨砺把身上挂出锐意窗口（身份 laserfocus），下一次伤害结算由 PokemonDamage.metadata 抬成必定要害、并在命中后用掉。是否已经出手兑现、打出了多少伤害、锐意是否散去由时机与共享结算决定，留给完整装配的人工试玩。窗口时长随亲密度与等级阶梯、光点随物攻、长度随身高、冷却随特攻分别变化。", {
                casterCasts: stage.casts("laserfocus", caster),
                tackleCasts: stage.casts("tackle", caster),
                damageByCaster: Math.round(stage.damageBy(caster) * 10) / 10,
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                foeAlive: foe.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "laser focus is cast");
});
