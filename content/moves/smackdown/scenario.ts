/**
 * 击落 / smackdown —— 可执行设计说明。
 *
 * 一句话：朝一个实体/落点投出系着配重的岩弹；砸中真实离地或带共享浮空的对手就把共享浮空拔掉、申请部分拘束身份，
 * 并用向下的原生受击冲量真实把它压回地面。
 *
 * 场面：会击落的隆隆石带这一招，对一只被原生 levitation 抬离地面的铁傀儡投石。用 levitation 是因为本招只认
 * 实际碰撞事实（grounded===false）与共享浮空身份，不从飞行属性推断对手正在飞；站在地上的普通目标只挨这一记石头。
 *
 * 断言只取必然事实：这招被放过、目标挨到伤害、目标身上出现过 world_combat:status/smackdown。
 * 真实下坠、落地尘与抗推拒绝写进 note 供读轨迹判断（免控目标可能连续推不动）。
 */
Smoke.scenario("smackdown", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "graveler", level: 40, moves: ["smackdown"], at: [-4, 0, 0] });
    var flier = stage.mob({ type: "minecraft:iron_golem", at: [4, 0, 0] });
    stage.noai(flier);
    // 真实离地：原生 levitation 让目标脱离地面，本招据此判定「正在空中」。
    stage.after(1, function () {
        stage.command("effect give @e[type=minecraft:iron_golem,limit=1] minecraft:levitation 1200 0 true");
    });
    stage.after(20, function () { stage.hostile(caster, flier); });
    stage.until(1000, function () {
        return stage.casts("smackdown", caster) >= 1 && stage.hadMobEffect(flier, "world_combat:status/smackdown");
    }, function () {
        stage.expect(stage.casts("smackdown", caster) >= 1, "graveler committed smackdown");
        stage.expect(stage.damageTo(flier) > 0, "the weighted bolt dealt damage");
        stage.expect(stage.hadMobEffect(flier, "world_combat:status/smackdown"), "the actually airborne target carried the smackdown identity");
        stage.note("hit timing and whether the guided bolt reached the levitating golem are random; the downward drag and landing dust only show when the target is actually off the ground, while the pin identity is requested only for a target that is airborne or carries a shared levitation.", {
            casts: stage.casts("smackdown", caster),
            damage: Math.round(stage.damageTo(flier) * 10) / 10,
            alive: flier.alive()
        });
        stage.done();
    }, "smackdown lands on an actually airborne target");
});
