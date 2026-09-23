/**
 * 复仇 / comeuppance —— 参数、数值来源与直接结算。
 *
 * 原生事实：Dark／物理／威力 0（伤害回调）／命中 100／PP 10／优先度 0；
 * 「将最后受到的招式的伤害以 1.5 倍大力返还给对手」（Cobblemon 1.8）。
 *
 * 翻译：金属爆炸是把应力就地炸开，复仇则是把这份债记成一次追讨——先给账主压上一枚暗记，
 * 隔一拍之后一道暗影离手、贴着账主追过去，命中时按账本以 1.5 倍结算。暗影会追人，所以它在
 * 远处也能兑现；代价是比金属爆炸慢一拍。返还额不走攻防公式，直接结算，只被属性免疫挡住并按护甲削一次。
 *
 * 数据分散：
 *   refund            返还伤害 = min(记账额 × 1.5, 返还上限)；读当前账本与最大生命。
 *   capFraction       返还上限比例随物攻（积怨越深越压得住）。
 *   window            记账窗口随等级；记仇式更长。
 *   shadowSpeed       暗影速度随速度。
 *   shadowRange       追讨射程随等级。
 *   stalkDelay        追讨延迟随等级；记仇式更长。
 *   collisionRadius   判定半径随体型高度。
 *   brace／settle／recharge 起手／收招／冷却随速度；记仇式更慢更费。
 */
namespace PokemonSkills {
    export const comeuppanceId = "comeuppance";
    export const comeuppanceScene = "world_combat:move_comeuppance";
    export const comeuppanceHitText = "world_combat.move.comeuppance.text.hit";
    export const comeuppanceWhiffText = "world_combat.move.comeuppance.text.whiff";

    export interface ComeuppanceRecord { amount: number; tick: number; source: string; }
    export var comeuppanceLedger: { [ref: string]: ComeuppanceRecord } = Object.create(null);

    export function comeuppanceRemember(world: CombatWorld, victim: CombatActor, source: CombatActor, amount: number): void {
        comeuppanceLedger[String(victim.ref())] = { amount: amount, tick: world.tick(), source: String(source.ref()) };
        var refs = Object.keys(comeuppanceLedger);
        if (refs.length > 512) {
            var now = world.tick();
            for (var i = 0; i < refs.length; i++) if (now - comeuppanceLedger[refs[i]].tick > 1200) delete comeuppanceLedger[refs[i]];
        }
    }
    export function comeuppanceConsume(actor: CombatActor): void { delete comeuppanceLedger[String(actor.ref())]; }
    export function comeuppanceRecord(world: CombatWorld | null, actor: CombatActor | null): ComeuppanceRecord | null {
        if (!world || !actor || !world.valid(actor)) return null;
        var record = comeuppanceLedger[String(actor.ref())];
        if (!record || !(record.amount > 0)) return null;
        var window = p(comeuppanceId, "window", String(actor.domain()) === "cobblemon" ? world : undefined);
        return world.tick() - record.tick <= window ? record : null;
    }
    /** Fixed-damage settlement shared by the family: typing decides immunity, armour is the only mitigation. */
    export function comeuppanceRawHit(action: CombatAction, target: CombatActor, amount: number, contact: boolean): boolean {
        var world = action.world();
        if (!world.valid(target) || world.friendly(target) || !(amount > 0)) return false;
        var move = CobblemonCombat.moveTemplate(comeuppanceId), type = String(move.type());
        var facts = PokemonDamage.combatants.read(world, target);
        for (var index = 0; index < facts.types.length; index++)
            if (CobblemonCombat.typeEffectiveness(type, facts.types[index]) === 0) {
                PokemonDamage.immune(world, target, JSON.stringify({ kind: "move", move: comeuppanceId, type: type }));
                return false;
            }
        var armor = world.attributeValue(target, "minecraft:generic.armor");
        var toughness = world.attributeValue(target, "minecraft:generic.armor_toughness");
        var metadata: any = { kind: "move", move: comeuppanceId, type: type, category: String(move.category()), contact: contact,
            knockback: false, bypassCooldown: true, targetScale: 1, critical: false, action: action.id() };
        if (armor !== null) metadata.armorExcluded = armor.value();
        if (toughness !== null) metadata.toughnessExcluded = toughness.value();
        return world.hurt(target, amount, JSON.stringify(metadata));
    }

    WorldCombat.on("world_combat:move_comeuppance/ledger", "world_combat:damage_applied", "", function (event: CombatWorldEvent) {
        var victim = event.target();
        if (victim === null) return;
        var world = event.world();
        if (!world.valid(victim)) return;
        var data = JSON.parse(String(event.data()));
        if (!(data.actual > 0)) return;
        var source = event.actor();
        if (source !== null && String(source.key()) === String(victim.key())) return;
        comeuppanceRemember(world, victim, source, data.actual);
    });

    defineFacts(comeuppanceId, function (context: FactContext): Formula.Facts {
        return { read: function (id: string): Formula.Fact {
            if (id === "comeuppance.stored") {
                if (!context.world || !context.actor || !context.world.valid(context.actor)) return undefined;
                var record = comeuppanceRecord(context.world, context.actor);
                return record ? record.amount : 0;
            }
            if (id === "comeuppance.cap") {
                if (!context.world || !context.actor || !context.world.valid(context.actor)) return undefined;
                var body = context.world.observe(context.actor);
                return body === null ? undefined : body.maxHealth() * p(comeuppanceId, "capFraction", context.world);
            }
            return undefined;
        } };
    });

