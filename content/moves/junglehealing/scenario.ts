/**
 * 丛林治疗 / Jungle Healing —— 可执行设计说明。
 *
 * 一句话：施法者把根扎进草地，一圈藤蔓从土里炸起、缠上自己与身边的伙伴，把两人的血补回来并洗掉身上的异常，
 *   地上再留下几格嫩芽。
 *
 * 场面：晴天白天，铺一层草方块（自然地面，触发丛林加成）。只会丛林治疗的萨戮德（zarude，这招的原学习者，
 *   技能表只给这一招）带灼伤、与同队皮卡丘（pikachu，技能表为空）带中毒相隔 2 格；开局把两者各压到最大生命
 *   约六成，跨过救助阈值。
 *
 * 必然事实：施术者提交过丛林治疗；伙伴的中毒被化掉、施术者自己的灼伤被化掉；两人生命都高于压血后的最低值；
 *   身周的草方块上真的长出了嫩芽（`changedBlocks` 里出现 short_grass／fern／moss）。
 *   回复比例、藤蔓半径、嫩芽数与起手/冷却取决于亲密度、特攻、身高、等级与脚下地面，写进 note。
 */
Smoke.scenario("junglehealing", function (stage) {
    stage.fill([-6, -1, -6], [8, -1, 6], "minecraft:grass_block");
    stage.fill([-6, 0, -6], [8, 1, 6], "minecraft:air");
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "zarude", level: 32, moves: ["junglehealing"], at: [0, 0, 0], status: "burn" });
    var ally = stage.pokemon({ species: "pikachu", level: 30, moves: [], at: [2, 0, 0], status: "poison" });
    stage.team("jungle", [caster, ally]);

    var casterLow = 0, allyLow = 0;
    stage.after(8, function () {
        var at = caster.position(), best = caster.health();
        stage.command("execute positioned " + at[0] + " " + at[1] + " " + at[2]
            + " run damage @e[type=cobblemon:pokemon,distance=..1.2,limit=1,sort=nearest] "
            + Math.max(1, Math.round(best * 0.4)) + " minecraft:generic");
        var mate = ally.position(), mateMax = ally.health();
        stage.command("execute positioned " + mate[0] + " " + mate[1] + " " + mate[2]
            + " run damage @e[type=cobblemon:pokemon,distance=..1.2,limit=1,sort=nearest] "
            + Math.max(1, Math.round(mateMax * 0.4)) + " minecraft:generic");
        stage.after(4, function () { casterLow = caster.health(); allyLow = ally.health(); });
    });

    stage.until(900, function () {
        return casterLow > 0 && stage.casts("junglehealing", caster) >= 1 && ally.health() > allyLow
            && !stage.hasMobEffect(ally, "world_combat:status/poison");
    }, function () {
        stage.expect(stage.casts("junglehealing", caster) >= 1, "the caster called the jungle");
        stage.expect(stage.hadMobEffect(ally, "world_combat:status/poison"), "the ally carried poison before the vines");
        stage.expect(!stage.hasMobEffect(ally, "world_combat:status/poison"), "the vines cleansed the ally's poison");
        stage.expect(!stage.hasMobEffect(caster, "world_combat:status/burn"), "the vines cleansed the caster's own burn");
        var grown = stage.changedBlocks().some(function (change) { return /short_grass|fern|moss/.test(change.after); });
        stage.expect(grown, "jungle healing grew fresh sprouts on the grass around the caster");
        stage.note("藤蔓以自身为心炸开：圈内的自己与伙伴各回一次血并化掉全部主异常（毒／灼伤／麻痹／睡眠／冰冻）；脚下是自然地面时半径与回复更高，身周真的种下一圈短命嫩芽（world.terrain 租借、linger，到期原方块回来）。回复随亲密度与自然地面、半径随特攻与等级、嫩芽随身高与等级变化；深根档更大更多但更慢。", {
            casterCasts: stage.casts("junglehealing", caster),
            casterLow: Math.round(casterLow * 10) / 10,
            casterNow: Math.round(caster.health() * 10) / 10,
            allyLow: Math.round(allyLow * 10) / 10,
            allyNow: Math.round(ally.health() * 10) / 10,
            casterBurnNow: stage.hasMobEffect(caster, "world_combat:status/burn"),
            allyPoisonNow: stage.hasMobEffect(ally, "world_combat:status/poison"),
            grown: stage.changedBlocks().filter(function (change) { return /short_grass|fern|moss/.test(change.after); }).length,
            tick: stage.tick()
        });
        stage.done();
    }, "jungle healing restores and cleanses the pair within 45 s");
});
