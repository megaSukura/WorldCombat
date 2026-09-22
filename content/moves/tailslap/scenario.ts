/**
 * 扫尾拍打 / tailslap —— 可执行设计说明。
 *
 * 一句话：一只只会扫尾拍打的奇诺栗鼠原地旋身，尾巴一圈圈扫过四周，把身边的卡比兽拍中并推得向外挪位。
 *
 * 场面：只会扫尾拍打的奇诺栗鼠（cinccino，L30，原生 1 级学习）对一只只会跃起、慢吞吞的卡比兽（snorlax，L30），
 *   贴身相隔 2 格——在扫过半径内，AI 可以直接起旋；地面铺平、白天晴天。
 *
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过至少一圈的伤害（`stage.damageTo`）；目标被向外推得挪动过
 *   （`stage.travelled`——每一圈命中都会把圈内的人沿背离方向推开）。
 *   圈数（2～5，随体重／速度／等级变化）、每圈命中率 85、某一圈是否没拍实、旋扫还是砸尾式，都是随机或配置结果，
 *   写进 note 供读轨迹判断。
 */
Smoke.scenario("tailslap", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "cinccino", level: 30, moves: ["tailslap"], at: [-1, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 30, moves: ["splash"], at: [1, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("tailslap", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(80, function () {
            stage.expect(stage.casts("tailslap", caster) >= 1, "the caster committed tailslap");
            stage.expect(stage.damageTo(foe) > 0, "a spin landed on the foe");
            stage.expect(stage.travelled(foe) > 0.2, "the outward shove moved the foe");
            stage.note("laps (2-5) follow weight/speed/level; each lap rolls 85% and a missed lap does not stop the spin; spin hits the full circle, smash narrows to the front arc", {
                casts: stage.casts("tailslap", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeTravelled: Math.round(stage.travelled(foe) * 10) / 10,
                foeAlive: foe.alive(),
                casterAlive: caster.alive()
            });
            stage.done();
        });
    }, "tailslap spins into a foe within 60 s");
});
