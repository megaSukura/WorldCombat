/**
 * 热带踢 / tropkick —— 参数与伤害段。本组「卸力一击」的挑踢成员。
 *
 * 原生事实：Grass／物理／威力 70／命中 100／PP 15／接触／单体；命中后 100% 使目标攻击下降 1 级
 *   （secondary.boosts.atk -1）。描述「向对手使出来自南国的火热脚踢。从而降低对手的攻击。」（Cobblemon 1.8）。
 *
 * 翻译：把「来自南国的火热脚踢」落成**一记自下而上的挑踢**——身子一沉、脚上裹着热浪踢出去，踢中把对手挑得离地、
 *   向后仰倒，热浪在落点烧出一圈焦痕；被烤得没了火气，攻击下降。它是本组出手最快、回气最短的一记；踏地式踢得低平更重，
 *   挑飞式把对手挑到半空（打断贴身、逼它重新落地），代价是单发更轻。
 *
 * 数据分散（每个参数读不同的精灵数据）：
 *   kick   踢击威力：**物攻**给这一脚的狠度，等级定发力；踏地式 ×1.12 / 挑飞式 ×0.85。
 *   lunge  踢进距离：**速度**决定跨步多远；也是实际射程来源。
 *   cruise 踢进速度：速度派生。
 *   radius 判定半径：**身高**决定腿扫多粗。
 *   push   踢退距离：物攻派生。
 *   launch 挑飞高度：物攻派生，挑飞式 ×1.8。
 *   embers 火星数量：物攻与速度派生，直接驱动画面发射量。
 *   scorch 焦痕半径：**身高**派生，挑飞式 ×1.2。
 *   tempo/recover/recharge：速度与等级定时序；挑飞式冷却更长。
 *
 * 配置 `launch`（挑飞式，默认关）双向取舍：开＝把目标挑到半空、顶得更开、焦痕更大，代价是威力 ×0.85、冷却 +4 刻；
 *   关（踏地式）＝威力 ×1.12、踢得低平更重。想打断贴身或把人挑下高台时开，想单纯压低攻击、打伤害时关。
 *
 * 伤害段 `kick` 与参数同名，标 contact（原生接触）。
 */
