/**
 * 双倍奉还 / counter —— 参数、数值来源与直接结算。
 *
 * 原生事实：Fighting／物理／威力 0（伤害回调）／命中 100／PP 20／优先度 −5／接触；
 * 「从对手那里受到物理攻击的伤害将以 2 倍返还给同一个对手」（Cobblemon 1.8）。
 *
 * 翻译：即时战斗里没有回合结算，本招把「本回合被物理打中」翻成一条持续记账——战斗中的每次
 * 外来物理伤害都记进施法者的账本（世界事件 world_combat:damage_applied 的 `actual`）；在记账
 * 窗口内出招时，把账上那笔以 2 倍还给面前的对手。没有账可讨时这一记落空，与原生的 onTry 失败一致。
 * 返还额不由攻防公式推导（那会变成另一招），而与地球上投／黑夜魔影同一入口直接结算：只被属性
 * 免疫挡住，并按目标护甲削一次。
 *
 * 数据分散（每个参数各吃不同的精灵数据）：
 *   refund            返还伤害 = min(记账额 × 2, 返还上限)；读当前账本与施法者最大生命。
 *   capFraction       返还上限 = 最大生命的一个比例，随防御增长（身板越硬越扛得住、还得越多）。
 *   window            记账窗口随速度（快者只认眼前的账）；沉势式拉长。
 *   dash              迎击距离随速度与等级。
 *   speed             每刻位移随速度。
 *   collisionRadius   判定半径随体型高度。
 *   push              击退随物攻。
 *   grit／settle／recharge 起手／收招／冷却随速度；沉势式更慢更费。
 */
namespace PokemonSkills {
    export const counterId = "counter";
    export const counterScene = "world_combat:move_counter";
    export const counterHitText = "world_combat.move.counter.text.hit";
    export const counterWhiffText = "world_combat.move.counter.text.whiff";

    export interface CounterRecord { amount: number; tick: number; source: string; }
    export var counterLedger: { [ref: string]: CounterRecord } = Object.create(null);
    /** 账本的托管载体：身上那几道「记着这笔账」的短裂纹，随记录一起出现、消耗或过期一起灭。 */
    export const counterDebtMark = "world_combat:move_counter/debt_mark";

