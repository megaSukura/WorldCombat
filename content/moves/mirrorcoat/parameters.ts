/**
 * 镜面反射 / mirrorcoat —— 参数、数值来源与直接结算。
 *
 * 原生事实：Psychic／特殊／威力 0（伤害回调）／命中 100／PP 20／优先度 −5；
 * 「从对手那里受到特殊攻击的伤害将以 2 倍返还给同一个对手」（Cobblemon 1.8）。
 *
 * 翻译：与双倍奉还共用「记账」骨架，但只认特殊伤害，并且把这份能量隔空射回去——立起一面镜、
 * 沿来击方向把翻倍的能量投出去，追着账主。镜面比拳头记得久，所以窗口更长；镜面的厚薄由特防决定。
 * 返还额不走攻防公式，直接结算，只被属性免疫挡住并按护甲削一次。
 *
 * 数据分散：
 *   refund            返还伤害 = min(记账额 × 2, 返还上限)；读当前账本与最大生命。
 *   capFraction       返还上限比例随特防（镜面越厚，能映回的越多）。
 *   window            记账窗口随特防；抛光式更长。
 *   boltSpeed／boltRange  光束速度与射程随特攻。
 *   collisionRadius／mirrorRadius 判定与镜面尺寸随体型高度。
 *   focus／settle／recharge 起手／收招／冷却随速度；抛光式更慢更费。
 */
namespace PokemonSkills {
    export const mirrorcoatId = "mirrorcoat";
    export const mirrorcoatScene = "world_combat:move_mirrorcoat";
    export const mirrorcoatHitText = "world_combat.move.mirrorcoat.text.hit";
    export const mirrorcoatWhiffText = "world_combat.move.mirrorcoat.text.whiff";

    export interface MirrorcoatRecord { amount: number; tick: number; source: string; }
    export var mirrorcoatLedger: { [ref: string]: MirrorcoatRecord } = Object.create(null);

    export function mirrorcoatRemember(world: CombatWorld, victim: CombatActor, source: CombatActor, amount: number): void {
        mirrorcoatLedger[String(victim.ref())] = { amount: amount, tick: world.tick(), source: String(source.ref()) };
        var refs = Object.keys(mirrorcoatLedger);
        if (refs.length > 512) {
            var now = world.tick();
            for (var i = 0; i < refs.length; i++) if (now - mirrorcoatLedger[refs[i]].tick > 1200) delete mirrorcoatLedger[refs[i]];
        }
    }
    export function mirrorcoatConsume(actor: CombatActor): void { delete mirrorcoatLedger[String(actor.ref())]; }
    export function mirrorcoatRecord(world: CombatWorld | null, actor: CombatActor | null): MirrorcoatRecord | null {
        if (!world || !actor || !world.valid(actor)) return null;
        var record = mirrorcoatLedger[String(actor.ref())];
        if (!record || !(record.amount > 0)) return null;
        var window = p(mirrorcoatId, "window", String(actor.domain()) === "cobblemon" ? world : undefined);
        return world.tick() - record.tick <= window ? record : null;
    }
    /** Fixed-damage settlement shared by the family: typing decides immunity, armour is the only mitigation. */
    export function mirrorcoatRawHit(action: CombatAction, target: CombatActor, amount: number, contact: boolean): boolean {
        var world = action.world();
        if (!world.valid(target) || world.friendly(target) || !(amount > 0)) return false;
        var move = CobblemonCombat.moveTemplate(mirrorcoatId), type = String(move.type());
        var facts = PokemonDamage.combatants.read(world, target);
        for (var index = 0; index < facts.types.length; index++)
            if (CobblemonCombat.typeEffectiveness(type, facts.types[index]) === 0) {
                PokemonDamage.immune(world, target, JSON.stringify({ kind: "move", move: mirrorcoatId, type: type }));
                return false;
            }
        var armor = world.attributeValue(target, "minecraft:generic.armor");
        var toughness = world.attributeValue(target, "minecraft:generic.armor_toughness");
        var metadata: any = { kind: "move", move: mirrorcoatId, type: type, category: String(move.category()), contact: contact,
            knockback: false, bypassCooldown: true, targetScale: 1, critical: false, action: action.id() };
        if (armor !== null) metadata.armorExcluded = armor.value();
        if (toughness !== null) metadata.toughnessExcluded = toughness.value();
        return world.hurt(target, amount, JSON.stringify(metadata));
    }

