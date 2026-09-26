/**
 * 鳃咬 / fishiousrend —— 参数与伤害段。
 *
 * 原生事实：Water／物理／威力 85／命中 100／PP 10／接触、啃咬（bite）；「如果比对手先出手攻击，威力翻倍」（Cobblemon 1.8）。
 *
 * 翻译：即时战斗里没有先手判定，本实现把「比对手先出手」翻成可观察的事实——命中那一刻，目标还没有打过施法者
 * （最近窗口内施法者没被这个目标击中，且目标此刻没有朝施法者出手）。满足时这一口翻倍。
 * 与「先咬住」相配的形状是一次**贴身咬合**：扑上去咬住，把目标往自己这边拖、并压住它的速度（共享能力等级）。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   rend       鳃咬威力 85 + 物攻偏移 + 体重偏移；先咬住 ×2。
 *   lead       先咬住：命中时目标尚未打过施法者（自定义事实）。
 *   window     先手窗口 1.1 秒 − 速度偏移。
 *   lunge      扑咬距离 2.8 格 + 速度偏移 + 等级偏移；也是射程来源。
 *   speed      每刻位移 0.9 格/刻 + 速度偏移（带鳃的沉重身体）。
 *   collisionRadius 咬合判定 0.5 格 + 体型高度偏移。
 *   drag       拖拽 0.7 格 + 物攻偏移 + 深咬 0.4。
 *   slowStages 压速级数 1 + 深咬 1。
 *   tempo      起手 6 刻 − 速度偏移 + 深咬 3 刻。
 *   settle     收招 9 刻。
 *   recharge   冷却 28 刻 − 速度偏移 + 深咬 6 刻。
 *
 * 配置 `deepbite`（深咬）：开启＝咬得更死、拖拽更远、压速多一级，但起手多 3 刻、冷却多 6 刻；
 *   关闭＝快咬一口、拖拽与压速都小，更快更省。
 *
 * 伤害段 `rend` 与参数同名，走共享换算（原生类别 Physical，Water 属性）。
 */
namespace PokemonSkills {
    export const fishiousrendId = "fishiousrend";
    export const fishiousrendScene = "world_combat:move_fishiousrend";

