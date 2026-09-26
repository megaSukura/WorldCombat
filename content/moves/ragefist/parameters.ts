/**
 * 愤怒之拳 / ragefist —— 参数、伤害段与「挨打攒拳」的姿态。
 *
 * 原生事实：Ghost／物理／基础威力 50／命中 100／PP 10／接触／`punch`；威力 = min(350, 50 + 50 × 被攻击次数)
 *   （`timesAttacked`，最多 6 次）（Cobblemon 1.8，2 位学习者）。
 *
 * 翻译：即时战斗里没有「被攻击次数」这个计数器，本实现把它落成**自己身上攒的拳印**——每挨一记外来伤害就
 *   记下一记 `world_combat:status/rage_fist` 的拳印（最多 `cap` 记），出拳时把攒下的每一记都打出去：
 *   **攒了几记，就多甩几记鬼拳**。拳的数量与判定段数一致，玩家看得见自己攒到第几记。
 *   它和愤怒分开：愤怒把挨打转成攻击等级，熄灭于自己下一次出手；愤怒之拳把挨打攒成拳数，拳印在心里留着，
 *   直到缠斗结束才散。它也和连斩分开：连斩靠**连续命中**翻倍，愤怒之拳靠**挨打**攒拳。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   stored    拳印数：身上拳印的层数，夹在本招的 `cap` 以内——本招的核心机制值。
 *   smash     每拳威力：基础 20 + 物攻偏移 + 等级偏移；夹 16..56。对手防御每拳各算一次。
 *   fists     出拳数：1 + 拳印数；夹 1..9。拳数就是真正结算的次数。
 *   reach     出拳距离：基础 2.4 格 + 速度偏移 + 身高偏移；夹 2.2..3.2；也是实际射程来源。
 *   gap       拳间隔：基础 4 刻 − 速度偏移 − 狂暴 1；夹 2..5；快的打得更密。
 *   cap       拳印上限：狂暴 4、积怨 6；一次缠斗里最多攒这么多记。
 *   stance    拳印存续：基础 240 刻 + 等级偏移；夹 160..480；每挨一记就续一次，缠斗结束时自然散去。
 *   push      每拳顶开：基础 0.2 格 + 物攻偏移；夹 0.12..0.4；鬼拳也带一点推力。
 *   plumes    拳印焰数：8 + 拳印数 ×4；夹 8..40；起手与出拳的表现数量。
 *   tempo／settle／recharge：速度定节奏，狂暴起手更快、冷却更短。
 *
 * 配置 `fury`（狂暴）双向取舍：开启＝拳印上限降到 4（最多 5 拳）、但拳间隔 −1、起手 −1、冷却 −5、冷却下限更低——
 *   短促的快拳，适合面对脆皮；关闭（积怨）＝拳印上限 6（最多 7 拳）、节奏按标准——更慢但一记缠斗里的封顶更高，
 *   适合面对血厚的目标。上限与节奏的取舍，两个方向各有局面。
 *
 * 伤害段 `smash`：每一拳随精灵数据变化的那部分；对手防御、相性与暴击在每一拳命中时各结算一次。
 * 属性与分类沿用原生 Ghost／物理，接触与 `punch` 标记写在 defineDamage 上。
 */
namespace PokemonSkills {
    export const ragefistId = "ragefist";
    export const ragefistScene = "world_combat:move_ragefist";
    export const ragefistCharge = "world_combat:rage_fist_charge";
    export const ragefistStrikeText = "world_combat.move.ragefist.text.strike";
    export const ragefistStackText = "world_combat.move.ragefist.text.stack";
    export const ragefistMissText = "world_combat.move.ragefist.text.miss";

    /** 拳印上限：狂暴 4、积怨 6。 */
    export function ragefistCap(config: any): number {
        return config && config.fury === true ? 4 : 6;
    }

    /** 拳印存续：按等级求的时长（刻），与参数 `stance` 同一条规则。 */
    export function ragefistStance(world: CombatWorld, actor: CombatActor): number {
        if (String(actor.domain()) !== "cobblemon") return 240;
        const pokemon = CobblemonCombat.pokemon(actor);
        if (!pokemon) return 240;
        const context: NumberContext = { pokemon: pokemon, skill: skills[ragefistId],
            detail: { values: ragefistConfig(world, actor) }, world: world, actor: actor };
        return Math.max(160, Math.round(p(ragefistId, "stance", context)));
    }

