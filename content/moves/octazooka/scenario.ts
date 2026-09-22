/**
 * 章鱼桶炮的可执行设计说明。
 *
 * 场面：一只只会章鱼桶炮的施法者，对八格外的对手。数股墨弹会先后喷出。
 * 必然事实：本招被提交过；对手受到过章鱼桶炮伤害。
 * 股数、每股致盲概率、命中下降级数与移动目标的命中都带随机/位置因素；等到命中后再多等一段让墨流喷完。
 */
Smoke.scenario("octazooka", function (stage) {
    const caster = stage.pokemon({ species: "Octillery", level: 34, moves: ["octazooka"], at: [-4, 0, 0] });
    const foe = stage.pokemon({ species: "Machop", level: 22, moves: ["tackle"], at: [4, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(700, function () { return stage.casts("octazooka", caster) >= 1 && stage.damageTo(foe) > 0; }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("octazooka", caster) >= 1, "octazooka was committed");
            stage.expect(stage.damageTo(foe) > 0, "the target took octazooka damage");
            stage.note("一次施放喷出多股墨弹，每股各自结算伤害；致盲整次施放只掷一次（octazooka.chance），级数由特攻决定", {
                casts: stage.casts("octazooka", caster), onFoe: Math.round(stage.damageTo(foe) * 10) / 10
            });
            stage.done();
        });
    }, "octazooka cast and hit");
});
