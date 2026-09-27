/**
 * 虫咬的可执行设计说明：一只虫属性咬击手，对一只携带树果、足够硬的目标出手。
 * 必然事实：本招被提交过、目标受过伤（咬合命中）；目标这一咬咬不死时，果子应被咬走并在咀嚼后由施法者吸收
 * （枝荔果 -> 攻击 +1）。取果只发生一次、且在目标仍可访问装备时；咀嚼被打断则已咬下的果白咬。
 * 命中率与暴击不写断言。
 */
Smoke.scenario("bugbite", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.fill([-8, 0, -8], [8, 2, 8], "minecraft:air");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Scyther", level: 35, moves: ["bugbite"], at: [-4, 0, 0] });
    var foe = stage.pokemon({ species: "Steelix", level: 60, moves: ["tackle"], item: "cobblemon:liechi_berry", at: [4, 0, 0] });
    stage.noai(foe);
    stage.hostile(caster, foe);
    stage.until(1200, function () { return stage.casts("bugbite", caster) > 0 && stage.damageTo(foe) > 0; }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("bugbite", caster) > 0, "虫咬被放出来了");
            stage.expect(stage.damageTo(foe) > 0, "咬合打到了目标身上");
            stage.expect(!foe.alive() || stage.heldItem(foe) === "", "树果从目标手里被咬走（目标倒下时随目标消失）");
            stage.expect(!foe.alive() || (stage.stages(caster).atk || 0) >= 1, "施法者咀嚼后吸收枝荔果，攻击阶段提升");
            stage.note("目标携带枝荔果（能力提升类树果）、等级远高于施法者，这一咬咬不死：命中后树果应被咬走，咀嚼几刻后由施法者吸收（攻击 +1）。咬合双颚贴真实碰点合拢，吞食在真实嘴前；咀嚼被打断则已咬下的果白咬，致死击来不及取果。命中率与暴击不写断言。",
                { casts: stage.casts("bugbite", caster), damage: stage.damageTo(foe), held: stage.heldItem(foe), atk: stage.stages(caster).atk || 0 });
            stage.done();
        });
    }, "虫咬命中、咬走树果并吸收");
});
