/**
 * 黑雾 / haze 的可执行设计说明。
 *
 * 场面：一只只会「黑雾」的瓦斯弹与一只僵尸隔开 12 格开战（夜里，僵尸不会自燃）。
 *   技能表里只有这一招，所以 AI 只能吐雾；威胁在考虑距离内，它会先走近到波及半径以内再放。
 * 必然事实：本招被提交过；施法者为了进入半径确实移动过。
 * 「被抹平」标记只挂在真正有等级被抹掉的个体上：这套私有装配里没有给对手加等级的招式单元，
 *   因此标记是否出现连同抹掉的级数一起写进 note，供读轨迹判断。
 */
Smoke.scenario("haze", function (stage) {
    stage.fill([-14, -1, -8], [14, -1, 8], "minecraft:stone");
    stage.time("night");
    var caster = stage.pokemon({ species: "koffing", level: 30, moves: ["haze"], at: [-6, 0, 0] });
    var foe = stage.mob({ type: "minecraft:zombie", at: [6, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("haze", caster) > 0;
    }, function () {
        stage.after(40, function () {
            stage.expect(stage.casts("haze", caster) > 0, "haze was committed");
            stage.expect(stage.travelled(caster) > 0.5, "the caster moved in to bring the foe inside the haze");
            stage.note("the haze was cast; whether anything was actually wiped depends on the foe carrying stat changes, "
                + "which this private assembly cannot stage without a buff move unit", {
                casts: stage.casts("haze", caster),
                travelled: Math.round(stage.travelled(caster) * 10) / 10,
                casterHp: Math.round(caster.health() * 10) / 10,
                foeHp: Math.round(foe.health() * 10) / 10,
                foeSwept: stage.hadMobEffect(foe, "world_combat:status/hazy"),
                casterSwept: stage.hadMobEffect(caster, "world_combat:status/hazy")
            });
            stage.done();
        });
    }, "haze is cast inside range");
});
