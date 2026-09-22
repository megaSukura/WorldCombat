// 甜甜香气的可执行设计说明：一只只会这招的宝可梦朝两只挤在一起的僵尸吐出甜云。
// 必然事实：甜云被放出来过；两只僵尸都带上共享的「被香气浸透」身份（云在它们落点铺开，一起罩住）。
// 具体几只中招、云停多久写进 note 供读轨迹判断；每级浸透放大 6% 伤害的效果不在这条必然事实里。
Smoke.scenario("sweetscent", function (stage) {
    var caster = stage.pokemon({ species: "oddish", level: 35, moves: ["sweetscent"], at: [0, 0, 0] });
    var foeA = stage.mob({ type: "minecraft:zombie", at: [4, 0, 0] });
    var foeB = stage.mob({ type: "minecraft:zombie", at: [4, 0, 1] });
    stage.hostile(caster, foeA);
    stage.hostile(caster, foeB);
    stage.until(800, function () {
        return stage.casts("sweetscent") > 0
            && stage.hadMobEffect(foeA, "world_combat:status/scented")
            && stage.hadMobEffect(foeB, "world_combat:status/scented");
    }, function () {
        stage.expect(stage.casts("sweetscent") > 0, "sweet scent was committed");
        stage.expect(stage.hadMobEffect(foeA, "world_combat:status/scented"), "the first target was sweetened by the cloud");
        stage.expect(stage.hadMobEffect(foeB, "world_combat:status/scented"), "the second target was sweetened by the cloud");
        stage.note("both zombies carried the shared scented identity; the 6% damage amp per rank is read in damage_incoming, not asserted here", {
            casts: stage.casts("sweetscent"),
            damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
            moved: Math.round((stage.travelled(foeA) + stage.travelled(foeB)) * 10) / 10
        });
        stage.done();
    }, "the sweet cloud scents both zombies");
});
