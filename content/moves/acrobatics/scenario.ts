/**
 * 空手的摔角鹰人撞向静止铁傀儡，命中后从开阔的身侧绕到另一面。
 * 伤害数值受命中率、暴击与相性影响；位移只检查命中后的侧向分量与越过目标。
 */
Smoke.scenario("acrobatics", function (stage) {
    stage.time("night");
    var caster = stage.pokemon({ species: "Hawlucha", level: 30, moves: ["acrobatics"], at: [-3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [3, 0, 0] });
    stage.noai(foe);
    stage.hostile(caster, foe);
    stage.until(900, function () { return stage.casts("acrobatics", caster) > 0 && stage.damageTo(foe) > 0; }, function () {
        stage.expect(stage.casts("acrobatics", caster) > 0, "杂技被放出来了");
        stage.expect(stage.damageTo(foe) > 0, "翻滚撞到了目标身上");
        stage.setPp(caster, "acrobatics", 0);
        var contact = caster.position(), target = foe.position();
        var dx = target[0] - contact[0], dz = target[2] - contact[2], length = Math.sqrt(dx * dx + dz * dz);
        var forwardX = length > 0.01 ? dx / length : 1, forwardZ = length > 0.01 ? dz / length : 0;
        var maximumSide = 0;
        stage.until(60, function () {
            var at = caster.position(), opponent = foe.position();
            maximumSide = Math.max(maximumSide, Math.abs((at[0] - contact[0]) * -forwardZ + (at[2] - contact[2]) * forwardX));
            return maximumSide > 0.3 && (at[0] - opponent[0]) * forwardX + (at[2] - opponent[2]) * forwardZ > 0.3;
        }, function () {
            stage.expect(maximumSide > 0.3, "命中后的翻滚有明确侧向位移");
            stage.note("开阔场地内命中后已从身侧绕过目标；空手伤害、碰撞体贴合与动作观感交由试玩检查。",
                { casts: stage.casts("acrobatics", caster), damage: stage.damageTo(foe), contact: contact,
                    finish: caster.position(), target: foe.position(), lateral: maximumSide });
            stage.done();
        }, "杂技命中后绕到目标另一面");
    }, "杂技命中并造成伤害");
});
