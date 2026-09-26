/**
 * 毒菱 / toxicspikes —— 可执行设计说明。
 *
 * 一句话：把毒菱撒到敌人脚下的地面，贴地的敌人踩上去就中毒；比毒菱高一层的地面不触发；毒属性吸收清场。
 *
 * 场面：会毒菱的毒蔷薇带这一招；正前方是一只小拉达（普通属性、贴地），紧挨着它身后站着瓦斯弹（毒属性）。
 *   AI 盯上最近的小拉达、把毒菱撒在它脚下，小拉达先被毒到；同在那片毒菱里的瓦斯弹走近时把毒菱吸掉，
 *   自己不会被毒到。旁边一根抬高一层的石柱、柱顶用围栏圈住一头牛：它在毒菱正上方的一层地表，不应被毒到。
 *
 * 断言只取必然事实：这招被放过；踩进毒菱的小拉达身上出现共享中毒身份；高一层地表的牛与毒属性的瓦斯弹
 *   没有被同一片毒菱毒到。层数、毒菱具体落点与是否为剧毒写进 note。
 */
Smoke.scenario("toxicspikes", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    // 抬高一层的石柱与围栏：柱顶的牛离毒菱地面正好一层，验证楼上不踩楼下毒菱。
    stage.fill([2, 0, 0], [2, 0, 0], "minecraft:stone");
    stage.fill([1, 1, -1], [1, 2, 1], "minecraft:glass");
    stage.fill([3, 1, -1], [3, 2, 1], "minecraft:glass");
    stage.fill([1, 1, -1], [3, 2, -1], "minecraft:glass");
    stage.fill([1, 1, 1], [3, 2, 1], "minecraft:glass");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "roselia", level: 40, moves: ["toxicspikes"], at: [-5, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 16, moves: ["tackle"], at: [1, 0, 0] });
    var poisonFoe = stage.pokemon({ species: "koffing", level: 16, moves: ["tackle"], at: [2.8, 0, 0.9] });
    var upper = stage.mob({ type: "minecraft:cow", at: [2, 1, 0] });
    stage.hostile(caster, foe);
    stage.hostile(caster, poisonFoe);
    stage.setPp(caster, "toxicspikes", 1);
    stage.until(1100, function () {
        return stage.casts("toxicspikes", caster) >= 1 && stage.hadMobEffect(foe, "world_combat:status/poison");
    }, function () {
        stage.after(20, function () {
            stage.expect(stage.casts("toxicspikes", caster) >= 1, "roselia committed toxic spikes");
            stage.expect(stage.hadMobEffect(foe, "world_combat:status/poison"), "the rattata standing on the spikes was poisoned");
            stage.expect(!stage.hadMobEffect(upper, "world_combat:status/poison"), "the body one layer above the patch was not poisoned");
            stage.expect(!stage.hadMobEffect(poisonFoe, "world_combat:status/poison"), "the Poison-type koffing absorbed the spikes instead of being poisoned");
            stage.note("landing point, layer count (poison vs toxic), the exact spot and crits are positional/random; an already equal-or-stronger poison keeps its own clock without being re-applied, and the koffing clears the patch it walks into. The cow one layer up stays clean because feet and patch must share a layer.", {
                casts: stage.casts("toxicspikes", caster),
                poisoned: stage.hadMobEffect(foe, "world_combat:status/poison"),
                aboveClean: !stage.hadMobEffect(upper, "world_combat:status/poison"),
                poisonTypeClean: !stage.hadMobEffect(poisonFoe, "world_combat:status/poison"),
                foeDamage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "toxic spikes poison their own layer and are absorbed by Poison-types");
});
