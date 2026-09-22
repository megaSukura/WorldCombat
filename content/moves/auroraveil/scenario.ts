// 极光幕的可执行设计说明：这是一片只在下雪冷天铺得起、只护友方的物特双幕，所以场面要给出冰雹条件与威胁。
// 必然事实：极光幕被放出来过；施法者身上出现过共享身份 world_combat:status/auroraveil。
// 物特被削减需要真实命中，属随机结果；天不对时整次不成立（ready 门槛）写进 note，供完整装配试玩核对。
Smoke.scenario("auroraveil", function (stage) {
    stage.weather("thunder");
    stage.fill([-6, -1, -6], [6, -1, 6], "minecraft:snow_block");
    var caster = stage.pokemon({ species: "lapras", level: 40, moves: ["auroraveil"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "magikarp", level: 22, moves: ["tackle"], at: [4, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("auroraveil", caster) > 0 && stage.hadMobEffect(caster, "world_combat:status/auroraveil");
    }, function () {
        stage.expect(stage.casts("auroraveil", caster) > 0, "auroraveil was cast under the snowstorm");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/auroraveil"), "caster carried the shared auroraveil identity");
        stage.note("极光幕只在雷雨 + 脚下有雪/冰的冷天成立（ready 在提交前检查，天不对整次不成立、不花 PP）；幕只护友方，物特两路在结算前分别按 cutPhys/cutSpec 削减。时长、半径、带数随特防/身高/等级变化，长幕与明幕各有取舍。本场景在雪地上给出雷暴，验证门槛成立这一侧；门槛不成立的一侧留给完整装配试玩。", {
            casts: stage.casts("auroraveil", caster), casterHp: caster.health()
        });
        stage.done();
    }, "auroraveil covers the caster");
});
