/**
 * 气旋攻击 / aeroblast —— 可执行设计说明。
 *
 * 一句话：一支旋转的涡流锥笔直射出，命中处炸开成向外的气环。
 *
 * 场面：一只只会气旋攻击的洛奇亚（Lugia，专属学习者，特攻 90／速度 110）对一只远处沉睡的波波（Pidgey）。
 *   断言只取必然事实：这招被提交过、目标受过伤害。是否触发原生高暴击、气环是否波及到旁人写进 note。
 */
Smoke.scenario("aeroblast", function (stage) {
    stage.fill([-16, -1, -8], [16, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "lugia", level: 60, moves: ["aeroblast"], at: [-10, 0, 0] });
    var foe = stage.pokemon({ species: "pidgey", level: 20, moves: ["tackle"], status: "sleep", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("aeroblast", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(50, function () {
            stage.expect(stage.casts("aeroblast", caster) >= 1, "the caster committed aeroblast");
            stage.expect(stage.damageTo(foe) > 0, "the vortex reached and damaged the distant foe");
            stage.note("whether the native high-crit roll fired is random; the burst ring only echoes when a bystander stands inside it", {
                casts: stage.casts("aeroblast", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10
            });
            stage.done();
        });
    }, "aeroblast reaches the distant foe within 60 s");
});