namespace PokemonSkills {
    actionParameters.define("tropkick", {
        /** 踢击威力：基础 62；物攻每比 60 多 1 加 0.29（夹 −13..36）；等级每比 30 高 1 加 0.3（夹 −4..10）；
         *  踏地 ×1.12 / 挑飞 ×0.85；夹 36..130。 */
        kick: formula(
            F.base(62)
                .plus(F.stat("attack").minus(60).times(0.29).clamp(-13, 36))
                .plus(F.level().minus(30).times(0.3).clamp(-4, 10))
                .times(F.when(F.pref("launch", text("worldcombat.skill.tropkick.preference.launch")), F.const(0.85), F.const(1.12)))
                .clamp(36, 130).round(1),
            "踢击威力", {
                unit: "威力",
                description: "这一记火热脚踢的基础威力；物攻越高踢得越狠，等级越高发力越整。踏地式把力灌进低平的一脚，挑飞式分一部分去把对手挑起来。对手防御、相性与暴击在命中时另算。"
            }),
        /** 踢进距离：基础 2.4 + 速度每比 60 快 1 加 0.012（夹 −0.2..0.7）；夹 1.8..3.6。 */
        lunge: formula(
            F.base(2.4).plus(F.stat("speed").minus(60).times(0.012).clamp(-0.2, 0.7)).clamp(1.8, 3.6).round(2),
            "踢进距离", {
                unit: "格",
                description: "垫步起脚能跨多远；速度快的个体跨得远。它也是本招的实际射程来源。"
            }),
        /** 踢进速度：基础 0.62 + 速度偏移[−0.08,0.2]；夹 0.45..1.0。 */
        cruise: formula(
            F.base(0.62).plus(F.stat("speed").minus(60).times(0.004).clamp(-0.08, 0.2)).clamp(0.45, 1.0).round(2),
            "踢进速度", {
                unit: "格/刻",
                description: "垫步每一刻推进的距离；速度越快起脚越急。"
            }),
        /** 判定半径：基础 0.48 + 身高偏移[−0.05,0.18]；夹 0.4..0.7。 */
        radius: formula(
            F.base(0.48).plus(F.body("height").minus(1.4).times(0.08).clamp(-0.05, 0.18)).clamp(0.4, 0.7).round(2),
            "判定半径", {
                unit: "格",
                description: "踢击碰到东西的判定粗细；腿长的个体扫得稍宽。"
            }),
        /** 踢退距离：基础 0.5 + 物攻偏移[−0.08,0.6]；夹 0.15..1.3。 */
        push: formula(
            F.base(0.5).plus(F.stat("attack").minus(60).times(0.005).clamp(-0.08, 0.6)).clamp(0.15, 1.3).round(2),
            "踢退距离", {
                unit: "格",
                description: "被踢中的人沿离心方向被顶开多远；物攻越高顶得越开。"
            }),
        /** 掉攻级数：原生固定 1 级，是这招的身份。 */
        stages: formula(
            F.const(1).clamp(1, 2).round(0),
            "掉攻级数", {
                unit: "级",
                description: "命中后目标攻击下降的能力等级；对宝可梦落到原生攻击等级，对其他战斗者落到攻击属性。原生固定 1 级。"
            }),
        /** 挑飞高度：基础 1.2 + 物攻偏移[−0.2,0.8]；挑飞 ×1.8；夹 0.4..3.2。 */
        launch: formula(
            F.base(1.2)
                .plus(F.stat("attack").minus(60).times(0.01).clamp(-0.2, 0.8))
                .times(F.when(F.pref("launch", text("worldcombat.skill.tropkick.preference.launch")), F.const(1.8), F.const(1)))
                .clamp(0.4, 3.2).round(2),
            "挑飞高度", {
                unit: "格",
                description: "踢中把目标朝上挑起的高度；物攻越高挑得越高，挑飞式再抬近一倍。挑得越高，它越久回不到地面。"
            }),
        /** 火星数量：基础 16 + 物攻偏移[−3,16] + 速度偏移[−2,10]；夹 10..42。 */
        embers: formula(
            F.base(16)
                .plus(F.stat("attack").minus(60).times(0.13).clamp(-3, 16))
                .plus(F.stat("speed").minus(60).times(0.1).clamp(-2, 10))
                .clamp(10, 42).round(0),
            "火星数量", {
                unit: "点",
                description: "踢出的南国热浪带起的火星数量，随物攻与速度增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 焦痕半径：基础 1.1 + 身高偏移[−0.05,0.5]；挑飞 ×1.2；夹 0.8..2.2。 */
        scorch: formula(
            F.base(1.1)
                .plus(F.body("height").minus(1.4).times(0.2).clamp(-0.05, 0.5))
                .times(F.when(F.pref("launch", text("worldcombat.skill.tropkick.preference.launch")), F.const(1.2), F.const(1)))
                .clamp(0.8, 2.2).round(2),
            "焦痕半径", {
                unit: "格",
                description: "落点被热浪烧出的焦痕半径，也是画面里那圈焦地的大小；身板越大、挑飞式越宽。"
            }),
        /** 起手：基础 6 − 速度偏移[−2.3,3]；夹 3..11。 */
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.04).clamp(-2.3, 3)).clamp(3, 11).round(0),
            "起手", "沉身垫步、把热浪裹上脚的时间；速度越快起脚越快，是本组最短的起手。"),
        /** 收招：基础 6 − 速度偏移[−1.5,2.5]；夹 3..11。 */
        recover: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.03).clamp(-1.5, 2.5)).clamp(3, 11).round(0),
            "收招", "踢完收腿站稳的时间；速度越快收得越利落。"),
        /** 冷却：基础 22 − 等级偏移[−3,5]；挑飞 +4；夹 12..38。 */
        recharge: seconds(
            F.base(22).minus(F.level().minus(20).times(0.14).clamp(-3, 5))
                .plus(F.when(F.pref("launch", text("worldcombat.skill.tropkick.preference.launch")), F.const(4), F.const(0)))
                .clamp(12, 38).round(0),
            "冷却", "两次热带踢之间的等待；等级越高回气越快，挑飞式更费。PP 15 的代价。")
    });

    defineDamage("tropkick", "kick", {}, { contact: true });

    stages("tropkick", [
        { level: 33, values: { kick: 72 } },
        { level: 48, values: { kick: 82, embers: 32 } }
    ]);

    describe("tropkick", [
        { key: "description.0", values: ["kick"] },
        { key: "description.1", values: ["lunge","cruise","radius"] },
        { key: "description.2", values: ["push","stages","launch"] },
        { key: "launch.on", values: [], when: function (context) { return read(context.detail.values, ["launch"]) === true; } },
        { key: "launch.off", values: [], when: function (context) { return read(context.detail.values, ["launch"]) !== true; } },
        { key: "timing", values: ["range", "tempo", "recover", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.kick"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.kick"] }
    ]);
}