    /** 本招的配置：宝可梦读个体偏好，其他战斗者退回默认。 */
    export function ragefistConfig(world: CombatWorld, actor: CombatActor): any {
        if (String(actor.domain()) !== "cobblemon") return skills[ragefistId].defaults;
        try { return config(world, actor, ragefistId); } catch (error) { return skills[ragefistId].defaults; }
    }

    /** 当前拳印数（按本招的 cap 夹紧）；只认本单元注册的载具。 */
    export function ragefistStored(world: CombatWorld, actor: CombatActor): number {
        const effect = MobEffects.read(world, actor, ragefistCharge);
        if (effect === null) return 0;
        const cap = ragefistCap(ragefistConfig(world, actor));
        return Math.max(0, Math.min(cap, effect.amplifier()));
    }

    /**
     * 本招资格：宝可梦看当前有效配招是否带本招；其他生物看是否已挂上拳印载体（含 0 层）。
     * 资格先于拳印存在，所以普通主体不会因为「还没有 held」而被锁死；未拥有本招者不攒印。
     */
    export function ragefistQualified(world: CombatWorld, actor: CombatActor): boolean {
        if (!world.valid(actor)) return false;
        if (String(actor.domain()) === "cobblemon") return NativeLoadout.hasEquipped(world, actor, ragefistId);
        return MobEffects.read(world, actor, ragefistCharge) !== null;
    }

    /** 给普通主体做一次资格初始化：挂上 0 层拳印载体，之后才从这里攒印。宝可梦由配招本身给出资格。 */
    export function ragefistAuthorize(world: CombatWorld, actor: CombatActor): boolean {
        if (!world.valid(actor) || String(actor.domain()) === "cobblemon") return false;
        if (MobEffects.read(world, actor, ragefistCharge) !== null) return true;
        return MobEffects.apply(world, actor, ragefistCharge, ragefistStance(world, actor), 0) !== null;
    }

    defineFacts(ragefistId, function (context: FactContext): Formula.Facts {
        return { read: function (id: string) {
            if (id !== "ragefist.stored") return undefined;
            if (!context.world || !context.actor || !context.world.valid(context.actor)) return undefined;
            return ragefistStored(context.world, context.actor);
        } };
    });