    /** 命中目标是否还没打过施法者：先咬住成立返回 1，被抢先返回 0。 */
    export function fishiousrendLead(context: FactContext): number {
        const world = context.world, actor = context.actor;
        if (!world || !actor || !world.valid(actor) || String(actor.domain()) !== "cobblemon") return 0;
        // 先咬住以实际咬中的那个身体为准：显式 target 优先于动作选定的目标。
        const target = context.target && context.target.actor ? context.target.actor : context.action ? context.action.target() : null;
        if (!target || !world.valid(target) || world.friendly(target)) return 0;
        const window = p(fishiousrendId, "window", <NumberContext>context);
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

    defineFacts(fishiousrendId, function (context: FactContext): Formula.Facts {
        return { read: function (id: string) {
            if (id !== "fishiousrend.lead") return undefined;
            return fishiousrendLead(context);
        } };
    });

    actionParameters.define(fishiousrendId, {
        /** 鳃咬威力：85 + 物攻偏移[−20,40] + 体重偏移[−6,12]；先咬住 ×2；夹 50..195。 */
        rend: formula(
            F.base(85)
                .plus(F.stat("attack").minus(60).times(0.3).clamp(-20, 40))
                .plus(F.body("weight").minus(300).times(0.005).clamp(-6, 12))
                .times(F.when(F.var("fishiousrend.lead", text("worldcombat.skill.fishiousrend.value.lead")).gt(0), F.const(2), F.const(1)))
                .clamp(50, 195).round(1),
            "鳃咬威力", {
                unit: "威力",
                description: "这一口鳃咬的基准威力；物攻越高、身体越沉咬得越重。命中时目标尚未打过施法者就翻倍。对手防御、相性与暴击在命中时另算。"
            }),
        /** 先手窗口：1.1 秒 − 速度偏移[−0.2,0.4]；夹 0.6..1.8 秒。 */
        window: seconds(
            F.base(1.1).minus(F.stat("speed").minus(55).times(0.004).clamp(-0.2, 0.4)).clamp(0.6, 1.8).round(2),
            "先手窗口", "目标在这段时间内打过施法者，就被算作抢先、不再翻倍。"),
        /** 扑咬距离：2.8 格 + 速度偏移[−0.5,1.3] + 等级偏移[0,1.2]；夹 2.2..5.5。 */
        lunge: formula(
            F.base(2.8).plus(F.stat("speed").minus(55).times(0.013).clamp(-0.5, 1.3))
                .plus(F.level().minus(25).times(0.04).clamp(0, 1.2)).clamp(2.2, 5.5).round(2),
            "扑咬距离", {
                unit: "格",
                description: "朝目标扑出的最大距离，也是本招的实际射程来源；腿快的个体够得到更远的目标。"
            }),
        /** 每刻位移：0.9 格/刻 + 速度偏移[−0.15,0.4]；夹 0.65..1.5。 */
        speed: formula(
            F.base(0.9).plus(F.stat("speed").minus(55).times(0.0045).clamp(-0.15, 0.4)).clamp(0.65, 1.5).round(2),
            "扑咬速度", {
                unit: "格/刻",
                description: "扑上去每刻移动的距离；越快越能抢在对手反应前咬住。"
            }),
        /** 咬合判定：0.5 格 + 体型高度偏移[−0.1,0.34]；夹 0.42..0.9。 */
        collisionRadius: formula(
            F.base(0.5).plus(F.body("height").minus(1.4).times(0.1).clamp(-0.1, 0.34)).clamp(0.42, 0.9).round(2),
            "咬合判定", {
                unit: "格",
                description: "这一口能咬住多大一圈；口大的个体咬得更宽。"
            }),
        /** 拖拽：0.7 格 + 物攻偏移[−0.15,0.6] + 深咬 0.4；夹 0.5..1.8。 */
        drag: formula(
            F.base(0.7).plus(F.stat("attack").minus(60).times(0.006).clamp(-0.15, 0.6))
                .plus(F.when(F.pref("deepbite"), F.const(0.4), F.const(0))).clamp(0.5, 1.8).round(2),
            "拖拽", {
                unit: "格",
                description: "咬住后把目标朝自己拖回的距离；物攻高的个体拖得更狠，深咬式再多拖一段。"
            }),
        /** 压速级数：1 + 深咬 1；夹 1..2。 */
        slowStages: formula(
            F.base(1).plus(F.when(F.pref("deepbite"), F.const(1), F.const(0))).clamp(1, 2).floor(),
            "压速级数", {
                unit: "级",
                description: "咬合压住目标的速度能力等级；深咬式多压一级，猎物的腿更软。"
            }),
        /** 起手：6 刻 − 速度偏移[−1,2] + 深咬 3 刻；夹 4..11。 */
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.018).clamp(-1, 2))
                .plus(F.when(F.pref("deepbite"), F.const(3), F.const(0))).clamp(4, 11).round(0),
            "起手", "从张鳃到咬出之间的时间；速度快的个体咬得更急，深咬式先摆开鳃。"),
        /** 收招：9 刻；咬完挣开收势。 */
        settle: seconds(F.base(9).clamp(5, 16).round(0), "收招", "咬合结束后收住的时间。"),
        /** 冷却：28 − 速度偏移[−4,6] + 深咬 6；夹 18..42。 */
        recharge: seconds(
            F.base(28).minus(F.stat("speed").minus(55).times(0.12).clamp(-4, 6))
                .plus(F.when(F.pref("deepbite"), F.const(6), F.const(0))).clamp(18, 42).round(0),
            "冷却", "这一口鳃咬之后多久能再咬；速度快的个体回得更快，深咬式更费。"),
        traceAhead: hidden(1.2),
        minimumMove: hidden(0.05)
    });

    defineDamage(fishiousrendId, "rend", {}, { contact: true, bite: true });

    stages(fishiousrendId, [
        { level: 30, values: { rend: 100 } },
        { level: 45, values: { rend: 118, lunge: 4 } }
    ]);

    describe(fishiousrendId, [
        { key: "description.0", values: ["rend","window"] },
        { key: "description.1", values: ["lunge","speed","collisionRadius"] },
        { key: "description.2", values: ["drag","slowStages"] },
        { key: "deepbite.on", values: [], when: function (context) { return read(context.detail.values, ["deepbite"]) === true; } },
        { key: "deepbite.off", values: [], when: function (context) { return read(context.detail.values, ["deepbite"]) !== true; } },
        { key: "timing", values: ["range","tempo","settle","pp","recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.rend"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.rend", "tier.1.lunge"] }
    ]);
}
