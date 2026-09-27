/**
 * 啄食的可执行设计说明：一只飞行啄击手，对一只携带树果、足够硬的目标出手。
 * 必然事实：本招被提交过、目标受过伤（喙沿真实瞄准啄中）；目标这一啄打不死时，果子应被啄走并由施法者当场吞下
 * （枝荔果 -> 攻击 +1）。取果只发生一次、且在目标仍可访问装备时；若这一啄直接击倒目标则来不及取果。
 * 仰角够高、横瞄不命中离线高处、隔墙无啄击、命中率与暴击不写断言。
 */
Smoke.scenario("pluck", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.fill([-8, 0, -8], [8, 2, 8], "minecraft:air");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Pidgeotto", level: 35, moves: ["pluck"], at: [-4, 0, 0] });
    var foe = stage.pokemon({ species: "Steelix", level: 60, moves: ["tackle"], item: "cobblemon:liechi_berry", at: [4, 0, 0] });
    stage.noai(foe);
    stage.hostile(caster, foe);
    stage.until(1200, function () { return stage.casts("pluck", caster) > 0 && stage.damageTo(foe) > 0; }, function () {
        stage.after(12, function () {
            stage.expect(stage.casts("pluck", caster) > 0, "啄食被放出来了");
            stage.expect(stage.damageTo(foe) > 0, "长喙啄到了目标身上");
            stage.expect(!foe.alive() || stage.heldItem(foe) === "", "树果从目标手里被啄走（目标倒下时随目标消失）");
            stage.expect(!foe.alive() || (stage.stages(caster).atk || 0) >= 1, "施法者吞下枝荔果，攻击阶段提升");
            stage.note("目标携带枝荔果（能力提升类树果）、等级远高于施法者，这一啄打不死：命中后树果应被啄走并由施法者当场吞下（攻击 +1）。喙只沿真实瞄准取第一个身体，墙和友方会先挡下，仰起能啄到浮空目标，横瞄不会命中离线高处；致死击来不及取果。命中率与暴击不写断言。",
                { casts: stage.casts("pluck", caster), damage: stage.damageTo(foe), held: stage.heldItem(foe), atk: stage.stages(caster).atk || 0 });
            stage.done();
        });
    }, "啄食命中并造成伤害");
});
