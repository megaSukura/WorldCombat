/**
 * 电喙 / boltbeak —— 参数与伤害段。
 *
 * 原生事实：Electric／物理／威力 85／命中 100／PP 10／接触；「如果比对手先出手攻击，威力翻倍」（Cobblemon 1.8）。
 *
 * 翻译：即时战斗里没有先手判定，本实现把「比对手先出手」翻成可观察的事实——命中那一刻，目标还没有打过施法者
 * （最近窗口内施法者没被这个目标击中，且目标此刻没有朝施法者出手）。满足时这一啄翻倍，画面换成一道更亮的电。
 * 与「先手」相配的形状是一次**点到即走的直线电啄**：冲进去啄一口，电还没散就退回来。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   peck       电啄威力 85 + 物攻偏移 + 速度偏移；先手命中 ×2。
 *   lead       先手：命中时目标尚未打过施法者（自定义事实）。
 *   window     先手窗口 1.1 秒 − 速度偏移（快手只把眼前的回击算作被抢先）。
 *   dart       突刺距离 3.8 格 + 速度偏移 + 等级偏移；也是射程来源。
 *   speed      每刻位移 1.05 格/刻 + 速度偏移（电啄要快）。
 *   collisionRadius 判定半径 0.4 格 + 体型高度偏移。
 *   backstep   退步 1.4 格 + 速度偏移 + 游斗 0.9（啄完拉开）。
 *   tempo      起手 5 刻 − 速度偏移。
 *   settle     收招 6 刻。
 *   recharge   冷却 26 刻 − 速度偏移 + 游斗 4 刻。
 *
 * 配置 `skirmish`（游斗）：开启＝啄完退得更远、更适合反复先手，但每啄约轻 10%%、冷却更长；
 *   关闭＝站定啄出更重的一口，退步短。
 *
 * 伤害段 `peck` 与参数同名，走共享换算（原生类别 Physical，Electric 属性）。
 */
namespace PokemonSkills {
    export const boltbeakId = "boltbeak";
    export const boltbeakScene = "world_combat:move_boltbeak";

    /** 命中目标是否还没打过施法者：先手成立返回 1，被抢先返回 0。 */
    export function boltbeakLead(context: FactContext): number {
        const world = context.world, actor = context.actor;
        if (!world || !actor || !world.valid(actor) || String(actor.domain()) !== "cobblemon") return 0;
        // 先手翻倍以实际碰到的那个目标为准：显式 target 优先于动作选定的目标。
        const target = context.target && context.target.actor ? context.target.actor : context.action ? context.action.target() : null;
        if (!target || !world.valid(target) || world.friendly(target)) return 0;
        const window = p(boltbeakId, "window", <NumberContext>context);
        const self = world.observe(actor), foe = world.observe(target);
        if (self !== null) {
            const last = self.lastAttacker();
            if (self.hurtAgo() <= window && last !== null && String(last.ref()) === String(target.ref())) return 0;
        }
        if (foe !== null) {
            const swinging = foe.attacking();
            if (swinging !== null && String(swinging.ref()) === String(actor.ref())) return 0;
        }
        return 1;
    }

    defineFacts(boltbeakId, function (context: FactContext): Formula.Facts {
        return { read: function (id: string) {
            if (id !== "boltbeak.lead") return undefined;
            return boltbeakLead(context);
        } };
    });

