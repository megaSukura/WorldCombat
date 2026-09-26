/**
 * 击落 / smackdown —— 可执行设计说明。
 *
 * 一句话：朝一个实体/落点投出系着配重的岩弹；砸中离地/会飞的对手就把它的浮空身份拔掉、申请部分拘束身份，
 * 并用向下的原生受击冲量真实把它压回地面。
 *
 * 场面：会击落的隆隆石带这一招，站在一只飞行属性的小敌前；小敌用撞击还手，逼出投石、命中与钉住的场面。
 * 选飞行属性的目标，是因为原生「击落」的身份落在飞行/浮空的对手身上——这是它成立时的必然事实。
 *
 * 断言只取必然事实：这招被放过、目标挨到伤害、目标身上出现过 world_combat:status/smackdown。
 * 暴击、岩弹追踪、真实下坠与落地尘是否发生写进 note 供读轨迹判断（目标可能一直站在地上，落地尘只在真正离地时出现）。
 */
Smoke.scenario("smackdown", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "graveler", level: 40, moves: ["smackdown"], at: [-4, 0, 0] });
    var flier = stage.pokemon({ species: "pidgey", level: 18, moves: ["tackle"], at: [3, 0, 0] });
    stage.hostile(caster, flier);
    var castTick = 0;
    stage.until(1000, function () {
        if (castTick === 0 && stage.casts("smackdown", caster) >= 1) castTick = stage.tick();
        return castTick > 0 && stage.tick() >= castTick + 40 && stage.damageTo(flier) > 0;
    }, function () {
        stage.expect(stage.casts("smackdown", caster) >= 1, "graveler committed smackdown");
        stage.expect(stage.damageTo(flier) > 0, "the weighted bolt dealt damage");
        stage.expect(stage.hadMobEffect(flier, "world_combat:status/smackdown"), "the flying target carried the smackdown identity");
        stage.note("crit, hit timing and whether the guided bolt reached the pidgey are random; the downward drag and landing dust only show when the target is actually off the ground, while the pin identity is requested on any flyer", {
            casts: stage.casts("smackdown", caster),
            damage: Math.round(stage.damageTo(flier) * 10) / 10,
            alive: flier.alive()
        });
        stage.done();
    }, "smackdown lands on a flyer within 50 s");
});
