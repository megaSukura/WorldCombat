/**
 * 封印的可执行设计说明。
 *
 * 场面：一只会封印与撞击的凯西对 5 格外、只会撞击的小拉达开战——双方招式表重合（撞击），
 *   所以封印立起后有可锁的一手。技能表里只有这两招，AI 会先立印。
 * 必然事实：封印被提交过；对手身上出现过共享身份 world_combat:status/imprison 的封印印记。
 *   重合招式被顶回几次、领域实际罩了多久，写进 note 供读轨迹判断。
 */
Smoke.scenario("imprison", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "kadabra", level: 36, moves: ["imprison", "tackle"], at: [-2, 0, 0] });
    // 只会与施法者重合的撞击：被封印后它想再撞就会被共享动作策略顶回去。
    var foe = stage.pokemon({ species: "rattata", level: 16, moves: ["tackle"], at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("imprison", caster) > 0 && stage.hadMobEffect(foe, "world_combat:status/imprison");
    }, function () {
        stage.expect(stage.casts("imprison", caster) > 0, "imprison was committed");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/imprison"), "the foe carried the shared imprison identity");
        stage.note("封印立在施法者身上，领域内与施法者共有招式的对手被落印；重合招式在提交点被顶回去。领域半径/时长随特攻、体型、等级与配置变化，对手走位离开领域或不再重合就会自然撤印。", {
            casts: stage.casts("imprison", caster), foeTackles: stage.casts("tackle", foe),
            casterTackles: stage.casts("tackle", caster), damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
            damageByCaster: Math.round(stage.damageBy(caster) * 10) / 10, tick: stage.tick()
        });
        stage.done();
    }, "imprison seals a shared move");
});