    WorldCombat.on("world_combat:move_mirrorcoat/ledger", "world_combat:damage_applied", "", function (event: CombatWorldEvent) {
        var victim = event.target();
        if (victim === null) return;
        var world = event.world();
        if (!world.valid(victim)) return;
        var data = JSON.parse(String(event.data()));
        if (!(data.actual > 0)) return;
        if (DamageSemantics.read(data).category !== "special") return;
        var source = event.actor();
        if (source !== null && String(source.key()) === String(victim.key())) return;
        mirrorcoatRemember(world, victim, source, data.actual);
    });

    // 反射命中后由真实伤害回执驱动：浮字与碎片量读这次实际扣的血，不用计划中的 refund。
    WorldCombat.on("world_combat:move_mirrorcoat/strike", "world_combat:damage_applied", "", function (event: CombatWorldEvent) {
        var data = JSON.parse(String(event.data()));
        if (!(data.actual > 0)) return;
        var action = event.action();
        var owned = action !== null && String(action.content()) === "world_combat:mirrorcoat";
        if (String(data.move || "") !== mirrorcoatId && !owned) return;
        var target = event.target();
        if (target === null) return;
        var world = event.world();
        var body = world.valid(target) ? world.observe(target) : null;
        var point = typeof data.x === "number" && typeof data.y === "number" && typeof data.z === "number"
            ? WorldCombat.point(data.x, data.y, data.z) : body === null ? null : body.position();
        if (point === null) return;
        var scale = 1;
        if (action !== null) {
            var raw = action.data("mirrorcoat/strike");
            if (raw !== null) {
                try { var payload = JSON.parse(raw); if (payload.scale > 0 && isFinite(payload.scale)) scale = payload.scale; } catch (error) { /* keep the default */ }
            }
        }
        WorldFeedback.emit(world, mirrorcoatScene, 1, point,
            { moment: "reflect", target: String(target.ref()), count: Math.round(14 + data.actual / 2), scale: scale,
                power: Math.round(data.actual * 10) / 10 }, 28);
        WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.1, 0)), mirrorcoatHitText, [Math.round(data.actual)], 26);
    });

    defineFacts(mirrorcoatId, function (context: FactContext): Formula.Facts {
        return { read: function (id: string): Formula.Fact {
            if (id === "mirrorcoat.stored") {
                if (!context.world || !context.actor || !context.world.valid(context.actor)) return undefined;
                var record = mirrorcoatRecord(context.world, context.actor);
                return record ? record.amount : 0;
            }
            if (id === "mirrorcoat.cap") {
                if (!context.world || !context.actor || !context.world.valid(context.actor)) return undefined;
                var body = context.world.observe(context.actor);
                return body === null ? undefined : body.maxHealth() * p(mirrorcoatId, "capFraction", context.world);
            }
            return undefined;
        } };
    });

    actionParameters.define(mirrorcoatId, {
        /** 返还伤害 = min(账上特殊伤害 × 2, 最大生命 × 返还上限)。 */
        refund: formula(
            F.var("mirrorcoat.stored", text("worldcombat.skill.mirrorcoat.value.stored"))
                .times(F.const(2).as(text("worldcombat.skill.mirrorcoat.value.double")))
                .min(F.var("mirrorcoat.cap", text("worldcombat.skill.mirrorcoat.value.cap"))).round(0),
            "返还伤害", {
                unit: "点",
                description: "把账本上的特殊伤害以两倍射回去，最多不超过自身最大生命的一个比例。没有账可讨时镜面只闪一下。"
            }),
        /** 返还上限比例：0.3 +（特防 − 50）× 0.002 + 抛光 0.08，夹 0.2..0.65。 */
        capFraction: percent(
            F.const(0.3).plus(F.stat("specialDefence").minus(50).times(0.002).clamp(-0.1, 0.3))
                .plus(F.when(F.pref("polish", text("worldcombat.skill.mirrorcoat.preference.polish")), F.const(0.08), F.const(0)))
                .clamp(0.2, 0.65).round(3),
            "返还上限", "返还额最多等于自身最大生命的这个比例；特防越高，镜面越厚、映回得越多，抛光式再抬一档。"),
        /** 记账窗口：70 刻 − 特防偏移[−10,16] + 抛光 24 刻；夹 44..120 刻。 */
        window: seconds(
            F.const(70).minus(F.stat("specialDefence").minus(55).times(0.2).clamp(-10, 16))
                .plus(F.when(F.pref("polish", text("worldcombat.skill.mirrorcoat.preference.polish")), F.const(24), F.const(0)))
                .clamp(44, 120).round(0),
            "记账窗口", "最近这段时间内挨的特殊打才会被镜面记住；特防高的个体把影子留得更久，抛光式更久。"),
        /** 光束速度：0.95 格/刻 + 特攻偏移[−0.1,0.4]；夹 0.75..1.4。 */
        boltSpeed: formula(
            F.base(0.95).plus(F.stat("specialAttack").minus(60).times(0.004).clamp(-0.1, 0.4)).clamp(0.75, 1.4).round(2),
            "光束速度", { unit: "格/刻", description: "反射光束飞行的速度；特攻越高越难在到达前走开。" }),
        /** 光束射程：7 格 + 特攻偏移[−0.5,4]；夹 6.5..11；它同时是实际射程来源。 */
        boltRange: formula(
            F.base(7).plus(F.stat("specialAttack").minus(60).times(0.03).clamp(-0.5, 4)).clamp(6.5, 11).round(2),
            "光束射程", { unit: "格", description: "反射光束能被送到多远；特攻越高，镜面铺得越远。" }),
        /** 判定半径：0.34 格 + 体型高度偏移[−0.06,0.26]；夹 0.28..0.62。 */
        collisionRadius: formula(
            F.base(0.34).plus(F.body("height").minus(1.4).times(0.1).clamp(-0.06, 0.26)).clamp(0.28, 0.62).round(2),
            "判定半径", { unit: "格", description: "光束命中判定的半径；大个子的镜面罩面略大。" }),
        /** 镜面半径：0.7 格 + 体型高度偏移[−0.15,0.6]；夹 0.55..1.3。 */
        mirrorRadius: formula(
            F.base(0.7).plus(F.body("height").minus(1.4).times(0.2).clamp(-0.15, 0.6)).clamp(0.55, 1.3).round(2),
            "镜面半径", { unit: "格", description: "立起的镜面有多大；身板越高，镜面越宽，画面里一眼看出它能映住多大一片。" }),
        /** 起手：6 刻 − 速度偏移[−1.5,3] + 抛光 3 刻；夹 5..11。 */
        focus: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.03).clamp(-1.5, 3))
                .plus(F.when(F.pref("polish", text("worldcombat.skill.mirrorcoat.preference.polish")), F.const(3), F.const(0))).clamp(5, 11).round(0),
            "起手", "把镜面立稳、凝住那笔账的时间；快的个体收得更利落，抛光式先擦亮镜面。"),
        /** 收招：8 刻。 */
        settle: seconds(F.base(8).clamp(5, 13).round(0), "收招", "光束脱手后收住的时间。"),
        /** 冷却：34 刻 − 速度偏移[−4,6] + 抛光 8 刻；夹 22..50。 */
        recharge: seconds(
            F.base(34).minus(F.stat("speed").minus(55).times(0.12).clamp(-4, 6))
                .plus(F.when(F.pref("polish", text("worldcombat.skill.mirrorcoat.preference.polish")), F.const(8), F.const(0))).clamp(22, 50).round(0),
            "冷却", "这次反射之后多久能再蓄起一面镜；速度快的个体回得更快，抛光式更费。"),
        traceAhead: hidden(0.6)
    });

    stages(mirrorcoatId, [
        { level: 30, values: { capFraction: 0.4 } },
        { level: 50, values: { capFraction: 0.5, boltRange: 9 } }
    ]);

    describe(mirrorcoatId, [
        { key: "description.0", values: ["refund","window"] },
        { key: "description.1", values: ["boltRange","boltSpeed","collisionRadius","capFraction"] },
        { key: "polish.on", values: [], when: function (context) { return read(context.detail.values, ["polish"]) === true; } },
        { key: "polish.off", values: [], when: function (context) { return read(context.detail.values, ["polish"]) !== true; } },
        { key: "timing", values: ["range", "focus", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.capFraction"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.capFraction", "tier.1.boltRange"] }
    ]);
}
