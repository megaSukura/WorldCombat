/** 森林诅咒：给目标追加草属性；根须、树冠与解除时的落叶承载诅咒表现。 场景核对提交、状态或生命变化；表现由人工体验确认。 */
Smoke.scenario("forestscurse", function (stage) {
    stage.fill([-10, -1, -10], [10, -1, 10], "minecraft:grass_block");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "trevenant", level: 30, moves: ["forestscurse"], at: [-3, 0, 0] });
    var target = stage.pokemon({ species: "sentret", level: 30, moves: ["tackle"], at: [3, 0, 0] });
    stage.hostile(caster, target);
    stage.until(420, function () {
        return stage.casts("forestscurse", caster) > 0
            && stage.hadMobEffect(target, "world_combat:status/forestscurse");
    }, function () {
        stage.expect(stage.casts("forestscurse", caster) > 0, "forest's curse was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/forestscurse"), "the target carried the shared forest curse identity");
        stage.after(90, function () {
            stage.note("森林诅咒保留目标原有属性、再通过共享属性层追加一条草属性，并以状态标记记录命中；命中目标身上另有一个同寿命的托管效果持有贴身叶纹层，与原属性表现并存，直到诅咒褪去。根须只表示这层草，不会缠住或定住目标；可给敌方打开弱点，也可给友方添草抗性；地面不留种咒区，空点落空。", {
                casts: stage.casts("forestscurse", caster),
                curseActive: stage.hasMobEffect(target, "world_combat:status/forestscurse"),
                damageToTarget: Math.round(stage.damageTo(target) * 10) / 10,
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                targetAlive: target.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "the grass type is appended to a single-type target");
});
