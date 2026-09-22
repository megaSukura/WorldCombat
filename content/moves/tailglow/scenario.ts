/**
 * 萤火 / tailglow 的可执行设计说明。
 *
 * 场面：一只只会「萤火」的电萤虫与一只弱小的小拉达拉开 15 格开战。它的技能表里只有这一招，所以 AI 只能凝神；
 * 威胁在安全距离外时它会先入定。
 * 必然事实：本招被提交过；施术者身上出现过共享身份 world_combat:status/tailglow 的凝神窗口。
 * 凝神拍数、是否被打散、真实特攻等级与收回多少，都写进 note 供读轨迹判断（私有装配没有读取原生能力等级的读取原语）。
 */
Smoke.scenario("tailglow", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "volbeat", level: 40, moves: ["tailglow"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 12, moves: ["tackle"], at: [12, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("tailglow", caster) > 0 && stage.hadMobEffect(caster, "world_combat:status/tailglow");
    }, function () {
        stage.expect(stage.casts("tailglow", caster) > 0, "the tail glow was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/tailglow"), "the trance window carried the shared identity");
        stage.after(80, function () {
            stage.note("beats, whether the glow was broken early, the real Sp. Atk stages and how much the window takes back are design facts read here; the private assembly has no reader for native stat stages", {
                casts: stage.casts("tailglow", caster),
                travelled: Math.round(stage.travelled(caster) * 10) / 10,
                foeCasts: stage.casts("tackle", foe),
                casterAlive: caster.alive(), casterHp: caster.health()
            });
            stage.done();
        });
    }, "tail glow is cast within 60 s");
});
