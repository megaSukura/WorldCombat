/**
 * 腹鼓 / Belly Drum —— 可执行设计说明。
 *
 * 一句话：有敌人的时候，用半条命把物攻拉满；AI 只在场上有威胁、自身生命高于 ai.healthFloor（默认 0.65）、
 *   且身上没有同名力量窗口时起鼓。所以场面必须先造出威胁，再让施术者保持在高血。
 *
 * 场面：晴天白天、开阔平地。只会腹鼓的卡比兽（snorlax，会学这招；技能表只给这一招）站在一侧；7 格外站一只
 *   小拉达并宣战。施术者先把「持久鼓劲」固定为关闭（配置事实：保留生命 50%），由服务端 /damage 压到约九成
 *   生命（跨过起鼓下限仍保留足够生命），再让 AI 在威胁下调出腹鼓。
 *
 * 必然事实：施术者提交过腹鼓；提交时一次性支付生命到配置的保留线（默认一半），力量窗口以共享状态
 *   world_combat:status/bellydrum 出现；native 等级梯由 stage.stages 直接读取，起手 -6 也可经窗口达到 +6，
 *   窗口到期只撤回本招的贡献、回到 -6。准备期内 3–5 记腹前敲击（见 skill.ts windup，随体重派生的准备时长而定）
 *   属于表现过程，由完整装配的人工试玩核对，不在本场景断言。
 */
const bellyNativeHits: any[] = [];
WorldCombat.on("checks:bellydrum/native-receipts", "world_combat:damage_applied", "", event => {
    const data = JSON.parse(String(event.data()));
    if (data.damageType === "minecraft:mob_attack") bellyNativeHits.push({ source: data.sourceEntity, sourceType: data.sourceType,
        direct: data.directEntity, directType: data.directType, actor: String(event.actor().ref()), target: event.target() ? String(event.target()!.ref()) : "" });
});
Smoke.scenario("bellydrum", function (stage) {
    stage.weather("clear");
    stage.time("day");

    var caster = stage.pokemon({ species: "snorlax", level: 30, moves: ["bellydrum"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 15, moves: ["tackle"], at: [7, 0, 0] });
    stage.hostile(caster, foe);
    stage.noai(foe);
    stage.after(1, function () {
        // 保留生命是配置事实，不是猜测：固定爆发档（保留一半），断言才对准真实支付线。
        stage.prefer(caster, "bellydrum", { endure: false });
        stage.boost(caster, { atk: -6 });
        stage.expect(stage.stages(caster).atk === -6, "the starting Attack ladder is genuinely lowered");
    });

    // 先压到约九成：高于起鼓下限，又让腹鼓的代价（压到一半）可被清晰观察到。
    var maximum = 0;
    function wound(): void {
        if (!caster.alive()) return;
        if (maximum <= 0) maximum = caster.health();
        if (maximum <= 0) return;
        if (caster.health() <= maximum * 0.9) return;
        var at = caster.position();
        stage.command("execute positioned " + at[0] + " " + at[1] + " " + at[2]
            + " run damage @e[type=cobblemon:pokemon,distance=..2,limit=1,sort=nearest] "
            + Math.max(1, Math.round(maximum * 0.05)) + " minecraft:generic");
        stage.after(10, wound);
    }
    stage.after(5, wound);

    stage.until(900, function () {
        return stage.casts("bellydrum", caster) >= 1;
    }, function () {
        stage.expect(stage.casts("bellydrum", caster) >= 1, "the threatened snorlax drummed while above its health floor");
        stage.expect(Math.abs(caster.health() - maximum * 0.5) <= 0.6, "belly drum paid to its configured half-health floor");
        stage.after(60, function () {
            stage.expect(stage.damageEvents("mob").every(event => event.from !== event.to), "health payment did not make the payer attack itself");
            stage.expect(stage.hadMobEffect(caster, "world_combat:status/bellydrum"), "the power window is carried by the shared status world_combat:status/bellydrum");
            stage.expect(stage.stages(caster).atk === 6, "drumming reaches +6 even from a negative starting ladder");
            stage.setPp(caster, "bellydrum", 0);
            stage.note("起鼓在准备期内逐拍敲腹（拍数 3–5 随准备时长，服务端按真实朝向/体型分别发出，见 skill.ts windup），提交时一次性支付生命到配置保留线并挂上 world_combat:bellydrum 载体；stage.stages 直接读到物攻等级在窗口内为 +6，窗口到期（frenzy 约 10 秒 / endure 约 24 秒）或被清除时只撤回本招的贡献、回到起手前的 -6。支付由原生 world.health 结算，被拒绝时不发满攻。", {
                nativeReceipts: bellyNativeHits,
                casterCasts: stage.casts("bellydrum", caster),
                maximumHealth: Math.round(maximum * 10) / 10,
                casterHealth: Math.round(caster.health() * 10) / 10,
                healthRatio: maximum > 0 ? Math.round(caster.health() / maximum * 100) / 100 : 0,
                surgeStatusEver: stage.hadMobEffect(caster, "world_combat:status/bellydrum"),
                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                foeCasts: stage.casts("tackle", foe),
                casterAlive: caster.alive(),
                tick: stage.tick()
            });
            stage.until(550,()=>!stage.hasMobEffect(caster,"world_combat:status/bellydrum"),()=>{
                stage.expect(stage.stages(caster).atk===-6,"expiry restores the original lowered ladder");
                stage.done();
            },"the owned full-strength window expires");
        });
    }, "belly drum is cast within 45 s");
});
