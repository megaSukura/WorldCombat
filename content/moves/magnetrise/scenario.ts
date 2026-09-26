namespace MagnetriseReviewScenario {
    var casterRef = "";
    var releaseMark = false;
    var didDispel = false;
    WorldCombat.on("checks:magnetrise/dispel", "world_combat:mob_effect_added", "", function (event) {
        if (!releaseMark || String(event.actor().ref()).indexOf(casterRef) !== 0) return;
        var world = event.world(), marks = world.effects(event.actor(), "world_combat:magnetrise_mark");
        if (!marks.length) return;
        releaseMark = false;
        marks.forEach(function (mark) { didDispel = world.operation(mark.id(), "world_combat:dispel", "{}") || didDispel; });
    });
// 电磁飘浮的可执行设计说明：让一只电属性宝可梦对着地面属性的对手只起浮。
// 必然事实：电磁飘浮被放出来过；施法者带上共享身份 world_combat:status/magnetrise；
//   原生托举让身体真的离地（重力属性被临时悬起、身体 Y 高于起浮前，且停在低空而非飞走）；
//   显式驱散托举标记后重力归还、它的真实载体与共享身份一同清理。
// 同极弹开需要一次真实落下的贴地接触命中，本私有装配里对手不还手，写进 note 供完整装配试玩核对。
Smoke.scenario("magnetrise", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "magneton", level: 35, moves: ["magnetrise"], at: [-3, 0, 0] });
    casterRef = caster.ref;
    releaseMark = false;
    didDispel = false;
    var baseY = caster.position()[1];
    var baseGravity = stage.attribute(caster, "minecraft:generic.gravity");
    // 岩石／地面属性的对手：伙伴 AI 的「躲地面招」把这种威胁当作起浮理由。
    var target = stage.pokemon({ species: "onix", level: 30, moves: [], at: [3, 0, 0] });
    stage.hostile(caster, target);
    stage.until(900, function () {
        return stage.casts("magnetrise", caster) > 0
            && stage.hasMobEffect(caster, "world_combat:status/magnetrise")
            && stage.attribute(caster, "minecraft:generic.gravity") < baseGravity - 0.0001
            && caster.position()[1] > baseY + 0.1;
    }, function () {
        var liftedY = caster.position()[1];
        stage.expect(stage.casts("magnetrise", caster) > 0, "magnetrise was cast");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/magnetrise"), "caster carried the shared magnetrise identity");
        stage.expect(stage.attribute(caster, "minecraft:generic.gravity") < baseGravity - 0.0001,
            "native gravity was suspended while the body was held above the surface");
        stage.expect(liftedY > baseY + 0.1, "the body actually rose above its spawn height");
        stage.expect(liftedY < baseY + 3.0, "the hover stayed low instead of flying away");
        // 直接驱散拥有者，验证托举租约和对应载体一并释放。
        stage.setPp(caster, "magnetrise", 0);
        releaseMark = true;
        // A real receiver-owned native event provides a fresh scope for the explicit mark operation.
        stage.command("effect give " + caster.ref.split("/")[0] + " minecraft:speed 1 0 true");
        stage.after(40, function () {
            stage.expect(didDispel, "the mark received its explicit dispel operation");
            stage.expect(stage.attribute(caster, "minecraft:generic.gravity") >= baseGravity - 0.0001,
                "dispelling the mark returned native gravity");
            stage.expect(!stage.hasMobEffect(caster, "world_combat:status/magnetrise"), "dispelling the mark also cleared its native carrier");
            stage.note("磁场挂上后身体真的低空离地；地面招免疫与贴地近战弹开需要对应的来招，本装配写进 note 供完整装配试玩核对。托举高度随身高、时长随等级/速度、弹力随体重变化。持有黑色铁球或被击落/扎根时不生效。", {
                casts: stage.casts("magnetrise", caster),
                baseY: Math.round(baseY * 100) / 100,
                liftedY: Math.round(liftedY * 100) / 100,
                gravityBefore: baseGravity,
                gravityAfterClear: stage.attribute(caster, "minecraft:generic.gravity"),
                casterHp: caster.health()
            });
            stage.done();
        });
    }, "magnetrise lifts the caster");
});

}
