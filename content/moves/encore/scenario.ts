// 再来一次的可执行设计说明。
// 场面：一只只会再来一次的怪力对 6 格外一只只会怨念的卡比兽。先用指令把卡比兽打到它的立怨阈值以下的残血，
//   逼它立下怨念——这样它的「最后使用的招式」就有一手真正提交过的原生招可以被点名（grudge 有 PP、不带 failencore）。
//   本组的私有装配只装载这四招，所以目标必须用本组的招；怪力随后把那一手钉住。
// 两只野生宝可梦互相并不被算作 hostile（只有 Monster 才是），野生大脑还会清掉原生目标；
//   用有界的定时重申敌意，让双方始终互相当作威胁。
// 必然事实：再来一次被提交过；回声作为真实 MobEffect 落到目标身上，并带上共享身份 world_combat:status/encore。
// 随机结果：被点名的是哪一招、回声撑满多少秒写进 note 供读轨迹判断。
Smoke.scenario("encore", function (stage) {
    var caster = stage.pokemon({ species: "Machoke", level: 34, moves: ["encore"], at: [-3, 0, 0] });
    var target = stage.pokemon({ species: "Snorlax", level: 30, moves: ["grudge"], at: [3, 0, 0] });
    function plain(ref: string): string { return String(ref).split("/")[0]; }
    stage.hostile(caster, target);
    for (var step = 1; step <= 150; step++) {
        stage.after(step * 8, function () { stage.hostile(caster, target); });
    }
    stage.after(30, function () {
        stage.command("damage " + plain(target.ref) + " " + Math.max(1, Math.floor(target.health() * 0.65)) + " minecraft:magic");
    });
    stage.note("staged: machoke(34) encore vs snorlax(30) grudge at 6 blocks; the wounded target lays down a readable last move first");
    stage.until(1500, function () {
        return stage.casts("encore", caster) > 0 && stage.hadMobEffect(target, "world_combat:status/encore");
    }, function () {
        stage.expect(stage.casts("encore", caster) > 0, "encore was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:encore_call"), "the encore exists as a real MobEffect");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/encore"), "the encore carries the shared identity");
        stage.note("the target is pinned to its last move by the shared native only-modifier (mark world_combat:encore_loop); the echo ends early when that move runs out of PP and otherwise fades on its own.", {
            casts: stage.casts("encore", caster), targetMove: stage.casts("grudge", target),
            casterAlive: caster.alive(), targetAlive: target.alive(), targetHealth: target.health()
        });
        stage.done();
    }, "encore lands on the target");
});
