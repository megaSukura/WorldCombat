/**
 * 上菜 / orderup —— 可执行设计说明。
 *
 * 一句话：小伙伴给出指令，使用者端出一记短程平抛的龙形菜势；首个碰到的身体结算一次非接触伤害。
 * 身边带着小个子伙伴时，还会按它的样子给自己补上一项能力。
 *
 * 场面：一只只会这个动作的怪力（36 级，身旁跟着一只小个子同伴）对一只只会撞击的卡比兽（45 级）开战。
 * 厚血对手让它活到第二记；AI 只有这一招，必然会被放出来。
 * 同行的「菜」用一只原版小生物（悦灵）站在队里——它比施法者明显小又耐打、不还手，能稳定触发按伙伴补能力的
 * 判定；同伴若是另一只宝可梦，本隔离装配里两只同队宝可梦的共享 AI 会互相影响，反而不出手。
 * 必然事实：本招被提交过、目标受到过伤害（龙形菜势拍到）。
 * 增益走的是原生能力等级（不落 MC 属性），因此「补了哪一项」无法在无头场景里断言，写进 note，
 * 在完整装配的集成试玩里核对。
 */
Smoke.scenario("orderup", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    const caster = stage.pokemon({ species: "machamp", level: 36, moves: ["orderup"], at: [-2, 0, 0] });
    const dish = stage.mob({ type: "minecraft:allay", at: [-1, 0, 0] });
    const foe = stage.pokemon({ species: "snorlax", level: 45, moves: ["tackle"], at: [3, 0, 0] });
    stage.team("table", [caster, dish]);
    stage.hostile(caster, foe);
    stage.until(1400, function () {
        return stage.casts("orderup", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(20, function () {
            stage.expect(stage.casts("orderup", caster) >= 1, "caster committed order up");
            stage.expect(stage.damageTo(foe) > 0, "order up dealt damage to the foe");
            stage.note("order up observations; the dish-based stat boost goes through native stages and needs the full assembly", {
                casts: stage.casts("orderup", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                dishAlive: dish.alive(),
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "order up lands");
});
