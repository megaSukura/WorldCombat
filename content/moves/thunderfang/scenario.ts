/**
 * 雷电牙 / thunderfang 的可执行设计说明。
 *
 * 场面：只会雷电牙的雷电兽（manectric，L40，原生学习者）对 5 格外的卡比兽（snorlax，L50，只会跃起）；
 * 平地、白天晴天。开战后 AI 只有这一招可用，必须自己走近再咬。
 * 必然事实：本招被提交过；目标受到过咬合伤害。
 * 是否麻住（numbChance）、麻多久、电锁是否触发（需咬中时目标已麻痹）、是否咬懵、扑空还是咬中、暴击，
 * 都是概率与站位结果，写进 note 供读轨迹判断。
 */
Smoke.scenario("thunderfang", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "manectric", level: 40, moves: ["thunderfang"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 50, moves: ["splash"], at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1400, function () {
        return stage.casts("thunderfang", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("thunderfang", caster) > 0, "thunderfang was committed");
            stage.expect(stage.damageTo(foe) > 0, "the thunder fang dealt damage");
            stage.note("numbChance and flinchChance are separate rolls; the electric lock only applies when the target was already paralyzed before this bite", {
                casts: stage.casts("thunderfang", caster),
                onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                moved: Math.round(stage.travelled(caster) * 10) / 10,
                paralyzed: stage.hadMobEffect(foe, "world_combat:status/paralysis"),
                rooted: stage.hasMobEffect(foe, "world_combat:rooted"),
                flinched: stage.hadMobEffect(foe, "world_combat:status/flinch"),
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "thunder fang lands on a foe within range");
});
