/** 森林诅咒：给任意活体追加草属性；根须从脚底、树冠从体顶承载诅咒。 场景核对提交与状态变化；表现由人工体验确认。 */
Smoke.scenario("forestscurse", function (stage) {
    stage.fill([-10, -1, -10], [10, -1, 10], "minecraft:grass_block");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "trevenant", level: 30, moves: ["forestscurse"], at: [-3, 0, 0] });
    var target = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    stage.hostile(caster, target);
    stage.until(420, function () {
        return stage.casts("forestscurse", caster) > 0
            && stage.hadMobEffect(target, "world_combat:status/forestscurse");
    }, function () {
        stage.expect(stage.casts("forestscurse", caster) > 0, "forest's curse was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/forestscurse"), "the target carried the shared forest curse identity");
        stage.after(90, function () {
            stage.note("森林诅咒保留目标原有属性、再通过通用 CombatTypes 层追加一条草属性，并绑定真实载体 forest_curse：载体被驱散或到期时类型层与贴身叶纹一起收束。这里的目标是普通僵尸（无原生属性），验证通用 PvE 路径；宝可梦走同一层。根须从脚底、树冠从体顶，半径只由 grove 决定一次。", {
                casts: stage.casts("forestscurse", caster),
                curseActive: stage.hasMobEffect(target, "world_combat:status/forestscurse"),
                damageToTarget: Math.round(stage.damageTo(target) * 10) / 10,
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                targetAlive: target.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "the grass type is appended to an ordinary living target");
});
