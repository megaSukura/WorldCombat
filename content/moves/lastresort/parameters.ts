/**
 * 珍藏 / lastresort —— 参数、伤害段与「其他招都用过」的记账。
 *
 * 原生事实：一般／物理／威力 140／命中 100／PP 5／优先度 0／接触；
 *   「当战斗中已学会的招式全部使用过后，才能开始使出珍藏的招式」——onTry 要求招式表 ≥ 2 招、且除本招外全部 used（Cobblemon 1.8，125 位学习者）。
 *
 * 翻译：即时战斗里没有回合，本招把「其他招都用过」翻成一本**出手账**：任何战斗者提交一次招式就记进它名下的账里；
 *   当施法者招式表里其他**已实装**的招都至少出过一次，珍藏才解锁。出手时把整副身板压上去打出全组最慢、最重的一记直撞，
 *   并随自己已损失的生命继续加重（真正的「珍藏」留到最后关头才掏）。打出之后账本清空，要再攒一轮才能再掏。
 *   一条设计取舍：只把**已实装**的招计入条件——否则招式表里只要有一招还没实现，这枚珍藏就永远开不了；
 *   孤招个体（没有其他可用招）视为条件满足，免得它无招可使。脱战 encounterIdle 后账本作废。
 *
 * 数据分散（每项依赖不同精灵数据）：
 *   trump       珍藏威力 = 118 + 物攻偏移 + 已损失生命 × 44；背水式 ×1.12；夹 80..205。
 *   wound       已损失生命比例（自定义读数，供说明与 AI 使用）。
 *   dash        冲撞距离 = 3.0 + 速度偏移 + 等级偏移；背水式 ×1.1；夹 2.6..5.6；也是射程来源。
 *   speed       每刻位移随速度。
 *   collisionRadius 判定半径随身高。
 *   push        顶开距离随物攻与体重。
 *   tempo／settle／recharge 速度决定起手、收招、冷却；背水式更慢更费。
 *
 * 配置 `desperation`（背水式）双向取舍：开启＝压上全部身家（威力 ×1.12、冲得更远 ×1.1），
 *   但起手慢 3 刻、收招多 3 刻、冷却多 8 刻——掏得越狠，露的破绽越大；关闭＝收势利落，冷却更短。
 *
 * 伤害段 `trump` 与参数同名，走共享换算；接触标记写在 defineDamage 上。
 */
namespace PokemonSkills {
    export const lastresortId = "lastresort";
    export const lastresortScene = "world_combat:move_lastresort";

    interface LastresortUsage { tick: number; moves: { [id: string]: boolean }; }
    var lastresortUsage: { [ref: string]: LastresortUsage } = Object.create(null);

    /** 已实装的招式才算「用过」，否则这枚珍藏永远开不了。 */
    function lastresortCreditable(id: string): boolean { return id !== "" && id !== lastresortId && !!skills[id]; }

    /**
     * 珍藏是否已解锁：招式表里其他已实装的招都出过一次。孤招个体（没有其他可用招）视为满足。
     * 账本超过 encounterIdle 没有更新就作废，对应「脱战之后要重新攒」。
     */
    export function lastresortUnlocked(world: CombatWorld, actor: CombatActor): boolean {
        if (!world || !world.valid(actor) || String(actor.domain()) !== "cobblemon") return false;
        const pokemon = CobblemonCombat.pokemon(actor);
        if (pokemon === null) return false;
        let record: LastresortUsage | undefined = lastresortUsage[String(actor.ref())];
        if (record && world.tick() - record.tick > NativeSemantics.encounterIdle) record = undefined;
        for (let i = 0; i < pokemon.moveSlots(); i++) {
            const move = pokemon.move(i);
            if (!move) continue;
            const id = String(move.id());
            if (!lastresortCreditable(id)) continue;
            if (!record || !record.moves[id]) return false;
        }
        return true;
    }

