/**
 * 连斩 / furycutter 的参数与数值来源。
 *
 * 原生事实：Bug／物理／威力 40／命中 95／PP 20／接触／slicing；连续命中时威力按 40→80→160 翻倍
 * （最多 ×4），落空或换招就归零（Cobblemon 1.8，163 位学习者）。
 *
 * 翻译：把「连续命中就翻倍」落成「刀数翻倍」——一次连斩挥出 `cuts` 刀，每刀结算一次 `bite`，
 * 连斩层数 0／1／2 对应 1／2／4 刀。这样总伤害正好按原生翻倍，而画面里的刀数与判定段数一致：
 * 玩家看得见自己挥了几刀，也就知道自己攒到第几层了。
 *
 * 连斩层数是真实 MobEffect `world_combat:furycutter_momentum`（共享身份 world_combat:status/furycutter，
 * 振幅即层数）。落空即清空；任何别的招式提交也会打断它；只要在 `window` 内继续连斩，层数就往上走。
 * 选取为 `kind: "aim"`：可锁定实体，也可朝方向空挥；每一趟的方向在提交时锁定，整趟刀数沿一个方向走，
 * 对手绕到身后就能躲开这一趟剩下的刀。
 * `cuts` 参数用 F.state("furycutter") 直接读这份身份——详情页里玩家读到的段数就是场上真正结算的刀数。
 *
 * 数值分散（每个参数读不同的个体数据）：
 *   bite      每刀威力：物攻定每一下的深度。
 *   cuts      连斩段数：由连斩层数决定（1 × 2^层，封顶 4），是本招的核心机制值。
 *   reach     挥刀距离：速度定贴上去的短距，也是实际射程。
 *   window    连斩窗口：等级定层数能维持多久不散。
 *   gap       刀间隔：速度定两刀之间的空档，快的打得更密。
 *   blade     刀面半宽：碰撞箱宽度定刃面有多宽。
 *   step      贴身一步：速度定挥刀时向前垫的步。
 *   tempo／aftercast／recharge：速度定节奏，sustain 以更长间隔换更长的窗口。
 *
 * 配置 sustain 双向取舍（默认关）：
 *   开（穷追）：连斩窗口 +30 刻、贴身步幅更大，代价是刀间隔 +1、起手 +1、收招 +2、冷却 +5。
 *   关（速收）：收招与冷却更短、刀更密，代价是层数散得更快、贴身步更短。
 */
namespace PokemonSkills {
    export const furycutterId = "furycutter";
    export const furycutterScene = "world_combat:move_furycutter";
    export const furycutterMomentum = "world_combat:furycutter_momentum";
    export const furycutterStreak = "world_combat:status/furycutter";
    export const furycutterRiseText = "world_combat.move.furycutter.text.rise";
    export const furycutterMissText = "world_combat.move.furycutter.text.miss";
    /** 表现里一刀的参考半宽（格）；服务端传 scale = 实际半宽 / 这个值。 */
    export const furycutterReference = 0.45;

    /** 当前连斩层数 0..2，只认本单元注册的连斩载体。 */
    export function furycutterStage(world: CombatWorld, actor: CombatActor): number {
        const effect = MobEffects.read(world, actor, furycutterMomentum);
        return effect === null ? 0 : Math.max(0, Math.min(2, effect.amplifier()));
    }

    // 共享身份 state.furycutter：公式与详情都能读到此刻的连斩层数，读的是同一个真实 MobEffect。
    defineFacts(furycutterId, function (context) {
        return { read: function (id) {
            if (id !== "state.furycutter") return undefined;
            if (!context.world || !context.actor || !context.world.valid(context.actor)) return undefined;
            return furycutterStage(context.world, context.actor);
        } };
    });

