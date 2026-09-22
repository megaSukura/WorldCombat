/**
 * 愤怒 / rage —— 参数、伤害段与「挨打变强」的姿态。
 *
 * 原生事实：一般／物理／威力 20／命中 100／PP 20／优先度 0／接触；使用时给自己挂上 rage 状态，
 *   此后每被一记非变化招式打中，攻击 +1；这个状态会在自己下次出手前消失（Cobblemon 1.8，204 位学习者）。
 *
 * 翻译：即时战斗里没有回合，本招把「使出招式后受到攻击就涨攻击」翻成一段**红炉般的姿态**：先抡出一记很轻的
 *   怒气一击，同时给自己点起共享身份 `world_combat:status/rage` 的怒火；火在的这段时间里，每挨一记外来伤害
 *   就把攻击烧旺一档（可自行配置每记几档、最多几档）；等自己下一次出手，火就熄了——所以正确用法是
 *   「开着火让对方打，再趁涨起来的攻击出手」。姿态期间每 10 刻冒一次低密度火光，让人一眼看出「还烧着」。
 *
 * 数据分散（每项依赖不同精灵数据）：
 *   tantrum     怒气一击威力 = 24 + 物攻偏移 + 等级偏移；暴怒式 ×0.9；夹 12..60。
 *   blink       欺身距离 = 2.0 + 速度偏移 + 等级偏移；夹 1.8..4.0；也是射程来源。
 *   speed       每刻位移随速度。
 *   collisionRadius 判定半径随身高。
 *   push        顶开距离随物攻。
 *   rageTicks   怒火持续随等级；暴怒式更短；夹 3..12 秒。
 *   perHit      每挨一记涨几档攻击（暴怒式 2 / 蓄怒式 1）。
 *   rageCap     一次姿态最多涨几档（暴怒式 4 / 蓄怒式 6）。
 *   tempo／settle／recharge 速度决定起手、收招、冷却；暴怒式起手更慢、冷却更久。
 *
 * 配置 `fury`（暴怒式）双向取舍：开启＝每挨一记涨 2 档、但封顶更低（4）、火更短、起手慢 2 刻、冷却多 4 刻——
 *   两记就烧满，窗口也短；关闭＝每记 1 档、封顶 6、火更长、出手更快，靠时间慢慢烧旺。快与久，各有用处。
 *
 * 伤害段 `tantrum` 与参数同名，走共享换算；接触标记写在 defineDamage 上。
 */
namespace PokemonSkills {
    export const rageId = "rage";
    export const rageScene = "world_combat:move_rage";
    export const rageEffect = "world_combat:rage_stance";

    interface RageProfile { perHit: number; cap: number; ticks: number; }
    var rageProfiles: { [ref: string]: RageProfile } = Object.create(null);
    /** 这一次姿态里已经烧旺了几档；换姿态时清零。 */
    var rageFed: { [ref: string]: number } = Object.create(null);

    /** 点起怒火：记下这一次的涨档节奏、封顶与时长。 */
    export function rageIgnite(actor: CombatActor, perHit: number, cap: number, ticks: number): void {
        var ref = String(actor.ref());
        rageProfiles[ref] = { perHit: Math.max(1, Math.round(perHit)), cap: Math.max(1, Math.round(cap)), ticks: Math.max(1, Math.round(ticks)) };
        rageFed[ref] = 0;
    }

    /** 又挨了一记：把火再续一段（到顶后不再续）。 */
    export function rageRefresh(world: CombatWorld, actor: CombatActor): void {
        var profile = rageProfiles[String(actor.ref())];
        if (profile && world.valid(actor)) world.marker(actor, rageEffect, profile.ticks, 0);
    }

    /** 挨了一记：在封顶以内涨档，返回实际涨了几档（0 表示已到顶）。 */
    export function rageStoke(world: CombatWorld, actor: CombatActor): number {
        var ref = String(actor.ref()), profile = rageProfiles[ref];
        if (!profile || !world.valid(actor)) return 0;
        var fed = rageFed[ref] || 0;
        if (fed >= profile.cap) return 0;
        var gain = Math.min(profile.perHit, profile.cap - fed);
        NativeEffects.boost(world, actor, "atk", gain);
        rageFed[ref] = fed + gain;
        return gain;
    }

    /** 这一次姿态里已经涨了几档（供表现读出「烧到多旺」）。 */
    export function rageFedCount(actor: CombatActor): number { return rageFed[String(actor.ref())] || 0; }

    /** 姿态结束时忘掉这次的火。 */
    export function rageClear(actor: CombatActor): void { delete rageProfiles[String(actor.ref())]; delete rageFed[String(actor.ref())]; }

