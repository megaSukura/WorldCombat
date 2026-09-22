// 魔法空间的可执行设计说明：这是一片按在地面、双方平等生效的静默空间，所以场面要有交战双方与一块地面。
// 必然事实：魔法空间被放出来过；站在空间里的施法者身上出现了共享身份 world_combat:status/magicroom。
// 「携带物效果消失」走共享的 NativeModifiers suppressItems 层，不是 MobEffect，smoke 读不到，写进 note 供完整装配试玩核对。
Smoke.scenario("magicroom", function (stage) {
    stage.weather("clear");
    stage.time("day");

    const caster = stage.pokemon({ species: "abra", level: 32, moves: ["magicroom"], item: "cobblemon:leftovers", at: [-3, 0, 0] });
    const target = stage.pokemon({ species: "rattata", level: 22, moves: ["tackle"], at: [5, 0, 0] });
    stage.hostile(caster, target);
    stage.until(900, function () {
        return stage.casts("magicroom", caster) > 0 && stage.hadMobEffect(caster, "world_combat:status/magicroom");
    }, function () {
        stage.expect(stage.casts("magicroom", caster) > 0, "magicroom was cast");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/magicroom"), "the caster standing inside carried the shared magicroom identity");
        stage.note("魔法空间按在落点，半径内的活体带共享身份；宝可梦成员额外叠加共享的 NativeModifiers suppressItems 层，所有读取持有物的结算因此读到「没有携带物」（本场景施法者带剩饭，压制后不再回复；smoke 读不到道具效果，兑现留给完整装配试玩）。半径、时长、密度随身高/特攻/等级变化，长默与快默各有取舍。", {
            casts: stage.casts("magicroom", caster),
            casterHp: caster.health()
        });
        stage.done();
    }, "the silent space holds");
});
