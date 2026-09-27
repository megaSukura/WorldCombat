/**
 * 章鱼桶炮的可执行设计说明。
 *
 * 场面：一只只会章鱼桶炮的施法者，对六格外一只冻住的厚血对手。数股墨弹会先后喷出、各自结算。
 * 必然事实：本招被提交过；同一目标收到至少两次独立的墨弹伤害（分股身份生效，后股不再被去重）。
 * 股数、致盲概率、命中下降级数与移动目标的命中都带随机/位置因素；等到命中后再多等一段让墨流喷完。
 */
Smoke.scenario("octazooka", function (stage) {
    const caster = stage.pokemon({ species: "Octillery", level: 40, moves: ["octazooka"], at: [-4, 0, 0] });
    const foe = stage.pokemon({ species: "Machop", level: 45, moves: ["tackle"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.noai(foe);
    stage.until(700, function () { return stage.casts("octazooka", caster) >= 1 && stage.hits(foe, true) >= 2; }, function () {
        stage.after(40, function () {
            stage.expect(stage.casts("octazooka", caster) >= 1, "octazooka was committed");
            stage.expect(stage.hits(foe, true) >= 2, "at least two ink bolts each settled their own damage");
            stage.note("一次施放按节奏喷出多股墨弹，每股有独立伤害段身份、各自结算；只有真正打伤的那一下才判致盲，整次施放最多成功一次（octazooka.chance），级数由特攻决定；aim 空喷允许，首碰方块只留短墨滴", {
                casts: stage.casts("octazooka", caster), hits: stage.hits(foe, true), onFoe: Math.round(stage.damageTo(foe) * 10) / 10
            });
            stage.done();
        });
    }, "octazooka lands two bolts");
});
