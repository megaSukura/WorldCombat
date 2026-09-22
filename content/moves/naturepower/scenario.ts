/**
 * 自然之力 / Nature Power —— 可执行设计说明。
 *
 * 一句话：把脚下的地面叫起来，化作一道贴地的地脉冲向目标；施法者站在草地上时读作草木之力。AI 在目标可见、
 *   敌对、存活且进入 `ai.maxChase`（默认 12）格内时出手，射程由 `reach`（默认约 10 格）封顶。
 *
 * 场面：晴天白天、开阔平地。只会自然之力的橡实果（seedot，会学这招；技能表只给这一招）站在一块草皮上
 *   （`stage.block([-3,-1,0], "minecraft:grass_block")` 把脚下铺成草地），对面 6 格外站一只只会撞击的小拉达。
 *   `stage.hostile` 让双方开战，施法者会走近到射程内再放出地脉。
 *
 * 必然事实：施法者提交过自然之力；地脉扫过走廊并把目标算进命中，因此目标必定受到伤害。命中属性（草→草）、
 *   追加是否抽中麻痹、以及命中/暴击都是随机结果，写进 note。
 */
Smoke.scenario("naturepower", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "seedot", level: 30, moves: ["naturepower"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 20, moves: ["tackle"], at: [3, 0, 0] });
    stage.block([-3, -1, 0], "minecraft:grass_block");
    stage.hostile(caster, foe);

    stage.until(700, function () {
        return stage.casts("naturepower", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.expect(stage.casts("naturepower", caster) >= 1, "the seedot called nature's power from the grass under it");
        stage.expect(stage.damageTo(foe) > 0, "the ground surge reached the target");
        stage.note("脚下场地键由方块/流体读出：草地→草木（草属性，概率麻痹）、水→水流（水属性，强力冲推）、火→地火（火属性，概率灼伤并点燃）、其余实体地面→大地（岩属性，额外降物防一级并顶开）、无实体方块→普通。本场景铺了草皮且施法者是草属性，因此命中属性为草；是否抽中麻痹、命中率与暴击都属随机。", {
            casts: stage.casts("naturepower", caster),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            paralysed: stage.hadMobEffect(foe, "world_combat:status/paralysis"),
            casterTravelled: Math.round(stage.travelled(caster) * 10) / 10,
            tick: stage.tick()
        });
        stage.done();
    }, "nature power is cast and hits the target");
});
