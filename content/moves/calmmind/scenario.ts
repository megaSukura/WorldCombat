/**
 * 冥想 的可执行设计说明。
 *
 * 场面：一只只会「冥想」的凯西（24 级）与一只被点住、不会移动的小拉达隔开 9 格、石质场地上开战；技能表里只有这一招，
 *   所以 AI 只能先静一息。有威胁且在静心距离内、还没贴身时，它会先收心再考虑交战。
 * 必然事实：浅冥想提交后特攻与特防各 +1，窗口走完（用 PP 归零阻止重施）后两项按来源一起收回；
 *   随后把偏好切成深冥想再施放一次，两项各 +2。中英文说明与表现都按这两档实际过程写。
 *   深/浅各自的真实时长、伤害轨迹写进 note 供读轨迹判断。
 */
Smoke.scenario("calmmind", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "abra", level: 24, moves: ["calmmind"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 12, moves: ["tackle"], at: [6, 0, 0] });
    stage.hostile(caster, foe);
    stage.noai(foe);
    stage.until(1200, function () {
        return stage.casts("calmmind", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/calmmind");
    }, function () {
        stage.expect(stage.casts("calmmind", caster) > 0, "calm mind was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/calmmind"), "the clarity window carried the shared identity");
        var shallow = stage.stages(caster);
        stage.expect(shallow.spa >= 1 && shallow.spd >= 1, "the shallow clarity raised Sp. Atk and Sp. Def by one");
        // 阻止重施，让这条浅冥想自己走完，确认两项等级随它一起收回。
        stage.setPp(caster, "calmmind", 0);
        stage.until(700, function () {
            return !stage.hasMobEffect(caster, "world_combat:status/calmmind");
        }, function () {
            var gone = stage.stages(caster);
            stage.expect((gone.spa || 0) === 0 && (gone.spd || 0) === 0, "the clarity reclaimed both stages when it ended");
            // 切到深冥想再施放一次：同一招在深档应给 2/2。
            stage.prefer(caster, "calmmind", { deep: true });
            stage.setPp(caster, "calmmind", 20);
            stage.until(1200, function () {
                return stage.casts("calmmind", caster) >= 2
                    && stage.hasMobEffect(caster, "world_combat:status/calmmind");
            }, function () {
                var deep = stage.stages(caster);
                stage.expect(deep.spa >= 2 && deep.spd >= 2, "the deep trance raised both by two");
                stage.note("The shallow choice grants +1/+1 Sp. Atk/Sp. Def, the deep choice +2/+2 with a longer window. Both contributions belong to the clarity window and are reclaimed together when it ends or is dispelled; the persistent close-body marker is owned by that same window.", {
                    shallow: shallow,
                    afterShallow: gone,
                    deep: deep,
                    casts: stage.casts("calmmind", caster),
                    damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                    damageByCaster: Math.round(stage.damageBy(caster) * 10) / 10,
                    casterAlive: caster.alive()
                });
                stage.done();
            }, "the deep trance engages");
        }, "the shallow clarity ends");
    }, "calm mind engages");
});
