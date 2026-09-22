/**
 * 闪焰高歌 / torchsong 的可执行设计说明。
 *
 * 场面：一只只会闪焰高歌的喷火龙与一只弱小的对手相隔 7 格开战；喷火龙会站定朝对手唱出火锥。
 * 必然事实：本招被提交过、对手受过闪焰高歌的伤害。
 * 命中的段数、锥面罩到几个人、暴击，都会随走位变化，写进 note 供读轨迹判断。
 */
Smoke.scenario("torchsong", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "charizard", level: 45, moves: ["torchsong"], at: [-3.5, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 15, moves: ["tackle"], at: [3.5, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("torchsong", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(100, function () {
            stage.expect(stage.casts("torchsong", caster) >= 1, "caster committed torch song");
            stage.expect(stage.damageTo(foe) > 0, "torch song dealt damage to the foe");
            stage.note("landed pulses, cone targets and crit vary with positioning; the Sp. Atk boost is applied on the first hit", {
                casts: stage.casts("torchsong", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "torch song lands within 60 s");
});
