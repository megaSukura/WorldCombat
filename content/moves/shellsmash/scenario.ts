/**
 * 破壳 / shellsmash 的可执行设计说明。
 *
 * 场面：一只只会「破壳」的刺甲贝与一只弱小的小拉达拉开 12 格开战，脚下是石头地。壳一破，防御永久下降，
 * 所以 AI 只在对手隔着安全距离、自己满血时先破壳。
 * 必然事实：本招被提交过；身周的石头地被壳片替换过（world.terrain 的 linger 租约，到期原方块回来）。
 * 真实能力等级、壳片数量与留存量写进 note 供读轨迹判断（私有装配没有读取原生能力等级的读取原语）。
 */
Smoke.scenario("shellsmash", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "cloyster", level: 45, moves: ["shellsmash"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 12, moves: ["tackle"], at: [9, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("shellsmash", caster) > 0 && stage.changedBlocks().length > 0;
    }, function () {
        stage.expect(stage.casts("shellsmash", caster) > 0, "the shell smash was committed");
        stage.expect(stage.changedBlocks().length > 0, "shell plates were left in the ground around the caster");
        var changed = stage.changedBlocks();
        stage.note("the real Attack/Defence stages and how long the plates linger are design facts read here; the private assembly has no reader for native stat stages", {
            casts: stage.casts("shellsmash", caster),
            changed: changed.length,
            sample: changed.slice(0, 4),
            foeCasts: stage.casts("tackle", foe),
            casterAlive: caster.alive(), casterHp: caster.health()
        });
        stage.done();
    }, "shell smash is cast and leaves plates within 60 s");
});
