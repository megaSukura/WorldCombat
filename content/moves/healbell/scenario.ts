// 治愈铃声的可执行设计说明：这招只在半径内有人带着主异常时才成立，所以场面让施术者与同队伙伴各挂一项异常。
// 必然事实：施术者提交过治愈铃声；灼伤身份从施术者身上消失（被真正清除）；同队伙伴的剧毒身份也消失。
// 铃声半径、声数、铃光量与起手/冷却取决于特攻、速度、特防、体型与等级，写进 note。
Smoke.scenario("healbell", function (stage) {
    stage.weather("clear");
    stage.time("day");

    // 只会治愈铃声的差不多娃娃（带灼伤）与同队吉利蛋（带中毒、技能表为空）贴身站位；无敌人，双方原地不动。
    var caster = stage.pokemon({ species: "audino", level: 34, moves: ["healbell"], at: [-1, 0, 0], status: "burn" });
    var ally = stage.pokemon({ species: "chansey", level: 30, moves: [], at: [1, 0, 0], status: "poison" });
    stage.team("bell", [caster, ally]);

    stage.until(700, function () {
        // mob_effect_added 在效果加上后的下一个 tick 才记录，所以把「异常曾被记录」一起写进条件。
        return stage.casts("healbell", caster) >= 1 && !stage.hasMobEffect(caster, "world_combat:status/burn")
            && !stage.hasMobEffect(ally, "world_combat:status/poison");
    }, function () {
        stage.expect(stage.casts("healbell", caster) >= 1, "the afflicted audino committed heal bell");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/burn"), "the caster had carried the burn identity before the bell");
        stage.expect(!stage.hasMobEffect(caster, "world_combat:status/burn"), "the bell cleared the caster's burn");
        stage.expect(stage.hadMobEffect(ally, "world_combat:status/poison"), "the teammate had carried the poison identity before the bell");
        stage.expect(!stage.hasMobEffect(ally, "world_combat:status/poison"), "the bell reached the teammate and cleared its poison");
        stage.note("铃声以 chimeRadius 为半径判定：特攻与等级决定半径、速度决定响几声、特防与体型决定铃光数；每一声都从施术者当前所在处响出，洗一次范围内的全部主异常（poison 身份一并带走剧毒，含 sleep 与 frozen）。本场景两项异常都在半径内被洗掉；只有真正清掉东西的对象会在自己身上亮起净光柱，空响仍然响完但不刷清除光。施放期间可以移动，声数、间隔与两端的粒子环留给完整装配的人工试玩。", {
            casterCasts: stage.casts("healbell", caster),
            casterBurnEver: stage.hadMobEffect(caster, "world_combat:status/burn"),
            casterBurnNow: stage.hasMobEffect(caster, "world_combat:status/burn"),
            allyPoisonEver: stage.hadMobEffect(ally, "world_combat:status/poison"),
            allyPoisonNow: stage.hasMobEffect(ally, "world_combat:status/poison"),
            tick: stage.tick()
        });
        stage.done();
    }, "heal bell cures the caster and a nearby teammate within 35 s");
});
