/**
 * 传递礼物的可执行设计说明：一只只会传递礼物、携带橙果的精灵，和一个空手的伙伴同队。
 * 必然事实：本招被提交过——这是开战前的一手安排，只要自己持物、队友空手且够得到就会递出去（有自己的出手计划）。
 * 道具真的换手（自己空手、队友得到）是确定行为，但舞台接口不暴露持有物，写进 note 供完整装配试玩核对；
 * 递送的命中的具体时机随走位变化，不写断言。
 */
Smoke.scenario("bestow", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 8], "minecraft:stone");
    var caster = stage.pokemon({ species: "Clefairy", level: 30, moves: ["bestow"], item: "cobblemon:oran_berry", at: [-2, 0, 0] });
    var ally = stage.pokemon({ species: "Pikachu", level: 24, moves: ["tackle"], at: [1, 0, 0] });
    stage.team("gift", [caster, ally]);
    stage.until(900, function () {
        return stage.casts("bestow", caster) > 0;
    }, function () {
        stage.expect(stage.casts("bestow", caster) > 0, "传递礼物被放出来了");
        stage.note("施法者携带橙果、队友空手，命中时橙果应从施法者手里换到队友身上（自己空手、队友得到），走原生持有物交换；持有物不被舞台接口读取，不写断言。递送距离随体型/等级、缎带随特攻、光尘随亲密度变化。",
            { casts: stage.casts("bestow", caster), casterHp: Math.round(caster.health() * 10) / 10,
                allyHp: Math.round(ally.health() * 10) / 10 });
        stage.done();
    }, "传递礼物被送出");
});
