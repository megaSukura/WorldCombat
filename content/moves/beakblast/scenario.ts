/**
 * 鸟嘴加农炮 / beakblast —— 可执行设计说明。
 *
 * 一句话：先把鸟嘴烧到赤热（这段时间里用身体碰到它的人会被烫伤），再把喙弹直线射出去。
 *
 * 场面：只会鸟嘴加农炮的铳嘴大鸟（Toucannon）对一只只会电光一闪（Quick Attack，接触）的大卡比（Snorlax，
 * 血厚、会不停贴上来），另放一只被点住、不会还手的铁傀儡当固定靶。第一次开炮命中后再多跑 400 刻，
 * 让贴身的小敌有机会在某个加热窗口里用身体碰上施法者。
 * 断言只取必然事实：这招被提交过、喙弹确实命中过某个对手。接触灼伤是否正好落在加热窗口里由走位与出手间隔
 * 决定，写进 note；`hasMobEffect` 记录此刻是否还带着灼伤身份。
 */
Smoke.scenario("beakblast", function (stage) {
    stage.fill([-10, -1, -8], [10, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "toucannon", level: 50, moves: ["beakblast"], at: [-3, 0, 0] });
    var golem = stage.mob({ type: "minecraft:iron_golem", at: [5, 0, 0] });
    var brawler = stage.pokemon({ species: "snorlax", level: 40, moves: ["quickattack"], at: [-1.5, 0, 0] });
    stage.hostile(caster, golem);
    stage.hostile(caster, brawler);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..10] {NoAI:1b}");
    stage.until(900, function () {
        return stage.casts("beakblast", caster) >= 1 && (stage.damageTo(golem) > 0 || stage.damageTo(brawler) > 0);
    }, function () {
        // 再多跑一段，给贴身的接触留出跨过加热窗口的机会。
        stage.after(400, function () {
            stage.expect(stage.casts("beakblast", caster) >= 1, "caster committed beak blast");
            stage.expect(stage.damageTo(golem) > 0 || stage.damageTo(brawler) > 0, "the beak shot dealt damage to a foe");
            stage.note("the heat window lasts `heat` ticks; a contact that lands inside it burns the attacker through the shared burn identity. Whether the pressing Snorlax's contact overlaps the window is timing-dependent", {
                casts: stage.casts("beakblast", caster),
                golemDamage: Math.round(stage.damageTo(golem) * 10) / 10,
                brawlerDamage: Math.round(stage.damageTo(brawler) * 10) / 10,
                brawlerBurned: stage.hadMobEffect(brawler, "world_combat:status/burn"),
                brawlerBurningNow: stage.hasMobEffect(brawler, "world_combat:status/burn"),
                golemBurned: stage.hadMobEffect(golem, "world_combat:status/burn"),
                golemAlive: golem.alive(),
                brawlerAlive: brawler.alive()
            });
            stage.done();
        });
    }, "beak blast fires within 45 s");
});
