/**
 * 金属爆炸 / metalburst —— 参数、数值来源与直接结算。
 *
 * 原生事实：Steel／物理／威力 0（伤害回调）／命中 100／PP 10／优先度 0；
 * 「将最后受到的招式的伤害以 1.5 倍大力返还给对手」（Cobblemon 1.8）。
 *
 * 翻译：金属外壳把挨过的打击震成应力储在身上（不分物理特殊都记），出招时从体内向外炸开——
 * 账本上的那笔以 1.5 倍炸在对手身上，并迸裂的碎片削到周围的敌人。返还额不走攻防公式，
 * 直接结算，只被属性免疫挡住并按护甲削一次。
 *
 * 数据分散：
 *   refund            返还伤害 = min(记账额 × 1.5 × 破片系数, 返还上限)。
 *   capFraction       返还上限比例随防御与体重（越重的金属壳能扛住越多应力）。
 *   window            记账窗口随等级。
 *   burstRadius       爆炸半径随体重与体型高度。
 *   shareFraction     迸裂给旁人的分摊比例随破片式。
 *   brace／settle／recharge 起手／收招／冷却随速度；破片式更慢更费。
 */
namespace PokemonSkills {
    export const metalburstId = "metalburst";
    export const metalburstScene = "world_combat:move_metalburst";
    export const metalburstHitText = "world_combat.move.metalburst.text.hit";
    export const metalburstWhiffText = "world_combat.move.metalburst.text.whiff";

    export interface MetalburstRecord { amount: number; tick: number; source: string; }
    export var metalburstLedger: { [ref: string]: MetalburstRecord } = Object.create(null);

    export function metalburstRemember(world: CombatWorld, victim: CombatActor, source: CombatActor, amount: number): void {
        metalburstLedger[String(victim.ref())] = { amount: amount, tick: world.tick(), source: String(source.ref()) };
        var refs = Object.keys(metalburstLedger);
        if (refs.length > 512) {
            var now = world.tick();
            for (var i = 0; i < refs.length; i++) if (now - metalburstLedger[refs[i]].tick > 1200) delete metalburstLedger[refs[i]];
        }
    }
    export function metalburstConsume(actor: CombatActor): void { delete metalburstLedger[String(actor.ref())]; }
    export function metalburstRecord(world: CombatWorld | null, actor: CombatActor | null): MetalburstRecord | null {
        if (!world || !actor || !world.valid(actor)) return null;
        var record = metalburstLedger[String(actor.ref())];
        if (!record || !(record.amount > 0)) return null;
        if (String(actor.domain()) !== "cobblemon") return record;
        var window = p(metalburstId, "window", world);
        return world.tick() - record.tick <= window ? record : null;
    }
    /** Fixed-damage settlement shared by the family: typing decides immunity, armour is the only mitigation. */
    export function metalburstRawHit(action: CombatAction, target: CombatActor, amount: number, contact: boolean): boolean {
        var world = action.world();
        if (!world.valid(target) || world.friendly(target) || !(amount > 0)) return false;
        var move = CobblemonCombat.moveTemplate(metalburstId), type = String(move.type());
        var facts = PokemonDamage.combatants.read(world, target);
        for (var index = 0; index < facts.types.length; index++)
            if (CobblemonCombat.typeEffectiveness(type, facts.types[index]) === 0) {
                PokemonDamage.immune(world, target, JSON.stringify({ kind: "move", move: metalburstId, type: type }));
                return false;
            }
        var armor = world.attributeValue(target, "minecraft:generic.armor");
        var toughness = world.attributeValue(target, "minecraft:generic.armor_toughness");
        var metadata: any = { kind: "move", move: metalburstId, type: type, category: String(move.category()), contact: contact,
            knockback: false, bypassCooldown: true, targetScale: 1, critical: false, action: action.id() };
        if (armor !== null) metadata.armorExcluded = armor.value();
        if (toughness !== null) metadata.toughnessExcluded = toughness.value();
        return world.hurt(target, amount, JSON.stringify(metadata));
    }

    WorldCombat.on("world_combat:move_metalburst/ledger", "world_combat:damage_applied", "", function (event: CombatWorldEvent) {
        var victim = event.target();
        if (victim === null) return;
        var world = event.world();
        if (!world.valid(victim)) return;
        var data = JSON.parse(String(event.data()));
        if (!(data.actual > 0)) return;
        var source = event.actor();
        if (source !== null && String(source.key()) === String(victim.key())) return;
        metalburstRemember(world, victim, source, data.actual);
    });

    defineFacts(metalburstId, function (context: FactContext): Formula.Facts {
        return { read: function (id: string): Formula.Fact {
            if (id === "metalburst.stored") {
                if (!context.world || !context.actor || !context.world.valid(context.actor)) return undefined;
                var record = metalburstRecord(context.world, context.actor);
                return record ? record.amount : 0;
            }
            if (id === "metalburst.cap") {
                if (!context.world || !context.actor || !context.world.valid(context.actor)) return undefined;
                var body = context.world.observe(context.actor);
                return body === null ? undefined : body.maxHealth() * p(metalburstId, "capFraction", context.world);
            }
            return undefined;
        } };
    });

