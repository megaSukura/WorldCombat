/**
 * 啄食 / pluck —— 第 072 组「以对手的持有物为材料的一击」。
 *
 * 机制与数值来源：
 * - 原生（Cobblemon 1.8 / Showdown）：威力 60、飞行、物理、命中 100、PP 20、接触、带有 `distance` 标记
 *   （可以够到用飞行／弹跳悬在空中的目标）；命中时若目标携带树果，把它啄下来吃掉，并获得那颗树果的效果。
 * - 即时战斗翻译：沿真实三维瞄准伸出一条窄喙的直线判定，只取第一个碰到的身体；朝上瞄准时可以把
 *   reach 之外再向上够 lift 格的额外距离，所以能啄到浮空的对手，但横瞄不会命中离线的高处对象，隔墙也没有啄击。
 *   若首个目标是携带树果的非友方，当场啄下吞掉、立刻获得效果。与同为“吃果”的虫咬分开：啄食不贴近、不咀嚼，
 *   靠长喙与仰角取胜，吞得快而浅（吸收系数低于 1）。
 * - 参数分散到精灵数据：威力取物攻（喙尖）与速度（出喙快），喙长取速度与等级，抬升取速度与等级，
 *   判定半径取体型高度（喙尖窄），轻推取体重；吸收系数取速度，粒子数量取速度。
 *   树果是什么、吃下有什么基本效果，统一读 `NativeItems` 的共享树果注册库；本招只决定吸收系数与节奏。
 * 配置 outreach（伸喙）：够得更远更高（射程 ×1.3、抬升 ×1.4、冷却 +6），代价是本击 ×0.88；关闭则本击 ×1.08。
 *
 * 伤害段名 peck：这一啄随精灵数据变化的那部分。树果效果在命中并啄下后立刻结算（快吞，吸收较浅）。
 */
namespace PokemonSkills {
    /** 目标手里的树果；不是树果（或没持有物）时返回 null（这一啄就没有果子可吃）。 */
    export function pluckBerryOf(world: CombatWorld, actor: CombatActor): NativeItems.Berry | null {
        return NativeItems.berryFrom(NativeItems.heldOf(world, actor));
    }
    /** 把啄下的树果效果立刻落到自己身上；返回本次实际发生的事，供表现与浮字读取。啄食取尖刺反噬。 */
    export function pluckAbsorb(current: CombatAction, berry: NativeItems.Berry, absorb: number): NativeItems.EatResult {
        return NativeItems.eat(current.world(), current.actor(), berry, absorb, 0, "pluck_berry", true, "pluck_spike");
    }

