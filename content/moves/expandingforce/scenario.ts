/**
 * 广域战力的可执行设计说明：让会这一招的精灵对一名目标出手，验证它会落下精神冲击并造成伤害。
 * 落点会铺开精神场地（`world_combat:field/psychicterrain`）；站进场地后的引爆分支需要施法者走进
 * 自己或同伴留下的场地，属位置依赖，写进 note。
 */
Smoke.scenario("expandingforce", function (stage) {
    var drowzee = stage.pokemon({ species: "drowzee", level: 30, moves: ["expandingforce"], at: [-6, 0, 0] });
    var snorlax = stage.pokemon({ species: "snorlax", level: 30, moves: ["tackle"], at: [6, 0, 0] });
    stage.hostile(drowzee, snorlax);
    stage.until(700, function () { return stage.casts("expandingforce", drowzee) > 0 && stage.damageTo(snorlax) > 0; }, function () {
        stage.expect(stage.casts("expandingforce", drowzee) > 0, "广域战力被放出来了");
        stage.expect(stage.damageTo(snorlax) > 0, "精神冲击打到了目标身上");
        stage.note("落点会铺下精神场地；如果施法者随后走进场地，再放时会改为引爆（覆盖所有贴身敌人、威力 ×1.5）。命中率与暴击不写断言。",
            { casts: stage.casts("expandingforce", drowzee), damage: stage.damageTo(snorlax), travelled: stage.travelled(drowzee) });
        stage.done();
    }, "广域战力命中并造成伤害");
});