    actionParameters.define(comeuppanceId, {
        /** 返还伤害 = min(账上任意伤害 × 1.5, 最大生命 × 返还上限)。 */
        refund: formula(
            F.var("comeuppance.stored", text("worldcombat.skill.comeuppance.value.stored"))
                .times(F.const(1.5).as(text("worldcombat.skill.comeuppance.value.boost")))
                .min(F.var("comeuppance.cap", text("worldcombat.skill.comeuppance.value.cap"))).round(0),
            "返还伤害", {
                unit: "点",
                description: "把账本上那次伤害以 1.5 倍交给暗影追讨，最多不超过自身最大生命的一个比例。没有账可讨时暗记消散。"
            }),
        /** 返还上限比例：0.3 +（物攻 − 55）× 0.0025，夹 0.2..0.6。 */
        capFraction: percent(
            F.const(0.3).plus(F.stat("attack").minus(55).times(0.0025).clamp(-0.08, 0.3)).clamp(0.2, 0.6).round(3),
            "返还上限", "返还额最多等于自身最大生命的这个比例；物攻越高，积怨压得越实。"),
        /** 记账窗口：60 刻 + 等级偏移[−6,16] + 记仇 40 刻；夹 48..140 刻。 */
        window: seconds(
            F.base(60).plus(F.level().minus(30).times(0.4).clamp(-6, 16))
                .plus(F.when(F.pref("grudge", text("worldcombat.skill.comeuppance.preference.grudge")), F.const(40), F.const(0)))
                .clamp(48, 140).round(0),
            "记账窗口", "最近这段时间内挨的伤害会被记成一笔仇；等级越高、开记仇式时记得越久。"),
        /** 暗影速度：0.85 格/刻 + 速度偏移[−0.12,0.4]；夹 0.7..1.35。 */
        shadowSpeed: formula(
            F.base(0.85).plus(F.stat("speed").minus(55).times(0.005).clamp(-0.12, 0.4)).clamp(0.7, 1.35).round(2),
            "暗影速度", { unit: "格/刻", description: "追讨暗影飞行的速度；它自己会追向账主，越快越难在到达前甩开。" }),
        /** 追讨射程：7 格 + 等级偏移[−0.5,3]；夹 6.5..10.5；它同时是实际射程来源。 */
        shadowRange: formula(
            F.base(7).plus(F.level().minus(30).times(0.05).clamp(-0.5, 3)).clamp(6.5, 10.5).round(2),
            "追讨射程", { unit: "格", description: "暗影能被送到多远；等级越高，这笔账追得越远。" }),
        /** 判定半径：0.34 格 + 体型高度偏移[−0.05,0.24]；夹 0.28..0.6。 */
        collisionRadius: formula(
            F.base(0.34).plus(F.body("height").minus(1.4).times(0.09).clamp(-0.05, 0.24)).clamp(0.28, 0.6).round(2),
            "判定半径", { unit: "格", description: "暗影命中判定的半径；身板大的个体暗影罩面略大。" }),
        /** 起手：5 刻 − 速度偏移[−1,2] + 记仇 2 刻；夹 4..9。 */
        brace: seconds(
            F.base(5).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2))
                .plus(F.when(F.pref("grudge", text("worldcombat.skill.comeuppance.preference.grudge")), F.const(2), F.const(0))).clamp(4, 9).round(0),
            "起手", "压上暗记、放出暗影之前的时间；快的个体更利落，记仇式先钉牢这枚记。"),
        /** 追讨延迟：10 刻 + 等级偏移[−2,6] + 记仇 10 刻；夹 8..28。 */
        stalkDelay: seconds(
            F.base(10).plus(F.level().minus(30).times(0.2).clamp(-2, 6))
                .plus(F.when(F.pref("grudge", text("worldcombat.skill.comeuppance.preference.grudge")), F.const(10), F.const(0)))
                .clamp(8, 28).round(0),
            "追讨延迟", "暗记压上之后隔多久暗影才离手；这段时间里账主还能跑，延迟越长越难逃，记仇式更沉得住气。"),
        /** 收招：8 刻。 */
        settle: seconds(F.base(8).clamp(5, 13).round(0), "收招", "暗影脱手后收住的时间。"),
        /** 冷却：33 刻 − 速度偏移[−4,6] + 记仇 8 刻；夹 22..48。 */
        recharge: seconds(
            F.base(33).minus(F.stat("speed").minus(55).times(0.12).clamp(-4, 6))
                .plus(F.when(F.pref("grudge", text("worldcombat.skill.comeuppance.preference.grudge")), F.const(8), F.const(0))).clamp(22, 48).round(0),
            "冷却", "这笔账追讨完之后多久能再记一笔；速度快的个体回得更快，记仇式更费。")
    });

    stages(comeuppanceId, [
        { level: 30, values: { capFraction: 0.4 } },
        { level: 50, values: { capFraction: 0.5, shadowRange: 9 } }
    ]);

    describe(comeuppanceId, [
        { key: "description.0", values: ["refund","window"] },
        { key: "description.1", values: ["shadowRange","shadowSpeed","stalkDelay","collisionRadius","capFraction"] },
        { key: "description.ledger", values: [] },
        { key: "grudge.on", values: [], when: function (context) { return read(context.detail.values, ["grudge"]) === true; } },
        { key: "grudge.off", values: [], when: function (context) { return read(context.detail.values, ["grudge"]) !== true; } },
        { key: "timing", values: ["range", "brace", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.capFraction"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.capFraction", "tier.1.shadowRange"] }
    ]);
}