    actionParameters.define("pluck", {
        /** 啄击威力：基础 50；物攻每比 60 多 1 加 0.30（夹 -12..+32），速度每比 60 多 1 加 0.14（夹 -5..+18），
         *  等级每比 30 多 1 加 0.4（夹 -6..+12）；outreach 开 ×0.88、关 ×1.08；夹在 34..104。 */
        peck: formula(
            F.base(50)
                .plus(F.stat("attack").minus(60).times(0.30).clamp(-12, 32))
                .plus(F.stat("speed").minus(60).times(0.14).clamp(-5, 18))
                .plus(F.level().minus(30).times(0.4).clamp(-6, 12))
                .times(F.when(F.pref("outreach"), F.const(0.88), F.const(1.08)))
                .clamp(34, 104).round(1),
            "啄击威力", {
                unit: "威力",
                description: "这一啄随精灵数据变化的那部分：物攻给出喙尖的锐度，速度给出出喙的力度，等级给出啄得准的把握。对手防御、相性与暴击在命中时另算。"
            }),
        /** 起手：基础 6 刻，速度每比 60 多 1 减 0.02（夹 -1.5..+3），夹在 3..10 刻。 */
        charge: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.02).clamp(-1.5, 3)).clamp(3, 10).round(0),
            "起手时间", "抬头、伸出喙要多久；越快的个体起得越短。"),
        /** 长喙距离：基础 3.6 格，速度每比 60 多 1 加 0.02（夹 -0.4..+1.6），等级每比 30 多 1 加 0.01（夹 -0.2..+0.5）；
         *  outreach 开 ×1.3；夹在 3.0..6.5 格。 */
        reach: formula(
            F.base(3.6)
                .plus(F.stat("speed").minus(60).times(0.02).clamp(-0.4, 1.6))
                .plus(F.level().minus(30).times(0.01).clamp(-0.2, 0.5))
                .times(F.when(F.pref("outreach"), F.const(1.3), F.const(1.0)))
                .clamp(3.0, 6.5).round(2),
            "长喙距离", {
                unit: "格",
                description: "喙沿瞄准方向伸出的距离；快的个体伸得更远。它也是本招的实际射程来源，比虫咬长得多。"
            }),
        /** 抬升高度：基础 2.2 格，速度每比 60 多 1 加 0.02（夹 -0.4..+1.6），等级每比 30 多 1 加 0.01（夹 -0.2..+0.5）；
         *  outreach 开 ×1.4；夹在 1.8..5.0 格。 */
        lift: formula(
            F.base(2.2)
                .plus(F.stat("speed").minus(60).times(0.02).clamp(-0.4, 1.6))
                .plus(F.level().minus(30).times(0.01).clamp(-0.2, 0.5))
                .times(F.when(F.pref("outreach"), F.const(1.4), F.const(1.0)))
                .clamp(1.8, 5.0).round(2),
            "抬升高度", {
                unit: "格",
                description: "朝上瞄准时，喙能在长喙距离之外再向上够到的额外距离；快而熟练的个体仰得更高，能啄到浮在空中的对手（原生 distance 标记的翻译）。"
            }),
        /** 判定半径：高度每比 1.4 高 1 格加 0.08，夹在 0.18..0.4 格（喙尖窄）。 */
        radius: formula(
            F.base(0.22).plus(F.body("height").minus(1.4).times(0.08)).clamp(0.18, 0.4).round(2),
            "判定半径", {
                unit: "格",
                description: "喙尖够到活体的判定半径；身板越大略宽，但始终比虫咬的张口窄。"
            }),
        /** 轻推距离：体重每比 50 多 1 加 0.001（夹 -0.03..+0.2），夹在 0.04..0.4 格。 */
        push: formula(
            F.base(0.1).plus(F.body("weight").minus(50).times(0.001).clamp(-0.03, 0.2)).clamp(0.04, 0.4).round(2),
            "顶开距离", {
                unit: "格",
                description: "啄中后把目标推开一点的距离；越重推得越远。"
            }),
        /** 吸收系数：基础 0.65，速度每比 60 多 1 加 0.003（夹 0..0.3），夹在 0.6..0.95（快吞，吸收较浅）。 */
        absorb: formula(
            F.base(0.65).plus(F.stat("speed").minus(60).times(0.003).clamp(0, 0.3)).clamp(0.6, 0.95).round(3),
            "吸收系数", {
                unit: "倍",
                description: "啄下后匆匆吞下的吸收程度；比虫咬浅，回的体力与受到的尖刺反噬都更少。"
            }),
        /** 羽屑数量：基础 10，速度每比 60 多 1 加 0.1（夹 -3..+16），夹在 8..28 个；驱动起喙与命中的粒子。 */
        motes: formula(
            F.base(10).plus(F.stat("speed").minus(60).times(0.1).clamp(-3, 16)).clamp(8, 28).round(0),
            "羽屑数量", {
                unit: "个",
                description: "起喙与命中时扬起的羽屑与果屑数量；出喙越快越多，粒子按它发射。"
            }),
        /** 收招：基础 6 刻，速度每比 60 多 1 减 0.02（夹 -1..+2），夹在 4..9 刻。 */
        aftercast: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.02).clamp(-1, 2)).clamp(4, 9).round(0),
            "收招", "收喙的时间；快的个体几乎不停。"),
        /** 冷却：基础 22 刻，速度每比 60 多 1 减 0.06（夹 -2..+4）；outreach 开 +6；夹在 16..40 刻。 */
        recharge: seconds(
            F.base(22).minus(F.stat("speed").minus(60).times(0.06).clamp(-2, 4))
                .plus(F.when(F.pref("outreach"), F.const(6), F.const(0)))
                .clamp(16, 40).round(0),
            "冷却", "两次啄食之间的等待；比虫咬短，换来更远更快但更浅的一啄。")
    });

    stages("pluck", [
        { level: 20, values: { peck: 62 } },
        { level: 38, values: { peck: 72, reach: 4.0 } }
    ]);

    defineDamage("pluck", "peck", { defenceCoefficient: 0.0046, rationale: "窄喙对防御的穿透略强，突出物攻与速度的差别。" }, { contact: true });

    describe("pluck", [
        { key: "description.0", values: ["peck", "radius"] },
        { key: "description.1", values: ["reach", "lift", "push"] },
        { key: "description.2", values: ["absorb"] },
        { key: "outreach.on", values: [], when: function (context) { return read(context.detail.values, ["outreach"]) === true; } },
        { key: "outreach.off", values: [], when: function (context) { return read(context.detail.values, ["outreach"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.peck"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.peck", "tier.1.reach"] }
    ]);
}
