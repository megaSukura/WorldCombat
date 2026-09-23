/**
 * 盐水 / brine —— 参数、伤害段与盐池。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Water／特殊／威力 65／命中 100／PP 10／单体；「当对手的 HP 负伤到
 *   一半左右时，招式威力会变成 2 倍」。
 *
 * 翻译：把「盐水」落成一束**高压盐卤**——施法者把盐水从口／掌中压成一条细流射向目标，命中处炸开白花，
 *   在地上留下一摊渗进石缝的咸水。打在完好的身上只是冲一记；打在半血或更少的伤口上，盐钻进伤口，
 *   威力翻倍、目标被浇得湿透，那一记的画面也更亮更狠。读完的是**目标此刻的血**，落在谁身上按谁算。
 *   与同族分开：热水抛的是会烫伤人的沸水并留下烫池；喷水是一圈推人的潮墙；盐水是一条锁人的细流，
 *   并且只对「已经伤到一半以下」的目标翻倍——它惩罚残血，不制造残血。
 *
 * 数据分散（每个参数读不同的精灵数据）：
 *   jet         盐卤威力：特攻定压力；目标血量 ≤ 一半时 ×2；高压式再 ×1.15；夹 42..190。
 *   reach       射程：特攻越高射得越远，高压式更远。
 *   globSpeed   出流速度：速度决定盐卤离手多急。
 *   nozzle      判定半径：体型高度决定这条细流多粗。
 *   slickRadius 盐池半径：特攻与体型；高压式把水柱收细，池子更小。
 *   slickTicks  盐池持续：等级与特攻；高压式更短、泼洒式更久。
 *   soakTicks   直击湿身时长：等级越高留得越久（借共享身份 soaked，别的招式也能读到「湿」）。
 *   drops       水滴数：特攻换算，驱动表现密度。
 *   tempo／settle／recharge：速度定节奏；高压式更慢、更费。
 *
 * 配置 `press`（高压式）双向取舍：开＝威力 ×1.15、射程 ×1.15，但盐池半径 ×0.72、持续 ×0.75、起手 +2、冷却 +4；
 *   关（泼洒式，默认）＝池子更大更久、更快更省，但威力 ×0.92。点杀残血 vs 封住一块湿地，各有局面。
 *
 * 伤害段 `jet`：目标血量 ≤ 一半时的 ×2 在命中时按**每个目标自己**的血量重算（见 defineDamage 的 resolve）。
 */
namespace PokemonSkills {
    export const brineId = "brine";
    export const brineScene = "world_combat:move_brine";
    export const brineField = "world_combat:field/brine";
    export const brineSoaked = "world_combat:brine_soaked";
    export const brineWoundedText = "world_combat.move.brine.text.wounded";
    export const brineSoakText = "world_combat.move.brine.text.soak";
    export const brineMissText = "world_combat.move.brine.text.miss";
    /** 盐池参考半径（格）：服务端传 scale = 实际半径 / 这个值。 */
    export const brineReference = 1.7;

    /** 目标血量是否已知且 ≤ 一半：未知读作假，预览里不会误翻倍。 */
    export function brineWoundedNode(): Formula.Node {
        const ratio = F.target("actor.healthRatio", text("worldcombat.skill.brine.value.hpRatio"));
        return ratio.gt(0).times(ratio.lte(0.5));
    }
    /** 命中时目标是否残血（结算与表现同源）。 */
    export function brineWoundedNow(world: CombatWorld, actor: CombatActor): boolean {
        const body = world.observe(actor);
        return body !== null && body.maxHealth() > 0 && body.health() <= body.maxHealth() * 0.5 && body.health() > 0;
    }