    actionParameters.define(ragefistId, {
        stored: formula(F.var("ragefist.stored", text("worldcombat.skill.ragefist.value.stored")), "当前拳印", {
            unit: "记", description: "当前实际保留的拳印数，按当前形态上限计；没有现场时显示需要现场确认。"
        }),
        /** 每拳威力：20 + 物攻偏移[−6,16] + 等级偏移[−1.5,4]；夹 16..56。 */
        smash: formula(
            F.base(20)
                .plus(F.stat("attack").minus(60).times(0.16).clamp(-6, 16))
                .plus(F.level().minus(30).times(0.12).clamp(-1.5, 4))
                .clamp(16, 56).round(1),
            "每拳威力", {
                unit: "威力",
                description: "每一记鬼拳的接触威力；物攻给分量、等级给底气。**每一拳的防御、相性与暴击都各算一次**。"
            }),
        /** 出拳数：1 + 拳印数；夹 1..9。 */
        fists: formula(
            F.base(1).plus(F.var("ragefist.stored", text("worldcombat.skill.ragefist.value.stored"))).clamp(1, 9).round(0),
            "出拳数", {
                unit: "拳",
                description: "这一趟甩出几记鬼拳：基础 1 拳，**身上每攒 1 记拳印就多 1 拳**；拳数与场上真正结算的次数一致。"
            }),
        /** 出拳距离：2.4 格 + 速度偏移[−0.3,0.9] + 身高偏移[−0.1,0.35]；夹 2.2..3.2。 */
        reach: formula(
            F.base(2.4).plus(F.stat("speed").minus(55).times(0.012).clamp(-0.3, 0.9))
                .plus(F.body("height").minus(1.4).times(0.12).clamp(-0.1, 0.35)).clamp(2.2, 3.2).round(2),
            "出拳距离", {
                unit: "格",
                description: "每一记鬼拳够到多远，也是本招的实际射程来源；腿快、身板大的个体贴得住。"
            }),
        /** 拳间隔：4 刻 − 速度偏移[−0.5,1] − 狂暴 1；夹 2..5。 */
        gap: formula(
            F.base(4).minus(F.stat("speed").minus(55).times(0.02).clamp(-0.5, 1))
                .minus(F.when(F.pref("fury", text("worldcombat.skill.ragefist.preference.fury")), F.const(1), F.const(0)))
                .clamp(2, 5).round(0),
            "拳间隔", {
                unit: "刻",
                description: "两记鬼拳之间的空档；速度越快越密，狂暴式再紧一拍。"
            }),
        /** 判定半径：0.4 格 + 身高偏移[−0.08,0.25]；夹 0.32..0.7。 */
        radius: formula(
            F.base(0.4).plus(F.body("height").minus(1.4).times(0.1).clamp(-0.08, 0.25)).clamp(0.32, 0.7).round(2),
            "判定半径", {
                unit: "格",
                description: "每一记鬼拳能扫到多大一圈；身板大的个体拳面更宽。"
            }),
        /** 拳印上限：狂暴 4 / 积怨 6。 */
        cap: formula(
            F.when(F.pref("fury", text("worldcombat.skill.ragefist.preference.fury")), F.const(4), F.const(6)).clamp(2, 6).floor(),
            "拳印上限", { unit: "记", description: "一次缠斗里最多攒几记拳印；到顶后继续挨打只续时间、不再加拳。" }),
        /** 拳印存续：240 刻 +（等级 − 30）×8（封顶 +240）；夹 160..480。 */
        stance: seconds(
            F.base(240).plus(F.level().minus(30).times(8).clamp(0, 240)).clamp(160, 480).round(0),
            "拳印存续", "每挨一记就续一次的时间；停手不被打这么久，拳印才散去。等级高的个体记得更久。"),
        /** 每拳顶开：0.2 格 + 物攻偏移[−0.05,0.15]；夹 0.12..0.4。 */
        push: formula(
            F.base(0.2).plus(F.stat("attack").minus(60).times(0.003).clamp(-0.05, 0.15)).clamp(0.12, 0.4).round(2),
            "每拳顶开", {
                unit: "格",
                description: "每一记鬼拳把目标顶开多远；拳多时累起来也能把人推出一步。"
            }),
        /** 拳印焰数：8 + 拳印数 ×4；夹 8..40。 */
        plumes: formula(
            F.base(8).plus(F.var("ragefist.stored", text("worldcombat.skill.ragefist.value.stored")).times(4)).clamp(8, 40).round(0),
            "拳印焰数", {
                unit: "道",
                description: "起手时绕拳聚起、出拳时随拳飞出的怒气光数；拳印越多越密，画面里的光和这里的数一致。"
            }),
        /** 起手：4 刻 − 速度偏移[−0.5,1] − 狂暴 1；夹 2..7。 */
        tempo: seconds(
            F.base(4).minus(F.stat("speed").minus(55).times(0.01).clamp(-0.5, 1))
                .minus(F.when(F.pref("fury", text("worldcombat.skill.ragefist.preference.fury")), F.const(1), F.const(0)))
                .clamp(2, 7).round(0),
            "起手", "从握拳到第一记鬼拳甩出的时间；速度越快越急，狂暴式抢得更快。"),
        /** 收招：7 刻 − 速度偏移[−1,1.5]；夹 5..10。 */
        settle: seconds(
            F.base(7).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 1.5)).clamp(5, 10).round(0),
            "收招", "一整串鬼拳收势的时间。"),
        /** 冷却：20 − 速度偏移[−3,4] − 狂暴 5；夹 10..32。 */
        recharge: seconds(
            F.base(20).minus(F.stat("speed").minus(55).times(0.08).clamp(-3, 4))
                .minus(F.when(F.pref("fury", text("worldcombat.skill.ragefist.preference.fury")), F.const(5), F.const(0)))
                .clamp(10, 32).round(0),
            "冷却", "这一串拳之后多久能再甩；速度快的个体回得更快，狂暴式冷却明显更短。")
    });

    defineDamage(ragefistId, "smash", {}, { contact: true, punch: true });

    stages(ragefistId, [
        { level: 30, values: { smash: 26, stance: 300 } },
        { level: 46, values: { smash: 34, stance: 360, plumes: 16 } }
    ]);

    describe(ragefistId, [
        { key: "description.0", values: ["smash","stored"] },
        { key: "description.1", values: ["fists","gap"] },
        { key: "description.2", values: ["reach", "radius", "push", "stance"] },
        { key: "description.3", values: ["cap"] },
        { key: "fury.on", values: [], when: function (context) { return read(context.detail.values, ["fury"]) === true; } },
        { key: "fury.off", values: [], when: function (context) { return read(context.detail.values, ["fury"]) !== true; } },
        { key: "timing", values: ["range", "tempo", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.smash", "tier.0.stance"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.smash", "tier.1.stance"] }
    ]);
}
