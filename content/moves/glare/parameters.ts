/**
 * 大蛇瞪眼 / Glare — 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8）：Normal／变化／威力 0／命中 100／PP 30／单体，命中后目标陷入麻痹；
 *   flags 不含 powder（它是一记瞪视，不是粉）。电属性对麻痹免疫（共享默认规则自动生效）。
 *
 * 世界化：把「用腹部花纹使对手害怕」翻成一记**瞬发、不飞行的扇形怒目**——施法者昂起身体把花纹撑开，
 *   面前一把敌人只要和它的眼睛之间没有遮挡、就全部被镇住，共享的麻痹身份一次按上一片。它不造成伤害，
 *   靠的是宽、必中与最长的麻痹；代价是它够得最近、起手最久，而且**必须看得见**：躲到墙后、绕到侧面
 *   或站到扇形之外的人完全不受影响。这是三式麻痹里唯一能一次罩住好几个的那个。
 *
 * 参数为什么依赖这些精灵数据、并分散到不同参数：
 *   gazeReach    扇形半径（实际射程）：身高（越高撑得越远）＋ 等级。
 *   gazeAngle    扇形张角：体宽（越宽撑得越开）＋ 配置「张冠」。
 *   lockTicks    麻痹时长（三式最长）：特攻（花纹越慑人麻得越久）。
 *   patternRings 花纹层数：特攻 ＋ 等级台阶；它同时是画面里一圈圈花纹波纹的数量。
 *   gazeSpeed    扫视速度：速度（快个体花纹推进更急），决定画面里扇形铺开的速度。
 *   tempo        起手（三式最久）：速度（越快越短）＋ 张冠式更快。
 *   recharge     冷却：等级（越熟练回得越快）＋ 配置。
 *
 * 配置 `spread`（张冠）双向取舍：开启＝张角 ×1.35、起手 −2、冷却 ×0.9，但射程 ×0.85、麻痹 ×0.85，
 *   用来一次镇住围上来的一群；关闭＝昂首式，张角 ×0.7、射程 ×1.15、麻痹 ×1.2，用来隔远把单个硬目标钉住。
 *   两个方向各有适用局面。
 *
 * 公式即最终值；执行、AI 与悬浮说明读同一棵树。
 */
namespace PokemonSkills {
    export const glareId = "glare";

    actionParameters.define(glareId, {
        /** 扇形半径：6 + 身高偏移[−0.4,1.2] + 等级(≥25)偏移[0,1.5]；张冠 ×0.85 / 昂首 ×1.15；夹 4..11。 */
        gazeReach: formula(
            F.base(6)
                .plus(F.body("height").minus(1.4).times(0.6).clamp(-0.4, 1.2))
                .plus(F.level().minus(25).times(0.05).clamp(0, 1.5))
                .times(F.when(F.pref("spread"), F.const(0.85), F.const(1.15)))
                .clamp(4, 11).round(2),
            "瞪眼距离", {
                unit: "格",
                description: "扇形怒目能罩到多远；身量越高、等级越高越远。它也是本招的实际射程，扇形内每个人都要与施法者通视。"
            }),
        /** 张角：90 + 体宽偏移[−15,50]；张冠 ×1.35 / 昂首 ×0.7；夹 60..175。 */
        gazeAngle: formula(
            F.base(90).plus(F.body("width").minus(0.9).times(40).clamp(-15, 50))
                .times(F.when(F.pref("spread"), F.const(1.35), F.const(0.7)))
                .clamp(60, 175).round(0),
            "扇形张角", {
                unit: "度",
                description: "扇形在面前铺开的张角；体型越宽撑得越开，张冠式再放宽三成半。"
            }),
        /** 麻痹时长：260 + 特攻偏移[−40,120]；张冠 ×0.85 / 昂首 ×1.2；夹 180..520。 */
        lockTicks: seconds(
            F.base(260).plus(F.stat("specialAttack").minus(60).times(1.0).clamp(-40, 120))
                .times(F.when(F.pref("spread"), F.const(0.85), F.const(1.2)))
                .clamp(180, 520).round(0),
            "麻痹时长", "被怒目镇住的人麻多久；它是三式麻痹里最长的一档，特攻越高越久。"),
        /** 花纹层数：4 + 特攻偏移[0,8]；夹 3..14；等级台阶再抬。 */
        patternRings: formula(
            F.base(4).plus(F.stat("specialAttack").minus(60).times(0.06).clamp(0, 8)).clamp(3, 14).round(0),
            "花纹层数", { base: 4,
                unit: "层",
                description: "花纹向扇形里推进的波纹层数；特攻越高越密，也是画面里一层层花纹的数量。"
            }),
        /** 扫视速度：2.6 + 速度偏移[−0.8,2.0]；夹 1.8..5.5。 */
        gazeSpeed: formula(
            F.base(2.6).plus(F.stat("speed").minus(60).times(0.03).clamp(-0.8, 2.0)).clamp(1.8, 5.5).round(2),
            "扫视速度", {
                unit: "格/刻",
                description: "花纹沿扇形推进的快慢；速度快的个体推得更急，画面里的波纹铺开也更快。"
            }),
        /** 起手：11 − 速度偏移[−3,4] + 张冠 −2 / 昂首 +3；夹 6..16。 */
        tempo: seconds(
            F.base(11).minus(F.stat("speed").minus(60).times(0.04).clamp(-3, 4))
                .plus(F.when(F.pref("spread"), F.const(-2), F.const(3)))
                .clamp(6, 16).round(0),
            "昂首起手", "把身体撑起来、花纹亮足需要多久；速度越快越短，昂首式要多撑一瞬。"),
        /** 冷却：40 − 等级(≥25)偏移[0,10]；张冠 ×0.9 / 昂首 ×1.15；夹 20..70。 */
        recharge: seconds(
            F.base(40).minus(F.level().minus(25).times(0.2).clamp(0, 10))
                .times(F.when(F.pref("spread"), F.const(0.9), F.const(1.15)))
                .clamp(20, 70).round(0),
            "冷却", "两次怒目之间的等待；等级越高回得越快，昂首式缓得更久。")
    });

    stages(glareId, [
        { level: 40, values: { patternRings: 8 } },
        { level: 55, values: { patternRings: 10, lockTicks: 340 } }
    ]);

    describe(glareId, [
        { key: "description.0", values: ["gazeReach", "gazeAngle"] },
        { key: "description.1", values: ["lockTicks"] },
        { key: "spread.on", values: [], when: function (context) { return read(context.detail.values, ["spread"]) === true; } },
        { key: "spread.off", values: [], when: function (context) { return read(context.detail.values, ["spread"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.lockTicks"] }
    ]);
}