    /** 一摊渗在地上的盐卤：踏入或停留的非友方被浇上湿透身份（共享身份 soaked，别的招式能读到）。 */
    WorldEffects.fieldRule(brineField, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (world.friendly(actor)) return;
            const body = world.observe(actor);
            if (body === null) return;
            if (CombatStatus.apply(world, actor, "soaked", brineSoaked, Math.max(60, Math.round(Number(field.data.soak) || 140)), 0, { secondary: true, unique: true })) {
                WorldFeedback.emit(world, brineScene, 1, body.position(),
                    { moment: "splash", target: String(actor.ref()), scale: field.radius / brineReference }, 22);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.05, 0)), brineSoakText, [], 22);
            }
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (world.friendly(actor)) return;
            const ref = String(actor.ref()), next = field.data.next || (field.data.next = {});
            if (world.tick() < (next[ref] || 0)) return;
            next[ref] = world.tick() + 60;
            CombatStatus.apply(world, actor, "soaked", brineSoaked, Math.max(60, Math.round(Number(field.data.soak) || 140)), 0, { secondary: true, unique: true });
        }
    });

    actionParameters.define(brineId, {
        /** 盐卤威力：65 + 特攻偏移[−14,30]；目标残血 ×2；高压 ×1.15 / 泼洒 ×0.92；夹 42..190。 */
        jet: formula(
            F.base(65)
                .plus(F.stat("specialAttack").minus(60).times(0.22).clamp(-14, 30))
                .times(F.when(brineWoundedNode(), F.const(2), F.const(1)).as(text("worldcombat.skill.brine.value.wounded")))
                .times(F.when(F.pref("press", text("worldcombat.skill.brine.preference.press")), F.const(1.15), F.const(0.92)))
                .clamp(42, 190).round(1),
            "盐卤威力", {
                unit: "威力",
                description: "盐卤打在身上那一下的威力；特攻越高水压越足。**目标血量在一半或以下时翻倍**——每个人各算各的。对手特防、相性与暴击在命中时另算。"
            }),
        /** 射程：10 + 特攻偏移[−1,3]；高压 ×1.15；夹 8..18。也是实际射程来源。 */
        reach: formula(
            F.base(10).plus(F.stat("specialAttack").minus(60).times(0.03).clamp(-1, 3))
                .times(F.when(F.pref("press", text("worldcombat.skill.brine.preference.press")), F.const(1.15), F.const(1)))
                .clamp(8, 18).round(1),
            "射程", {
                unit: "格",
                description: "盐卤能射到多远，也是本招的实际射程；特攻越高越远，高压式更远。"
            }),
        /** 出流速度：1.15 + 速度偏移[−0.15,0.5]；夹 0.9..1.9。 */
        globSpeed: formula(
            F.base(1.15).plus(F.stat("speed").minus(55).times(0.006).clamp(-0.15, 0.5)).clamp(0.9, 1.9).round(2),
            "出流速度", {
                unit: "格/刻",
                description: "盐卤离手的速度；速度快的个体射得更急，目标越难侧移躲开。"
            }),
        /** 判定半径：0.3 + (高度−1.4)×0.08；夹 0.24..0.6。 */
        nozzle: formula(
            F.base(0.3).plus(F.body("height").minus(1.4).times(0.08).clamp(-0.05, 0.3)).clamp(0.24, 0.6).round(2),
            "判定半径", {
                unit: "格",
                description: "这条细流的碰撞半径；身板越大水柱越粗。"
            }),
        /** 盐池半径：1.7 + 特攻偏移[−0.2,0.6] + 高度偏移[−0.1,0.4]；高压 ×0.72 / 泼洒 ×1.15；夹 1.0..3.2。 */
        slickRadius: formula(
            F.base(1.7)
                .plus(F.stat("specialAttack").minus(60).times(0.008).clamp(-0.2, 0.6))
                .plus(F.body("height").minus(1.4).times(0.2).clamp(-0.1, 0.4))
                .times(F.when(F.pref("press", text("worldcombat.skill.brine.preference.press")), F.const(0.72), F.const(1.15)))
                .clamp(1.0, 3.2).round(2),
            "盐池半径", {
                unit: "格",
                description: "盐水落地渗开多大的一摊；特攻高、体型大的个体摊得更开，高压式把水柱收细、池子更小。"
            }),
        /** 盐池持续：110 + 等级(≥25)偏移[0,50] + 特攻偏移[−15,35]；高压 ×0.75 / 泼洒 ×1.1；夹 60..260。 */
        slickTicks: seconds(
            F.base(110)
                .plus(F.level().minus(25).times(1.4).clamp(0, 50))
                .plus(F.stat("specialAttack").minus(60).times(0.5).clamp(-15, 35))
                .times(F.when(F.pref("press", text("worldcombat.skill.brine.preference.press")), F.const(0.75), F.const(1.1)))
                .clamp(60, 260).round(0),
            "盐池持续", "这摊盐水在地上渗多久；等级与特攻越高留得越久，高压式更短、泼洒式更久。"),
        /** 直击湿身时长：90 + 等级 ×0.8；夹 60..220。 */
        soakTicks: seconds(
            F.base(90).plus(F.level().times(0.8)).clamp(60, 220).round(0),
            "直击湿身时长", "被盐卤直击的目标带着湿透身份多久；等级越高留得越久。它借共享身份 soaked，别的招式也能读到。"),
        /** 水滴数：16 + 特攻偏移[−4,24]；夹 10..52。 */
        drops: formula(
            F.base(16).plus(F.stat("specialAttack").minus(60).times(0.2).clamp(-4, 24)).clamp(10, 52).round(0),
            "水滴数", {
                unit: "滴",
                description: "盐卤炸开时迸出的水滴数量，也驱动画面密度；特攻越高溅得越多。"
            }),
        /** 起手：8 − 速度偏移[−1.5,2] + 高压 2；夹 4..14。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.02).clamp(-1.5, 2))
                .plus(F.when(F.pref("press", text("worldcombat.skill.brine.preference.press")), F.const(2), F.const(0))).clamp(4, 14).round(0),
            "起手", "把盐水压进管路的时间；速度越快越短，高压式多压一会儿。"),
        /** 收招：7 − 速度偏移[−1.2,1.5]；夹 4..11。 */
        settle: seconds(
            F.base(7).minus(F.stat("speed").minus(55).times(0.015).clamp(-1.2, 1.5)).clamp(4, 11).round(0),
            "收招", "喷完后收回的时间；速度快的个体更利落。"),
        /** 冷却：24 − 速度偏移[−3,4] + 高压 4 / 泼洒 −2；夹 16..38。 */
        recharge: seconds(
            F.base(24).minus(F.stat("speed").minus(55).times(0.02).clamp(-3, 4))
                .plus(F.when(F.pref("press", text("worldcombat.skill.brine.preference.press")), F.const(4), F.const(-2))).clamp(16, 38).round(0),
            "冷却", "再压一管盐水前的等待；速度越快回得越快，高压式更费、泼洒式更省。")
    });

    defineDamage(brineId, "jet", { rationale: "高压盐卤专挑伤口，防御穿透略强，让残血与特攻的差别更可见。" }, {
        // 每个人各自结算：命中时用该目标自己的血量重算盐卤威力，翻倍落到**这个人**身上。
        resolve: function (damage: PokemonDamage.FeatureContext) {
            return damage.facts ? { power: actionParameters.rules.formulaValue(brineId + "/jet", damage.facts) } : undefined;
        }
    });

    stages(brineId, [
        { level: 30, values: { jet: 78 } },
        { level: 46, values: { jet: 92, slickRadius: 2.1 } }
    ]);

    describe(brineId, [
        { key: "description.0", values: ["jet"] },
        { key: "description.1", values: ["reach", "globSpeed"] },
        { key: "description.2", values: ["slickRadius", "slickTicks", "soakTicks"] },
        { key: "press.on", values: [], when: function (context) { return read(context.detail.values, ["press"]) === true; } },
        { key: "press.off", values: [], when: function (context) { return read(context.detail.values, ["press"]) !== true; } },
        { key: "timing", values: ["range", "tempo", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.jet"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.jet", "tier.1.slickRadius"] }
    ]);
}
