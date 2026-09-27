/**
 * 精神击破 / psystrike —— 可执行设计说明。
 *
 * 一句话：在标记点正上方堆出重物竖直砸下，按物理防御结算并削受伤者特防。
 *
 * 场面：只带这一招的超梦，对两只血厚、关掉 AI 的铁傀儡（站着不动，保证竖直下砸能落到标记点）：
 *   一只站在空地上，另一只头顶盖了一块石顶。断言：本招被放出过、空地那只吃到过伤害、顶下的那只始终没有被结算。
 *   落点固定、不横向追踪、特防下降写进 note（特防级数不通过 smoke API 直接暴露）。
 */
Smoke.scenario("psystrike", function (stage) {
    stage.fill([-12, -1, -9], [12, -1, 9], "minecraft:stone");
    // 给第二只铁傀儡盖一块石顶：重物会先在顶面撞开，下面的目标不该被结算，压场也不会穿顶扫下来。
    stage.fill([3, 3, -1], [7, 3, 1], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var user = stage.pokemon({ species: "mewtwo", level: 70, moves: ["psystrike"], at: [-7, 0, 0], properties: "nature=modest" });
    var open = stage.mob({ type: "minecraft:iron_golem", at: [0, 0, 0] });
    var sheltered = stage.mob({ type: "minecraft:iron_golem", at: [5, 0, 0] });
    stage.hostile(user, open);
    stage.hostile(user, sheltered);
    stage.noai(open, sheltered);
    stage.until(1400, function () {
        // 第一发砸倒空地那只，第二发只剩顶下那只可打：真去打它时重物应先砸在顶面。
        return stage.casts("psystrike", user) >= 2 && stage.damageTo(open) > 0;
    }, function () {
        stage.expect(stage.casts("psystrike", user) >= 2, "mewtwo committed psystrike at both targets");
        stage.expect(stage.damageTo(open) > 0, "the overhead mass dealt damage to the open target");
        stage.expect(stage.damageTo(sheltered) === 0, "the stone roof shielded the target beneath it");
        stage.note("the landing point is fixed at commit and the mass falls straight down without tracking; the first cast settles on the open golem, the second is aimed at the roofed one and its mass breaks on the roof, so the sheltered body is never settled (and the wide shock never runs under a roof). Damage settles against physical Defence (native overrideDefensiveStat) and only the wounded body's Sp. Def drops by 1 stage; the stage change is not directly observable through the smoke API.", {
            casts: stage.casts("psystrike", user),
            openDamage: Math.round(stage.damageTo(open) * 10) / 10,
            shelteredDamage: Math.round(stage.damageTo(sheltered) * 10) / 10,
            tick: stage.tick()
        });
        stage.done();
    }, "psystrike presses both targets within 70 s");
});
