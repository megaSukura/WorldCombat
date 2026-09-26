// 等离子浴：铺一片区域，里面的人会被电离。核心兑现是「带膜者的一般属性招式在结算前变电」。
// 场景让施法者（magnemite，电属性且带一般属性招式 tackle）在浴场里电离后用 tackle 打一个原生敌人，
// 并登记测试内回执观察，断言这记 tackle 的真实伤害回执 type 为 electric。回执直接读伤害事件，不用手造元数据。
//
// 注意：tackle 是另一个独立单元，单单元烟测不会装配它（设计上禁止单元依赖单元）。所以：
//   - 与 content/moves/tackle 一起装配时（例如 verify.py content/moves/iondeluge content/moves/tackle），
//     施法者会真正用 tackle 命中，本场景硬断言回执 type=electric；
//   - 只装配本单元时找不到 tackle 动作，退化为只断言“放场 + 挂膜”，并在 note 里记录缺夹具，避免用假元数据充数。
const ionSmokeReceipts: { ref: string; move: string; type: string }[] = [];
WorldCombat.on("checks:iondeluge/receipt", "world_combat:damage_applied", "", event => {
    const actor = event.actor();
    if (actor === null) return;
    const data = JSON.parse(String(event.data()));
    if (String(data.move || "") !== "tackle") return;
    ionSmokeReceipts.push({ ref: String(actor.ref()), move: String(data.move), type: String(data.type || "") });
});

Smoke.scenario("iondeluge", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    const caster = stage.pokemon({ species: "magnemite", level: 35, moves: ["iondeluge", "tackle"], at: [-2, 0, 0] });
    const foe = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 0] });
    stage.noai(foe);
    stage.hostile(caster, foe);
    const before = ionSmokeReceipts.length;
    function mine(): { ref: string; move: string; type: string }[] {
        return ionSmokeReceipts.slice(before).filter(entry => entry.ref.indexOf(caster.ref) === 0);
    }
    let started = -1;
    stage.until(1600, function () {
        if (started < 0) started = stage.tick();
        if (mine().some(entry => entry.type === "electric")) return true;
        // If the tackle unit is not part of this assembly the caster can never use it; stop waiting and report.
        return stage.casts("tackle", caster) === 0 && stage.tick() - started > 600;
    }, function () {
        const receipts = mine();
        stage.expect(stage.casts("iondeluge", caster) > 0, "iondeluge was cast");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/ionized"), "the caster carried the ion film");
        if (stage.casts("tackle", caster) > 0 || receipts.length > 0) {
            stage.expect(receipts.some(entry => entry.type === "electric"), "the film-bearing caster's tackle settled as electric");
            stage.note("the caster laid the bath, was ionized, then hit a native enemy with tackle; the actual damage receipt carries type=electric",
                { casts: stage.casts("iondeluge", caster), tackleCasts: stage.casts("tackle", caster), onFoe: Math.round(stage.damageTo(foe) * 10) / 10, receipts: receipts });
        } else {
            stage.note("tackle is a separate unit and is not assembled in this unit-only smoke, so the electric receipt cannot be produced here; " +
                "the conversion assertion runs when the tackle unit is included (verify.py content/moves/iondeluge content/moves/tackle)",
                { casts: stage.casts("iondeluge", caster), tackleCasts: stage.casts("tackle", caster), receipts: receipts });
        }
        stage.done();
    }, "electric tackle receipt");
});
