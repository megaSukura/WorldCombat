// 芳香治疗的可执行设计说明：这招在一片会停留的香云里反复净化，所以场面要证明的不只是「这一次洗掉了」，
// 还有「云还在时再挂上的异常也会被继续洗掉」。
// 必然事实：施术者提交过芳香治疗；香云罩住的同队伙伴身上的异常被化掉；之后再给它挂一次异常，仍在云里被化掉。
// 香云半径、停留、香雾量与起手/冷却取决于特攻、特防、体型与等级，写进 note。
Smoke.scenario("aromatherapy", function (stage) {
    stage.weather("clear");
    stage.time("day");

    // 只会芳香治疗的罗丝雷朵（自己带灼伤，保证铺云的门槛立即成立）与同队皮卡丘（中毒、技能表为空）相隔一格，无敌人。
    var caster = stage.pokemon({ species: "roserade", level: 36, moves: ["aromatherapy"], at: [0, 0, 0], status: "burn" });
    var ally = stage.pokemon({ species: "pikachu", level: 30, moves: [], at: [1, 0, 0], status: "poison" });
    stage.team("scent", [caster, ally]);

    /** 按坐标给伙伴挂一次异常，避开选择器误选施术者。 */
    function givePoison(): void {
        var at = ally.position();
        stage.command("effect give @e[type=cobblemon:pokemon,x=" + at[0] + ",y=" + at[1] + ",z=" + at[2]
            + ",distance=..1.2,sort=nearest,limit=1] world_combat:burn 60 0");
    }

    stage.until(700, function () {
        return stage.casts("aromatherapy", caster) >= 1 && stage.hadMobEffect(ally, "world_combat:status/poison")
            && !stage.hasMobEffect(ally, "world_combat:status/poison");
    }, function () {
        stage.expect(stage.casts("aromatherapy", caster) >= 1, "the roserade committed aromatherapy");
        stage.expect(stage.hadMobEffect(ally, "world_combat:status/poison"), "the teammate carried the poison identity before the cloud");
        stage.expect(!stage.hasMobEffect(ally, "world_combat:status/poison"), "the cloud cleansed the teammate's poison");
        // 再挂一次：云还在，stay 的净化会再把它化掉。
        givePoison();
        stage.until(400, function () {
            return stage.hadMobEffect(ally, "world_combat:status/burn") && !stage.hasMobEffect(ally, "world_combat:status/burn");
        }, function () {
            stage.expect(!stage.hasMobEffect(ally, "world_combat:status/burn"), "the lingering cloud cleansed a burn applied after the cast");
            stage.note("香云落在选定点（AI 施放即自身位置），stay 每 5 刻扫一次：云里的友善战斗者带着主异常就当场化掉，因此先挂后洗与再挂再洗都成立。半径随特攻与体型、停留随特防与等级、香雾随特防与体型；浓香／弥香在半径与停留之间取舍。云的可视范围即判定范围，留给完整装配的人工试玩。", {
                casterCasts: stage.casts("aromatherapy", caster),
                allyPoisonEver: stage.hadMobEffect(ally, "world_combat:status/poison"),
                allyPoisonNow: stage.hasMobEffect(ally, "world_combat:status/poison"),
                allyBurnEver: stage.hadMobEffect(ally, "world_combat:status/burn"),
                allyBurnNow: stage.hasMobEffect(ally, "world_combat:status/burn"),
                tick: stage.tick()
            });
            stage.done();
        }, "the lingering cloud re-cleanses a later status");
    }, "aromatherapy lays a cloud that cleanses the teammate within 35 s");
});