    export function counterRemember(world: CombatWorld, victim: CombatActor, source: CombatActor, amount: number): void {
        counterLedger[String(victim.ref())] = { amount: amount, tick: world.tick(), source: String(source.ref()) };
        var refs = Object.keys(counterLedger);
        if (refs.length > 512) {
            var now = world.tick();
            for (var i = 0; i < refs.length; i++) if (now - counterLedger[refs[i]].tick > 1200) delete counterLedger[refs[i]];
        }
    }
    export function counterConsume(world: CombatWorld | null, actor: CombatActor): void {
        delete counterLedger[String(actor.ref())];
        if (world !== null && world.valid(actor)) {
            var marks = world.effects(actor, counterDebtMark);
            for (var i = 0; i < marks.length; i++) world.operation(marks[i].id(), "world_combat:dispel", "{}");
        }
    }
    /**
     * 账本窗口随「持有账的那只宝可梦」求值。伤害事件/托管效果的作用域 source 未必是这只宝可梦，
     * 因此显式给出 pokemon/world/actor 的上下文，而不是直接把 world 交给 p（那会去读 world.source()）。
     */
    function counterWindowFor(world: CombatWorld, actor: CombatActor): number {
        if (!world.valid(actor) || String(actor.domain()) !== "cobblemon") return p(counterId, "window");
        return p(counterId, "window", <ParameterSource>{ world: world, actor: actor, pokemon: CobblemonCombat.pokemon(actor) });
    }
    /** Ticks left before this actor's physical debt goes stale; 0 when there is none. */
    export function counterRemaining(world: CombatWorld, actor: CombatActor): number {
        if (!world.valid(actor)) return 0;
        var record = counterLedger[String(actor.ref())];
        if (!record) return 0;
        return Math.max(1, counterWindowFor(world, actor) - (world.tick() - record.tick));
    }
    /** The fresh physical debt on this actor, or null; the window is the move's own parameter. */
    export function counterRecord(world: CombatWorld | null, actor: CombatActor | null): CounterRecord | null {
        if (!world || !actor || !world.valid(actor)) return null;
        var record = counterLedger[String(actor.ref())];
        if (!record || !(record.amount > 0)) return null;
        return world.tick() - record.tick <= counterWindowFor(world, actor) ? record : null;
    }
    /**
     * 台账载体的巡检：把「身上的短裂纹」绑在这个托管效果上（世界反馈随效果清理），记录一旦消耗或过期就收掉载体。
     * 裂纹的疏密由账上的实际伤害量驱动。
     */
    function counterDebtWatch(effect: CombatEffect): void {
        var world = effect.world(), target = effect.target();
        var body = world.valid(target) ? world.observe(target) : null;
        if (body === null) { effect.end(); return; }
        var record = counterRecord(world, target);
        if (record === null) { effect.end(); return; }
        WorldFeedback.onEffect(world, effect.id(), "crack", counterScene, 1, body.position(),
            { moment: "crack", target: String(target.ref()), gather: Math.round(10 + Math.min(64, record.amount * 0.5)) });
        effect.remaining(counterRemaining(world, target));
        effect.schedule("watch", "watch", 8, "{}");
    }
    WorldCombat.effect(counterDebtMark, 1, 2400, "actor", function (json) {
        var value = JSON.parse(json || "{}");
        if (value === null || typeof value !== "object") throw new Error("Invalid counter debt mark");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(counterDebtMark, "start", counterDebtWatch);
    WorldCombat.effectHandler(counterDebtMark, "watch", counterDebtWatch);
    WorldCombat.effectHandler(counterDebtMark, "operation:world_combat:dispel", function (effect) { effect.end(); });
    /** Fixed-damage settlement shared by the family: typing decides immunity, armour is the only mitigation. */
    export function counterRawHit(action: CombatAction, target: CombatActor, amount: number, contact: boolean): boolean {
        var world = action.world();
        if (!world.valid(target) || world.friendly(target) || !(amount > 0)) return false;
        var move = CobblemonCombat.moveTemplate(counterId), type = String(move.type());
        var facts = PokemonDamage.combatants.read(world, target);
        for (var index = 0; index < facts.types.length; index++)
            if (CobblemonCombat.typeEffectiveness(type, facts.types[index]) === 0) {
                PokemonDamage.immune(world, target, JSON.stringify({ kind: "move", move: counterId, type: type }));
                return false;
            }
        var armor = world.attributeValue(target, "minecraft:generic.armor");
        var toughness = world.attributeValue(target, "minecraft:generic.armor_toughness");
        var metadata: any = { kind: "move", move: counterId, type: type, category: String(move.category()), contact: contact,
            knockback: false, bypassCooldown: true, targetScale: 1, critical: false, action: action.id() };
        if (armor !== null) metadata.armorExcluded = armor.value();
        if (toughness !== null) metadata.toughnessExcluded = toughness.value();
        return world.hurt(target, amount, JSON.stringify(metadata));
    }

    WorldCombat.on("world_combat:move_counter/ledger", "world_combat:damage_applied", "", function (event: CombatWorldEvent) {
        var victim = event.target();
        if (victim === null) return;
        var world = event.world();
        if (!world.valid(victim)) return;
        var data = JSON.parse(String(event.data()));
        if (!(data.actual > 0)) return;
        if (DamageSemantics.read(data).category !== "physical") return;
        var source = event.actor();
        if (source !== null && String(source.key()) === String(victim.key())) return;
        counterRemember(world, victim, source, data.actual);
        // 只给真正会这招的宝可梦留身上的记账短裂纹，避免给全世界每一次物理挨打都造载体。
        if (String(victim.domain()) === "cobblemon" && CobblemonCombat.pokemon(victim).canAccessMove(counterId)
            && world.effects(victim, counterDebtMark).length === 0) {
            world.effect(counterDebtMark, victim, "{}", Math.max(1, Math.round(counterWindowFor(world, victim))));
        }
    });

    // 返还命中后由真实伤害回执驱动：浮字与碎片量读这次实际扣的血（护甲、免疫、Boss 规则之后的结果），
    // 不再把计划中的 refund 当作实际返还报出来。
    WorldCombat.on("world_combat:move_counter/strike", "world_combat:damage_applied", "", function (event: CombatWorldEvent) {
        var data = JSON.parse(String(event.data()));
        if (!(data.actual > 0)) return;
        var action = event.action();
        var owned = action !== null && String(action.content()) === "world_combat:counter";
        if (String(data.move || "") !== counterId && !owned) return;
        var target = event.target();
        if (target === null) return;
        var world = event.world();
        var body = world.valid(target) ? world.observe(target) : null;
        var point = typeof data.x === "number" && typeof data.y === "number" && typeof data.z === "number"
            ? WorldCombat.point(data.x, data.y, data.z) : body === null ? null : body.position();
        if (point === null) return;
        var scale = 1;
        if (action !== null) {
            var raw = action.data("counter/strike");
            if (raw !== null) {
                try { var payload = JSON.parse(raw); if (payload.scale > 0 && isFinite(payload.scale)) scale = payload.scale; } catch (error) { /* keep the default */ }
            }
        }
        var actual = Math.round(data.actual);
        WorldFeedback.emit(world, counterScene, 1, point,
            { moment: "strike", target: String(target.ref()), count: Math.round(14 + data.actual / 2), scale: scale,
                power: Math.round(data.actual * 10) / 10 }, 30);
        WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.1, 0)), counterHitText, [actual], 26);
    });

    defineFacts(counterId, function (context: FactContext): Formula.Facts {
        return { read: function (id: string): Formula.Fact {
            if (id === "counter.stored") {
                if (!context.world || !context.actor || !context.world.valid(context.actor)) return undefined;
                var record = counterRecord(context.world, context.actor);
                return record ? record.amount : 0;
            }
            if (id === "counter.cap") {
                if (!context.world || !context.actor || !context.world.valid(context.actor)) return undefined;
                var body = context.world.observe(context.actor);
                return body === null ? undefined : body.maxHealth() * p(counterId, "capFraction", context.world);
            }
            return undefined;
        } };
    });

    actionParameters.define(counterId, {
        /** 返还伤害 = min(账上物理伤害 × 2, 最大生命 × 返还上限)。 */
        refund: formula(
            F.var("counter.stored", text("worldcombat.skill.counter.value.stored"))
                .times(F.const(2).as(text("worldcombat.skill.counter.value.double")))
                .min(F.var("counter.cap", text("worldcombat.skill.counter.value.cap"))).round(0),
            "返还伤害", {
                unit: "点",
                description: "把账本上的物理伤害以两倍还回去，最多不超过自身最大生命的一个比例。没有账可讨时这一记落空。"
            }),
        /** 返还上限比例：0.3 +（防御 − 50）× 0.002，夹 0.2..0.6。 */
        capFraction: percent(
            F.const(0.3).plus(F.stat("defence").minus(50).times(0.002).clamp(-0.1, 0.3)).clamp(0.2, 0.6).round(3),
            "返还上限", "返还额最多等于自身最大生命的这个比例；防御越高，身板越能扛住并还得多。"),
        /** 记账窗口：40 刻 − 速度偏移[−8,12] + 沉势 20 刻；夹 26..72 刻。 */
        window: seconds(
            F.const(40).minus(F.stat("speed").minus(55).times(0.2).clamp(-8, 12))
                .plus(F.when(F.pref("deepbreath", text("worldcombat.skill.counter.preference.deepbreath")), F.const(20), F.const(0)))
                .clamp(26, 72).round(0),
            "记账窗口", "最近这段时间内挨的物理打才会被算进这次返还；速度快的个体只认眼前的账，沉势式愿意多留一会儿。"),
        /** 迎击距离：2.6 格 + 速度偏移[−0.5,1.4] + 等级偏移[0,1.0]；夹 2..4.6。 */
        dash: formula(
            F.base(2.6).plus(F.stat("speed").minus(55).times(0.014).clamp(-0.5, 1.4))
                .plus(F.level().minus(25).times(0.03).clamp(0, 1.0)).clamp(2, 4.6).round(2),
            "迎击距离", { unit: "格", description: "迎上前打出的最大距离，也是本招的实际射程来源；腿快的个体够得到更远的目标。" }),
        /** 每刻位移：0.7 格/刻 + 速度偏移[−0.12,0.35]；夹 0.5..1.3。 */
        speed: formula(
            F.base(0.7).plus(F.stat("speed").minus(55).times(0.0035).clamp(-0.12, 0.35)).clamp(0.5, 1.3).round(2),
            "迎击速度", { unit: "格/刻", description: "冲上去每刻移动的距离；越快越能在对手再次出手前把这一记打出去。" }),
        /** 判定半径：0.42 格 + 体型高度偏移[−0.08,0.28]；夹 0.35..0.7。 */
        collisionRadius: formula(
            F.base(0.42).plus(F.body("height").minus(1.4).times(0.09).clamp(-0.08, 0.28)).clamp(0.35, 0.7).round(2),
            "判定半径", { unit: "格", description: "回击能咬住多大一圈；身板大的个体出手更宽。" }),
        /** 击退：0.35 格 + 物攻偏移[−0.08,0.4]；夹 0.25..0.8。 */
        push: formula(
            F.base(0.35).plus(F.stat("attack").minus(60).times(0.005).clamp(-0.08, 0.4)).clamp(0.25, 0.8).round(2),
            "击退", { unit: "格", description: "命中后把目标顶开的距离；物攻高的个体把对手推得更远。" }),
        /** 起手：4 刻 − 速度偏移[−1,2] + 沉势 3 刻；夹 3..9。 */
        grit: seconds(
            F.base(4).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2))
                .plus(F.when(F.pref("deepbreath", text("worldcombat.skill.counter.preference.deepbreath")), F.const(3), F.const(0))).clamp(3, 9).round(0),
            "起手", "从收势到出手之间的时间；速度快的个体更快打出，沉势式先沉住气。"),
        /** 收招：7 刻；打完站定。 */
        settle: seconds(F.base(7).clamp(4, 12).round(0), "收招", "回击结束后收住的时间。"),
        /** 冷却：30 刻 − 速度偏移[−4,6] + 沉势 6 刻；夹 20..44。 */
        recharge: seconds(
            F.base(30).minus(F.stat("speed").minus(55).times(0.12).clamp(-4, 6))
                .plus(F.when(F.pref("deepbreath", text("worldcombat.skill.counter.preference.deepbreath")), F.const(6), F.const(0))).clamp(20, 44).round(0),
            "冷却", "这一次回击之后多久能再攒起一次；速度快的个体回得更快，沉势式更费。"),
        traceAhead: hidden(1.2),
        minimumMove: hidden(0.05)
    });

    stages(counterId, [
        { level: 30, values: { capFraction: 0.4 } },
        { level: 50, values: { capFraction: 0.5, window: 48 } }
    ]);

    describe(counterId, [
        { key: "description.0", values: ["refund","window"] },
        { key: "description.1", values: ["dash","speed","collisionRadius","push","capFraction"] },
        { key: "deepbreath.on", values: [], when: function (context) { return read(context.detail.values, ["deepbreath"]) === true; } },
        { key: "deepbreath.off", values: [], when: function (context) { return read(context.detail.values, ["deepbreath"]) !== true; } },
        { key: "timing", values: ["range", "grit", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.capFraction"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.capFraction", "tier.1.window"] }
    ]);
}