    actionParameters.define(boltbeakId, {
        /** 电啄威力：85 + 物攻偏移[−20,38] + 速度偏移[−8,20]；游斗 ×0.9；先手 ×2；夹 50..190。 */
        peck: formula(
            F.base(85)
                .plus(F.stat("attack").minus(60).times(0.3).clamp(-20, 38))
                .plus(F.stat("speed").minus(55).times(0.08).clamp(-8, 20))
                .times(F.when(F.pref("skirmish"), F.const(0.9), F.const(1)))
                .times(F.when(F.var("boltbeak.lead", text("worldcombat.skill.boltbeak.value.lead")).gt(0), F.const(2), F.const(1)))
                .clamp(50, 190).round(1),
            "电啄威力", {
                unit: "威力",
                description: "这一口电啄的基准威力；物攻与速度越高越猛。命中时目标尚未打过施法者就翻倍。对手防御、相性与暴击在命中时另算。"
            }),
        /** 先手窗口：1.1 秒 − 速度偏移[−0.2,0.4]；夹 0.6..1.8 秒。 */
        window: seconds(
            F.base(22).minus(F.stat("speed").minus(55).times(0.08).clamp(-4, 8)).clamp(12, 36).round(0),
            "先手窗口", "目标在这段时间内打过施法者，就被算作抢先、不再翻倍；快手只把眼前的回击算数。"),
        /** 突刺距离：3.8 格 + 速度偏移[−0.6,1.6] + 等级偏移[0,1.4]；夹 3..7。 */
        dart: formula(
            F.base(3.8).plus(F.stat("speed").minus(55).times(0.016).clamp(-0.6, 1.6))
                .plus(F.level().minus(25).times(0.045).clamp(0, 1.4)).clamp(3, 7).round(2),
            "突刺距离", {
                unit: "格",
                description: "朝目标啄出的最大距离，也是本招的实际射程来源；腿快的个体从更远处就能先手。"
            }),
        /** 每刻位移：1.05 格/刻 + 速度偏移[−0.15,0.45]；夹 0.8..1.9。 */
        speed: formula(
            F.base(1.05).plus(F.stat("speed").minus(55).times(0.005).clamp(-0.15, 0.45)).clamp(0.8, 1.9).round(2),
            "突刺速度", {
                unit: "格/刻",
                description: "啄出去每刻移动的距离；越快越能在对手反应前咬上。"
            }),
        /** 判定半径：0.4 格 + 体型高度偏移[−0.08,0.26]；夹 0.34..0.7。 */
        collisionRadius: formula(
            F.base(0.4).plus(F.body("height").minus(1.4).times(0.085).clamp(-0.08, 0.26)).clamp(0.34, 0.7).round(2),
            "判定半径", {
                unit: "格",
                description: "喙尖能啄中多大一圈；口鼻大的个体啄得更宽。"
            }),
        /** 退步：1.4 格 + 速度偏移[−0.3,0.8] + 游斗 0.9；夹 0.8..3.2。 */
        backstep: formula(
            F.base(1.4).plus(F.stat("speed").minus(55).times(0.008).clamp(-0.3, 0.8))
                .plus(F.when(F.pref("skirmish"), F.const(0.9), F.const(0))).clamp(0.8, 3.2).round(2),
            "退步", {
                unit: "格",
                description: "啄完向后拉开的距离；游斗式退得更远，方便再次抢先进攻。"
            }),
        /** 起手：5 刻 − 速度偏移[−1,2]；夹 3..9。 */
        tempo: seconds(
            F.base(5).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2)).clamp(3, 9).round(0),
            "起手", "从蓄电到啄出之间的时间；速度快的个体起步更急。"),
        /** 收招：6 刻；啄完收势。 */
        settle: seconds(F.base(6).clamp(3, 12).round(0), "收招", "电啄结束后收住的时间。"),
        /** 冷却：26 − 速度偏移[−4,6] + 游斗 4；夹 16..40。 */
        recharge: seconds(
            F.base(26).minus(F.stat("speed").minus(55).times(0.12).clamp(-4, 6))
                .plus(F.when(F.pref("skirmish"), F.const(4), F.const(0))).clamp(16, 40).round(0),
            "冷却", "这一口电啄之后多久能再啄；速度快的个体回得更快，游斗式更费。"),
        traceAhead: hidden(1.2),
        minimumMove: hidden(0.05)
    });

    defineDamage(boltbeakId, "peck", {}, { contact: true });

    stages(boltbeakId, [
        { level: 30, values: { peck: 100 } },
        { level: 45, values: { peck: 118, dart: 5.2 } }
    ]);

    describe(boltbeakId, [
        { key: "description.0", values: ["peck","window"] },
        { key: "description.1", values: ["dart", "speed", "collisionRadius", "backstep"] },
        { key: "skirmish.on", values: [], when: function (context) { return read(context.detail.values, ["skirmish"]) === true; } },
        { key: "skirmish.off", values: [], when: function (context) { return read(context.detail.values, ["skirmish"]) !== true; } },
        { key: "timing", values: ["range", "tempo", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.peck"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.peck", "tier.1.dart"] }
    ]);
}