    /** 还差几招才解锁（没有其他可用招时为 0）。 */
    export function lastresortRemaining(world: CombatWorld, actor: CombatActor): number {
        if (!world || !world.valid(actor) || String(actor.domain()) !== "cobblemon") return 0;
        const pokemon = CobblemonCombat.pokemon(actor);
        if (pokemon === null) return 0;
        let record: LastresortUsage | undefined = lastresortUsage[String(actor.ref())];
        if (record && world.tick() - record.tick > NativeSemantics.encounterIdle) record = undefined;
        let missing = 0;
        for (let i = 0; i < pokemon.moveSlots(); i++) {
            const move = pokemon.move(i);
            if (!move) continue;
            const id = String(move.id());
            if (!lastresortCreditable(id)) continue;
            if (!record || !record.moves[id]) missing++;
        }
        return missing;
    }

    actionParameters.define(lastresortId, {
        /** 珍藏威力：118 +（物攻 − 60）× 0.42 [−24,50] + 已损失生命比例 × 44 [0,44]；背水 ×1.12；夹 80..205。 */
        trump: formula(
            F.base(118)
                .plus(F.stat("attack").minus(60).times(0.42).clamp(-24, 50))
                .plus(F.const(1).minus(F.actor("healthRatio", text("worldcombat.skill.lastresort.value.hpRatio"))).clamp(0, 1)
                    .times(44).as(text("worldcombat.skill.lastresort.value.wound")))
                .times(F.when(F.pref("desperation", text("worldcombat.skill.lastresort.preference.desperation")), F.const(1.12), F.const(1)))
                .clamp(80, 205).round(1),
            "珍藏威力", {
                unit: "威力",
                description: "压上全部身板的这一记威力；物攻给份量，已损失的生命越多越重——真正的珍藏留到最后关头才掏。对手防御、相性与暴击在命中时另算。"
            }),
        /** 已损失生命比例：1 − 当前生命 / 最大生命，夹在 0..1。它是这一记加重的读数来源。 */
        wound: percent(
            F.const(1).minus(F.actor("healthRatio", text("worldcombat.skill.lastresort.value.hpRatio"))).clamp(0, 1).round(3),
            "已损失生命", "自己越接近倒下这个值越大；它直接加进珍藏威力，血越少这一记越重。"),
        /** 冲撞距离：3.0 +（速度 − 55）× 0.02 [−0.5,1.4] +（等级 − 30）× 0.03 [0,1.0]；背水 ×1.1；夹 2.6..5.6。 */
        dash: formula(
            F.base(3.0).plus(F.stat("speed").minus(55).times(0.02).clamp(-0.5, 1.4))
                .plus(F.level().minus(30).times(0.03).clamp(0, 1.0))
                .times(F.when(F.pref("desperation", text("worldcombat.skill.lastresort.preference.desperation")), F.const(1.1), F.const(0.95)))
                .clamp(2.6, 5.6).round(2),
            "冲撞距离", {
                unit: "格",
                description: "朝目标直撞出去的最大距离，也是本招的实际射程来源；腿快的个体够得更远。背水式压得更长，也更容易冲过头。"
            }),
        /** 每刻位移：0.72 +（速度 − 55）× 0.005 [−0.12,0.35]；夹 0.5..1.2。 */
        speed: formula(
            F.base(0.72).plus(F.stat("speed").minus(55).times(0.005).clamp(-0.12, 0.35)).clamp(0.5, 1.2).round(2),
            "冲撞速度", { unit: "格/刻", description: "直撞时每刻前进的距离；这是全组最沉的一撞，起步慢而势足。" }),
        /** 判定半径：0.5 +（身高 − 1.4）× 0.12 [−0.1,0.32]；夹 0.4..0.85。 */
        collisionRadius: formula(
            F.base(0.5).plus(F.body("height").minus(1.4).times(0.12).clamp(-0.1, 0.32)).clamp(0.4, 0.85).round(2),
            "判定半径", { unit: "格", description: "整段身板撞过去扫过的判定半径；身板越大扫得越宽，越难被让开。" }),
        /** 顶开距离：0.55 +（物攻 − 60）× 0.006 [−0.12,0.55] +（体重 − 50）× 0.004 [−0.1,0.7]；夹 0.25..1.7。 */
        push: formula(
            F.base(0.55).plus(F.stat("attack").minus(60).times(0.006).clamp(-0.12, 0.55))
                .plus(F.body("weight").minus(50).times(0.004).clamp(-0.1, 0.7)).clamp(0.25, 1.7).round(2),
            "顶开距离", { unit: "格", description: "撞实后把目标沿冲势顶开多远；力量越足、体重越沉顶得越远，这一记能把人直接撞出阵地。" }),
        /** 起手：9 −（速度 − 55）× 0.04 [−2,3] + 背水 3；夹 6..15 刻。 */
        tempo: seconds(
            F.base(9).minus(F.stat("speed").minus(55).times(0.04).clamp(-2, 3))
                .plus(F.when(F.pref("desperation", text("worldcombat.skill.lastresort.preference.desperation")), F.const(3), F.const(0)))
                .clamp(6, 15).round(0),
            "起手", "把气力全提到脚下之前要站住多久；这是全组最长的起势，背水式还要再沉一口气，这段时间可被打断。"),
        /** 收招：9 + 背水 3 −（速度 − 55）× 0.03 [−1,2]；夹 6..15 刻。 */
        settle: seconds(
            F.base(9).plus(F.when(F.pref("desperation", text("worldcombat.skill.lastresort.preference.desperation")), F.const(3), F.const(0)))
                .minus(F.stat("speed").minus(55).times(0.03).clamp(-1, 2)).clamp(6, 15).round(0),
            "收招", "撞完刹住站起的时间；背水式冲得太狠，收势更久，容易被反打。"),
        /** 冷却：36 −（速度 − 55）× 0.15 [−5,7] + 背水 8；夹 24..54 刻。 */
        recharge: seconds(
            F.base(36).minus(F.stat("speed").minus(55).times(0.15).clamp(-5, 7))
                .plus(F.when(F.pref("desperation", text("worldcombat.skill.lastresort.preference.desperation")), F.const(8), F.const(0)))
                .clamp(24, 54).round(0),
            "冷却", "这一次之后多久能再掏；本招真正的一次性来自「要用遍其他招才解锁」，出手后账本清空，要再攒一轮。"),
        traceAhead: hidden(1.2),
        minimumMove: hidden(0.05)
    });