    actionParameters.define(furycutterId, {
        /** 每刀威力：基础 38，物攻每比 55 多 1 加 0.12，夹在 28..80。 */
        bite: formula(
            F.base(38).plus(F.stat("attack").minus(55).times(0.12).clamp(-10, 24)).clamp(28, 80).round(1),
            "每刀威力", {
                unit: "威力",
                description: "连斩中每一刀的接触威力；物攻越高每一下咬得越深。对手防御、相性与暴击在命中时另算。"
            }),
        /** 段数：1 × 2^连斩层数，夹在 1..4；层数 0／1／2 对应 1／2／4 刀。 */
        cuts: formula(
            F.base(1).times(F.const(2).pow(F.state("furycutter"))).clamp(1, 4).round(0),
            "连斩段数", {
                unit: "刀",
                description: "这一趟挥出几刀；每接续一次连斩，段数翻倍（1→2→4），刀数与场上真正结算的次数一致。"
            }),
        /** 挥刀距离：基础 2.5 格，速度每比 55 快 1 加 0.008，身高每比 1.4 高 1 加 0.05，夹 2.2..2.9。 */
        reach: formula(
            F.base(2.5).plus(F.stat("speed").minus(55).times(0.008)).plus(F.body("height").minus(1.4).times(0.05))
                .clamp(2.2, 2.9).round(2),
            "挥刀距离", {
                unit: "格",
                description: "每一刀够到多远；速度与身高决定贴上去的短距，它也是本招的实际射程。"
            }),
        /** 连斩窗口：基础 60 刻，等级每比 20 高 1 加 1.2，穷追再 +30，夹 40..160。 */
        window: seconds(
            F.base(60).plus(F.level().minus(20).times(1.2)).plus(F.when(F.pref("sustain"), F.const(30), F.const(0)))
                .clamp(40, 160).round(0),
            "连斩窗口", "层数在这段时间内不被落空或其他招式打断就会保留；等级越高维持越久。"),
        /** 刀间隔：基础 5 刻，速度每比 55 快 1 减 0.03，穷追 +1，夹 3..8。 */
        gap: formula(
            F.base(5).minus(F.stat("speed").minus(55).times(0.03)).plus(F.when(F.pref("sustain"), F.const(1), F.const(0)))
                .clamp(3, 8).round(0),
            "刀间隔", {
                unit: "刻",
                description: "一趟连斩里两刀之间的空档；速度越快刀越密，穷追形态会略放慢。"
            }),
        /** 刀面半宽：基础 0.45 格，碰撞箱每比 0.9 宽 1 加 0.3，夹 0.35..0.8。 */
        blade: formula(
            F.base(0.45).plus(F.body("width").minus(0.9).times(0.3)).clamp(0.35, 0.8).round(2),
            "刀面半宽", {
                unit: "格",
                description: "每一刀的横向覆盖半宽；身体越宽的个体刃面越宽。"
            }),
        /** 贴身一步：基础 1.0 格，速度每比 55 快 1 加 0.006，穷追 ×1.15 并入，夹 0.7..1.6。 */
        step: formula(
            F.base(1.0).plus(F.stat("speed").minus(55).times(0.006))
                .times(F.when(F.pref("sustain"), F.const(1.15), F.const(1))).clamp(0.7, 1.6).round(2),
            "贴身一步", {
                unit: "格",
                description: "挥刀时向前垫的一小步；速度快的个体贴得更紧，穷追形态再向前一步。"
            }),
        /** 起手：基础 5 刻，速度每比 55 快 1 减 0.02，穷追 +1，夹 3..9。 */
        tempo: seconds(
            F.base(5).minus(F.stat("speed").minus(55).times(0.02)).plus(F.when(F.pref("sustain"), F.const(1), F.const(0)))
                .clamp(3, 9).round(0),
            "起手", "抬刀到第一刀落下的时间；速度越快越短。"),
        /** 收招：基础 4 刻，速度项，穷追 +2／速收 −1，夹 3..8。 */
        aftercast: seconds(
            F.base(4).minus(F.stat("speed").minus(55).times(0.01))
                .plus(F.when(F.pref("sustain"), F.const(2), F.const(-1))).clamp(3, 8).round(0),
            "收招", "整套连斩收势的时间；速收形态更短。"),
        /** 冷却：基础 22 刻，速度每比 55 快 1 减 0.04，穷追 +5／速收 −5，夹 12..34。 */
        recharge: seconds(
            F.base(22).minus(F.stat("speed").minus(55).times(0.04))
                .plus(F.when(F.pref("sustain"), F.const(5), F.const(-5))).clamp(12, 34).round(0),
            "冷却", "下一趟连斩前的等待；穷追形态更长，速收形态更短。")
    });

    defineDamage(furycutterId, "bite", {}, { contact: true, slice: true });

    stages(furycutterId, [
        { level: 24, values: { bite: 46 } },
        { level: 44, values: { reach: 2.72 } }
    ]);

    describe(furycutterId, [
        { key: "description.0", values: ["bite"] },
        { key: "description.1", values: ["cuts"] },
        { key: "description.2", values: ["window"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.bite"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.reach"] }
    ]);
}