    actionParameters.define(metalburstId, {
        /** 返还伤害 = min(账上任意伤害 × 1.5 × 破片系数, 最大生命 × 返还上限)。 */
        refund: formula(
            F.var("metalburst.stored", text("worldcombat.skill.metalburst.value.stored"))
                .times(F.const(1.5).as(text("worldcombat.skill.metalburst.value.boost")))
                .times(F.when(F.pref("shrapnel", text("worldcombat.skill.metalburst.preference.shrapnel")), F.const(0.8), F.const(1))
                    .as(text("worldcombat.skill.metalburst.value.shrapnel")))
                .min(F.var("metalburst.cap", text("worldcombat.skill.metalburst.value.cap"))).round(0),
            "返还伤害", {
                unit: "点",
                description: "把账本上那次伤害以 1.5 倍炸回去；破片式把主目标的这一份降到八成，用来摊给周围。没有账可讨时外壳只空响一声。"
            }),
        /** 返还上限比例：0.32 +（防御 − 50）× 0.0015 +（体重 − 60）× 0.0006，夹 0.22..0.6。 */
        capFraction: percent(
            F.const(0.32).plus(F.stat("defence").minus(50).times(0.0015).clamp(-0.1, 0.25))
                .plus(F.body("weight").minus(60).times(0.0006).clamp(-0.05, 0.15)).clamp(0.22, 0.6).round(3),
            "返还上限", "返还额最多等于自身最大生命的这个比例；防御与体重越高，金属壳越能扛住应力。"),
        /** 记账窗口：50 刻 + 等级偏移[−6,20]；夹 40..90 刻。 */
        window: seconds(
            F.base(50).plus(F.level().minus(30).times(0.5).clamp(-6, 20)).clamp(40, 90).round(0),
            "记账窗口", "最近这段时间内挨的打都会震动外壳、被记进应力；等级越高壳越稳，记得越久。"),
        /** 爆炸半径：1.8 格 + 体重偏移[−0.4,1.2] + 体高偏移[−0.1,0.6]；夹 1.5..3.4。 */
        burstRadius: formula(
            F.base(1.8).plus(F.body("weight").minus(60).times(0.004).clamp(-0.4, 1.2))
                .plus(F.body("height").minus(1.4).times(0.25).clamp(-0.1, 0.6)).clamp(1.5, 3.4).round(2),
            "爆炸半径", { unit: "格", description: "外壳炸开波及的范围，也是本招的实际射程来源；越重越高的个体炸得越开。" }),
        /** 分摊比例：普通 45%，破片式 70%；夹 0.3..0.75。 */
        shareFraction: percent(
            F.when(F.pref("shrapnel", text("worldcombat.skill.metalburst.preference.shrapnel")), F.const(0.7), F.const(0.45)).clamp(0.3, 0.75).round(2),
            "分摊比例", "站在爆炸里的其他敌人各自吃到的那一份；破片式让碎片分得更远，代价是主目标的那一份更小。"),
        /** 起手：5 刻 − 速度偏移[−1,2] + 破片 2 刻；夹 4..9。 */
        brace: seconds(
            F.base(5).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2))
                .plus(F.when(F.pref("shrapnel", text("worldcombat.skill.metalburst.preference.shrapnel")), F.const(2), F.const(0))).clamp(4, 9).round(0),
            "起手", "把外壳的应力聚起来、引爆之前的时间；快的个体更利落，破片式先让碎片就位。"),
        /** 收招：9 刻。 */
        settle: seconds(F.base(9).clamp(5, 14).round(0), "收招", "炸开后收住的时间。"),
        /** 冷却：32 刻 − 速度偏移[−3,5] + 破片 8 刻；夹 22..48。 */
        recharge: seconds(
            F.base(32).minus(F.stat("speed").minus(55).times(0.1).clamp(-3, 5))
                .plus(F.when(F.pref("shrapnel", text("worldcombat.skill.metalburst.preference.shrapnel")), F.const(8), F.const(0))).clamp(22, 48).round(0),
            "冷却", "外壳重新长稳之前不能再炸一次；速度快的个体回得更快，破片式更费。"),
        maximumTargets: hidden(4)
    });

    stages(metalburstId, [
        { level: 30, values: { burstRadius: 2.2 } },
        { level: 50, values: { burstRadius: 2.6, capFraction: 0.5 } }
    ]);

    describe(metalburstId, [
        { key: "description.0", values: ["refund", "window"] },
        { key: "description.1", values: ["burstRadius", "maximumTargets", "shareFraction", "capFraction"] },
        { key: "shrapnel.on", values: [], when: function (context) { return read(context.detail.values, ["shrapnel"]) === true; } },
        { key: "shrapnel.off", values: [], when: function (context) { return read(context.detail.values, ["shrapnel"]) !== true; } },
        { key: "timing", values: ["range", "brace", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.burstRadius"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.burstRadius", "tier.1.capFraction"] }
    ]);
}
