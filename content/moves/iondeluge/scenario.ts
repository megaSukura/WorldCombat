// 等离子浴：铺一片区域，里面的人沾上离子膜。两个核心兑现：
//   1) 带膜者出脚本一般属性招式，结算前变电（PokemonDamage.metadata 路径）；
//   2) 带膜的真实普通 MC 生物打出的已知普通原生攻击变电，保留原生 damageType、无伪 move（NativeAttackTypes 路径）。
// 场景让 magnemite 放场并用 tackle 命中，另让一只 husk 带膜后以原生 minecraft:mob_attack 命中一次。
// 回执直接读实际 damage_applied 事件，不手造种类元数据。tackle 由 scenarioFixtures 装配，缺夹具不会跳过断言。
const ionReceipts: { source: string; move: string; type: string; damageType: string; actual: number }[] = [];
WorldCombat.on("checks:iondeluge/receipts", "world_combat:damage_applied", "", event => {
    const data = JSON.parse(String(event.data()));
    if (!(data.actual > 0)) return;
    ionReceipts.push({ source: String(event.actor().ref()), move: String(data.move || ""),
        type: String(data.type || ""), damageType: String(data.damageType || ""), actual: Number(data.actual) });
});

Smoke.scenario("iondeluge", function (stage) {
    stage.fill([-16, -1, -8], [14, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    // 脚本路径：magnemite（电属性 + 一般属性 tackle）应铺场、被电离，然后 tackle 变电。
    const caster = stage.pokemon({ species: "magnemite", level: 35, moves: ["iondeluge", "tackle"], at: [-2, 0, 0] });
    const foe = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 0] });
    stage.noai(foe);
    stage.hostile(caster, foe);
    // 原生路径：真实普通 MC 生物在另一片浴场里带膜，用原生近战打一个静止原生目标。
    const striker = stage.mob({ type: "minecraft:husk", at: [-12, 0, 0] });
    const victim = stage.mob({ type: "minecraft:iron_golem", at: [-10, 0, 0] });
    stage.noai(victim);
    stage.hostile(striker, victim);
    stage.provoke(striker, victim);
    const before = ionReceipts.length;
    let staged = false;
    function mine(): { source: string; move: string; type: string; damageType: string; actual: number }[] {
        return ionReceipts.slice(before);
    }
    stage.until(1800, function () {
        if (!staged && stage.casts("iondeluge", caster) > 0) {
            // 施法者自己铺场后，补一片覆盖交战区的浴场，确保它在 tackle 时仍带膜；原生路径另铺一片。
            stage.field("world_combat:iondeluge", [0, 0, 0], 900, 9, { film: 12, density: 20 }, caster);
            stage.field("world_combat:iondeluge", [-12, 0, 0], 900, 3, { film: 12, density: 20 }, caster);
            staged = true;
        }
        const records = mine();
        const scripted = records.some(entry => entry.source.indexOf(caster.ref) === 0 && entry.move === "tackle" && entry.type === "electric");
        const native = records.some(entry => entry.source.indexOf(striker.ref) === 0 && entry.damageType === "minecraft:mob_attack"
            && entry.type === "electric" && entry.move === "");
        return staged && scripted && native;
    }, function () {
        const records = mine();
        const scripted = records.filter(entry => entry.source.indexOf(caster.ref) === 0 && entry.move === "tackle");
        const native = records.filter(entry => entry.source.indexOf(striker.ref) === 0 && entry.damageType === "minecraft:mob_attack");
        stage.expect(stage.casts("iondeluge", caster) > 0, "the caster laid a bath");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/ionized"), "the caster carried the ion film");
        stage.expect(stage.hadMobEffect(striker, "world_combat:status/ionized"), "the plain mob carried the ion film");
        stage.expect(scripted.some(entry => entry.type === "electric"), "the film-bearing caster's tackle settled as electric");
        stage.expect(native.some(entry => entry.type === "electric"), "the film-bearing plain mob's native melee settled as electric");
        stage.expect(native.some(entry => entry.type === "electric" && entry.move === ""), "the converted native melee kept no fake move identity");
        stage.note("the caster laid a bath, was ionized, then hit with tackle; a real plain mob carried the film and landed a native minecraft:mob_attack; both settled electric and the native damageType was kept",
            { casts: stage.casts("iondeluge", caster), scripted: scripted.slice(-4), native: native.slice(-4),
              onFoe: Math.round(stage.damageTo(foe) * 10) / 10 });
        stage.done();
    }, "electric conversion receipts");
});
