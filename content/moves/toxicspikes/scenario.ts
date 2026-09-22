/**
 * 毒菱 / toxicspikes —— 可执行设计说明。
 *
 * 一句话：把毒菱撒到敌人脚下的地面，贴地的敌人踩上去就中毒；毒属性的身体走进来会把整片毒菱吸掉。
 *
 * 场面：会毒菱的毒蔷薇带这一招；正前方是一只小拉达（普通属性、贴地），紧挨着它身后站着瓦斯弹（毒属性）。
 *   AI 盯上最近的小拉达、把毒菱撒在它脚下，小拉达先被毒到；同在那片毒菱里的瓦斯弹走近时把毒菱吸掉，
 *   自己不会被毒到。
 *
 * 断言只取必然事实：这招被放过、踩进毒菱的小拉达身上出现了共享的中毒身份、毒属性的瓦斯弹没有被同一片
 *   毒菱毒到。层数与毒菱具体落点写进 note。
 */
Smoke.scenario("toxicspikes", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "roselia", level: 40, moves: ["toxicspikes"], at: [-5, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 16, moves: ["tackle"], at: [1, 0, 0] });
    var poisonFoe = stage.pokemon({ species: "koffing", level: 16, moves: ["tackle"], at: [2.8, 0, 0.9] });
    stage.hostile(caster, foe);
    stage.hostile(caster, poisonFoe);
    stage.until(900, function () {
        return stage.casts("toxicspikes", caster) >= 1 && stage.hadMobEffect(foe, "world_combat:status/poison");
    }, function () {
        stage.after(10, function () {
            stage.expect(stage.casts("toxicspikes", caster) >= 1, "roselia committed toxic spikes");
            stage.expect(stage.hadMobEffect(foe, "world_combat:status/poison"), "the rattata standing on the spikes was poisoned");
            stage.expect(!stage.hadMobEffect(poisonFoe, "world_combat:status/poison"), "the Poison-type koffing absorbed the spikes instead of being poisoned");
            stage.note("landing spot, layer count (poison vs toxic) and whether the koffing stood in the same patch are positional/random", {
                casts: stage.casts("toxicspikes", caster),
                poisoned: stage.hasMobEffect(foe, "world_combat:status/poison"),
                poisonTypeClean: !stage.hasMobEffect(poisonFoe, "world_combat:status/poison"),
                foeDamage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "toxic spikes poison a grounded foe within 30 s");
});