    actionParameters.define(rageId, {
        /** 怒气一击威力：24 +（物攻 − 60）× 0.24 [−9,26] +（等级 − 30）× 0.2 [−2,7]；暴怒 ×0.9；夹 12..60。 */
        tantrum: formula(
            F.base(24)
                .plus(F.stat("attack").minus(60).times(0.24).clamp(-9, 26))
                .plus(F.level().minus(30).times(0.2).clamp(-2, 7))
                .times(F.when(F.pref("fury", text("worldcombat.skill.rage.preference.fury")), F.const(0.9), F.const(1)))
                .clamp(12, 60).round(1),
            "怒气一击", {
                unit: "威力",
                description: "这一记挥击的威力；物攻给份量、等级给底气。暴怒式把力气留给怒火，本身拍得更轻。对手防御、相性与暴击在命中时另算。"
            }),
        /** 欺身距离：2.0 +（速度 − 55）× 0.018 [−0.35,1.0] +（等级 − 30）× 0.02 [0,0.6]；夹 1.8..4.0。 */
        blink: formula(
            F.base(2.0).plus(F.stat("speed").minus(55).times(0.018).clamp(-0.35, 1.0))
                .plus(F.level().minus(30).times(0.02).clamp(0, 0.6)).clamp(1.8, 4.0).round(2),
            "欺身距离", {
                unit: "格",
                description: "朝目标踏出的最大距离，也是本招的实际射程来源；腿快的个体够得更远。"
            }),
        /** 每刻位移：0.82 +（速度 − 55）× 0.005 [−0.12,0.32]；夹 0.6..1.4。 */
        speed: formula(
            F.base(0.82).plus(F.stat("speed").minus(55).times(0.005).clamp(-0.12, 0.32)).clamp(0.6, 1.4).round(2),
            "欺身速度", { unit: "格/刻", description: "踏上去每刻移动的距离；越快越容易在对方下一次挥空时补上。" }),
        /** 判定半径：0.42 +（身高 − 1.4）× 0.1 [−0.08,0.26]；夹 0.34..0.74。 */
        collisionRadius: formula(
            F.base(0.42).plus(F.body("height").minus(1.4).times(0.1).clamp(-0.08, 0.26)).clamp(0.34, 0.74).round(2),
            "判定半径", { unit: "格", description: "怒气挥击能扫到多大一圈；身板大的个体抡得更开。" }),
        /** 顶开距离：0.3 +（物攻 − 60）× 0.003 [−0.06,0.22]；夹 0.15..0.55。 */
        push: formula(
            F.base(0.3).plus(F.stat("attack").minus(60).times(0.003).clamp(-0.06, 0.22)).clamp(0.15, 0.55).round(2),
            "顶开距离", { unit: "格", description: "命中后把人推开一点的距离；本招以开火为主，推得不多。" }),
        /** 怒火持续：6 秒 +（等级 − 30）× 0.08 [0,3]；暴怒 ×0.65；夹 3..12 秒。 */
        rageTicks: seconds(
            F.base(6).plus(F.level().minus(30).times(0.08).clamp(0, 3))
                .times(F.when(F.pref("fury", text("worldcombat.skill.rage.preference.fury")), F.const(0.65), F.const(1)))
                .clamp(3, 12).round(1),
            "怒火持续", "火炉烧多久；这段时间里每次挨打都会把攻击烧旺。等级高的个体撑得更久，暴怒式烧得更急、熄得更快。"),
        /** 每记档数：暴怒 2 / 蓄怒 1。 */
        perHit: formula(
            F.when(F.pref("fury", text("worldcombat.skill.rage.preference.fury")), F.const(2), F.const(1)).clamp(1, 2).floor(),
            "每记档数", { unit: "级", description: "每挨一记外来伤害涨几档攻击；暴怒式一次涨 2 档、烧得更快，蓄怒式一次 1 档、烧得更久。" }),
        /** 一次封顶：暴怒 4 / 蓄怒 6。 */
        rageCap: formula(
            F.when(F.pref("fury", text("worldcombat.skill.rage.preference.fury")), F.const(4), F.const(6)).clamp(2, 6).floor(),
            "一次封顶", { unit: "级", description: "这一次姿态最多涨几档攻击；到顶后火不再续，等你自己下一次出手收掉。" }),
        /** 起手：5 −（速度 − 55）× 0.02 [−1,1.5] + 暴怒 2；夹 3..9 刻。 */
        tempo: seconds(
            F.base(5).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 1.5))
                .plus(F.when(F.pref("fury", text("worldcombat.skill.rage.preference.fury")), F.const(2), F.const(0)))
                .clamp(3, 9).round(0),
            "起手", "从攒怒到抡出去之间的时间；速度快的个体骂得更急，暴怒式先攒足一口气。"),
        /** 收招：7 −（速度 − 55）× 0.03 [−1,2]；夹 5..11 刻。 */
        settle: seconds(
            F.base(7).minus(F.stat("speed").minus(55).times(0.03).clamp(-1, 2)).clamp(5, 11).round(0),
            "收招", "挥完收住的时间。"),
        /** 冷却：22 −（速度 − 55）× 0.08 [−3,4] + 暴怒 4；夹 14..36 刻。 */
        recharge: seconds(
            F.base(22).minus(F.stat("speed").minus(55).times(0.08).clamp(-3, 4))
                .plus(F.when(F.pref("fury", text("worldcombat.skill.rage.preference.fury")), F.const(4), F.const(0)))
                .clamp(14, 36).round(0),
            "冷却", "两次开火之间的等待；本招冷却短，火熄了就能再点。"),
        traceAhead: hidden(1.1),
        minimumMove: hidden(0.05)
    });

    defineDamage(rageId, "tantrum", { defenceCoefficient: 0.005,
        rationale: "泄愤的轻挥；愤怒的价值在姿态与涨攻，不在这一下本身。" }, { contact: true });

    stages(rageId, [
        { level: 25, values: { tantrum: 30, rageTicks: 7 } },
        { level: 45, values: { tantrum: 40, rageTicks: 9, rageCap: 7 } }
    ]);

    describe(rageId, [
        { key: "description.0", values: ["tantrum"] },
        { key: "description.1", values: ["blink", "speed", "collisionRadius", "push"] },
        { key: "description.2", values: ["rageTicks", "perHit", "rageCap"] },
        { key: "fury.on", values: [], when: function (context) { return read(context.detail.values, ["fury"]) === true; } },
        { key: "fury.off", values: [], when: function (context) { return read(context.detail.values, ["fury"]) !== true; } },
        { key: "timing", values: ["range", "tempo", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.tantrum", "tier.0.rageTicks"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.tantrum", "tier.1.rageTicks", "tier.1.rageCap"] }
    ]);
}
