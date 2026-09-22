/**
 * 乱抓 / furyswipes —— 可执行设计说明。
 *
 * 一句话：一只只会乱抓的喵喵贴着卡比兽绕圈，一道道抓下去，至少有一道落在对手身上；它会因为换位而真的挪动位置。
 *
 * 场面：只会乱抓的喵喵（meowth，L30，原生 29 级学习）对一只只会跃起、慢吞吞的卡比兽（snorlax，L30），
 *   贴身相隔 2 格——在射程内，AI 可以直接起手；地面铺平、白天晴天。
 *
 * 必然事实：本招被提交过（`stage.casts`）；目标受到过至少一道的伤害（`stage.damageTo`）；施法者挪动过位置
 *   （`stage.travelled`——每一道都会侧移换位）。
 *   爪数（2～5，随速度／物攻／等级变化）、每道命中率 80、抓空即断、暴击与游走还是扑抓式，都是随机或配置结果，
 *   写进 note 供读轨迹判断。
 */
Smoke.scenario("furyswipes", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "meowth", level: 30, moves: ["furyswipes"], at: [-1, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 30, moves: ["splash"], at: [1, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("furyswipes", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(80, function () {
            stage.expect(stage.casts("furyswipes", caster) >= 1, "the caster committed furyswipes");
            stage.expect(stage.damageTo(foe) > 0, "furyswipes raked the foe");
            stage.expect(stage.travelled(caster) > 0.3, "the caster moved while working around the foe");
            stage.note("cuts (2-5) follow speed/attack/level; each rake rolls 80% and a whiff ends the pass; roam vs pounce changes the arc and the sidestep", {
                casts: stage.casts("furyswipes", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                casterTravelled: Math.round(stage.travelled(caster) * 10) / 10,
                foeAlive: foe.alive(),
                casterAlive: caster.alive()
            });
            stage.done();
        });
    }, "furyswipes rakes a foe within 60 s");
});
