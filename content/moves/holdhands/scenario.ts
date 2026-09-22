// 牵手的可执行设计说明：这是一招用站位换取双人疗伤的社交动作，所以场面要有队友、也要有一个受伤的队友。
// 必然事实：施法者提交过牵手；施法者与伙伴身上都出现过共享身份 world_combat:status/holdhands。
// 每拍回复多少、链子什么时候因为拉开距离而断，都是持续观察项，写进 note。
Smoke.scenario("holdhands", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "eevee", level: 32, moves: ["holdhands"], at: [-2, 0, 0] });
    var ally = stage.pokemon({ species: "pikachu", level: 30, moves: ["tackle"], at: [1, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 18, moves: ["tackle"], at: [9, 0, 0] });
    stage.team("hands", [caster, ally]);
    stage.hostile(caster, foe);

    // 先让伙伴掉血，跨过牵手阈值（默认 0.8），让 AI 有理由牵这只手；健康读数在出生当刻还没定好，用最大生命的比例打。
    stage.after(8, function () {
        if (!ally.alive()) return;
        var at = ally.position(), maximum = ally.health();
        stage.command("execute positioned " + at[0] + " " + at[1] + " " + at[2] + " run damage @e[type=cobblemon:pokemon,distance=..2,limit=1,sort=nearest] "
            + Math.max(1, Math.round(maximum * 0.4)) + " minecraft:generic");
    });

    stage.until(900, function () {
        return stage.casts("holdhands", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/holdhands")
            && stage.hadMobEffect(ally, "world_combat:status/holdhands");
    }, function () {
        stage.expect(stage.casts("holdhands", caster) > 0, "the caster held hands with the wounded ally");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/holdhands"), "the caster carried the shared holdhands identity");
        stage.expect(stage.hadMobEffect(ally, "world_combat:status/holdhands"), "the ally carried the shared holdhands identity");
        // 再等一会儿，让链子至少匀一次体力，方便在轨迹里读回复；回复量不是必然事实。
        stage.after(120, function () {
            stage.note("牵手把连接效果挂在施法者身上，每 healInterval 刻检查两人是否仍在链子长度内；在范围内则双方各按自身最大生命回复 healShare，超出则连接崩断、两端同时失去身份。回复比例、链子长度、连接时长与心光数分别随特攻、亲密度、等级与体型变化，具体数值由完整装配的人工试玩核对。", {
                casterCasts: stage.casts("holdhands", caster), allyDamage: Math.round(stage.damageTo(ally) * 10) / 10,
                allyNow: Math.round(ally.health() * 10) / 10, tick: stage.tick()
            });
            stage.done();
        });
    }, "holdhands linked the pair");
});