    defineDamage(lastresortId, "trump", { defenceCoefficient: 0.005,
        rationale: "压上全部身板的直撞；出场机会来之不易，份量给到最重。" }, { contact: true });

    stages(lastresortId, [
        { level: 45, values: { trump: 134 } },
        { level: 60, values: { trump: 150, dash: 3.8 } }
    ]);

    describe(lastresortId, [
        { key: "description.0", values: ["trump", "wound"] },
        { key: "description.1", values: ["dash", "speed", "collisionRadius", "push"] },
        { key: "desperation.on", values: [], when: function (context) { return read(context.detail.values, ["desperation"]) === true; } },
        { key: "desperation.off", values: [], when: function (context) { return read(context.detail.values, ["desperation"]) !== true; } },
        { key: "timing", values: ["range", "tempo", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.trump"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.trump", "tier.1.dash"] }
    ]);

    // 记账：任何战斗者提交一次招式都记进它名下的出手账；珍藏出手时把账本清空，要再攒一轮。
    WorldCombat.on("world_combat:lastresort/ledger", "world_combat:committed", "", function (event) {
        const actor = event.actor();
        if (actor === null) return;
        const world = event.world();
        if (!world.valid(actor)) return;
        const action = event.action();
        let id = action === null ? "" : String(action.content());
        if (id.indexOf("world_combat:") === 0) id = id.substring("world_combat:".length);
        const ref = String(actor.ref()), now = world.tick();
        let record = lastresortUsage[ref];
        if (!record || now - record.tick > NativeSemantics.encounterIdle) record = lastresortUsage[ref] = { tick: now, moves: {} };
        record.tick = now;
        if (id === lastresortId) { record.moves = {}; return; }
        if (id !== "") record.moves[id] = true;
        const refs = Object.keys(lastresortUsage);
        if (refs.length > 256) for (let i = 0; i < refs.length; i++) if (now - lastresortUsage[refs[i]].tick > NativeSemantics.encounterIdle * 2) delete lastresortUsage[refs[i]];
    });
}
