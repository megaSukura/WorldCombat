/**
 * 角撞 / hornattack 的参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：一般、物理、威力 65、命中 100、PP 25、优先度 0、接触、无追加效果（18 位学习者）。
 * 描述「用尖锐的角攻击对手」。它是尼多朗、肯泰罗一类的经典近身顶撞。
 *
 * 翻译：把「用角攻击」翻成**低头扎进对手、把角锁在伤口上，用整个身体把对方沿地面一路顶出去**——
 * 不是一记击退，而是一段持续的地面推移，把目标从站位上推走。它是本组唯一的「顶住推走」。
 *
 * 与同族分开：超级角击是长蓄势、单点窄线的重刺（会钉住或挑飞）；头锤是扑上去撞出畏缩；撞击会从对方身侧滑过换位；
 * 角撞凭「锁住、贴着地面把目标一路推走」认出来。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   gore       顶撞威力：物攻定角尖、体重给冲量、等级给狠劲；推土式更重、快撞式更轻快。
 *   reach      角程：身高给角长与步幅，速度给上前的半步，也是实际射程。
 *   horn       角线半宽：体宽决定角有多粗。
 *   rush       冲身步幅：速度给趟出去的冲程。
 *   shove      命中那一刻的顶退：体重给的初始推力。
 *   carry      总共顶走的距离：体重给持续的推力；推土式要多推一长段。
 *   carrySpeed 每刻前推的速度：体重给推的快慢。
 *   dust       扬尘量：体重换算，驱动表现。
 *   tempo／aftercast／recharge：速度与等级定节奏，推土式更费。
 *
 * 配置 `drive`（推土式，默认关）双向取舍：开启＝顶走距离 ×1.6、威力 ×1.08、初始顶退更大，
 * 代价是起手 +3 刻、收招 +2 刻、冷却 +5 刻；关闭（快撞式）＝顶一小段就收、起手快、循环短。
 * 两向各有局面：把目标推离掩体/断后 vs 快速贴身压制。
 *
 * 伤害段 `gore` 与参数同名，走共享换算；对手防御、相性与暴击在命中时由共享结算。
 */
namespace PokemonSkills {
    actionParameters.define("hornattack", {
        /** 顶撞威力：62 + 物攻偏移[−14,36] ×0.45 + 体重偏移[0,16] ×0.03 + 等级偏移[−6,14] ×0.3；推土 ×1.08 / 快撞 ×0.95；夹 48..112。 */
        gore: formula(
            F.base(62).plus(F.stat("attack").minus(60).times(0.45).clamp(-14, 36))
                .plus(F.body("weight").minus(60).times(0.03).clamp(0, 16))
                .plus(F.level().minus(22).times(0.3).clamp(-6, 14))
                .times(F.when(F.pref("drive", text("worldcombat.skill.hornattack.preference.drive")), F.const(1.08), F.const(0.95)))
                .clamp(48, 112).round(1),
            "顶撞威力", {
                unit: "威力",
                description: "角尖扎进目标那一下的基础威力；物攻定角尖、体重给冲量、等级给狠劲。对手防御、相性与暴击在命中时另算。"
            }),
        /** 角程：1.9 + 身高偏移[−0.25,0.8] ×0.5 + 速度偏移[−0.1,0.3] ×0.004；夹 1.6..2.8。 */
        reach: formula(
            F.base(1.9).plus(F.body("height").minus(1.4).times(0.5).clamp(-0.25, 0.8))
                .plus(F.stat("speed").minus(60).times(0.004).clamp(-0.1, 0.3))
                .clamp(1.6, 2.8).round(2),
            "角程", {
                unit: "格",
                description: "低着头能把角送出去多远；身高给角长与步幅、速度给上前的半步。它也是本招的实际射程来源。"
            }),
        /** 角线半宽：0.34 + 体宽偏移[−0.05,0.18] ×0.14；夹 0.28..0.56。 */
        horn: formula(
            F.base(0.34).plus(F.body("width").minus(0.9).times(0.14).clamp(-0.05, 0.18)).clamp(0.28, 0.56).round(2),
            "角线半宽", {
                unit: "格",
                description: "角线判定的横向半宽；身板越宽角越粗。画面里那道窄带的粗细与它一致。"
            }),
        /** 冲身步幅：0.6 + 速度偏移[−0.1,0.4] ×0.006；夹 0.3..1.3。 */
        rush: formula(
            F.base(0.6).plus(F.stat("speed").minus(60).times(0.006).clamp(-0.1, 0.4)).clamp(0.3, 1.3).round(2),
            "冲身步幅", {
                unit: "格",
                description: "出角时整个人趟出的距离；速度快的个体冲得更前。冲到判定边缘就停，不会穿过目标。"
            }),
        /** 初始顶退：0.5 + 体重偏移[0,0.5] ×0.002；夹 0.2..1.0。 */
        shove: formula(
            F.base(0.5).plus(F.body("weight").minus(60).times(0.002).clamp(0, 0.5)).clamp(0.2, 1.0).round(2),
            "初始顶退", {
                unit: "格",
                description: "角尖刚扎进去、命中那一刻把目标顶开的一记；体重给的初始推力。之后才开始持续推走。"
            }),
        /** 顶走距离：0.9 + 体重偏移[0,1.2] ×0.004；推土 ×1.6；夹 0.4..2.6。 */
        carry: formula(
            F.base(0.9).plus(F.body("weight").minus(60).times(0.004).clamp(0, 1.2))
                .times(F.when(F.pref("drive", text("worldcombat.skill.hornattack.preference.drive")), F.const(1.6), F.const(1)))
                .clamp(0.4, 2.6).round(2),
            "顶走距离", {
                unit: "格",
                description: "角锁住之后总共把目标沿地面推走多远；施法者越重顶得越远，推土式要多推一长段。撞到墙或推到距离尽头就松角。"
            }),
        /** 前推速度：0.16 + 体重偏移[0,0.14] ×0.0006；夹 0.12..0.3。 */
        carrySpeed: formula(
            F.base(0.16).plus(F.body("weight").minus(60).times(0.0006).clamp(0, 0.14)).clamp(0.12, 0.3).round(2),
            "前推速度", {
                unit: "格/刻",
                description: "持续推走时每刻把目标沿地面挪多快；越重的个体推得越急。"
            }),
        /** 扬尘量：14 + 体重偏移[−2,12] ×0.08；夹 10..36。 */
        dust: formula(
            F.base(14).plus(F.body("weight").minus(60).times(0.08).clamp(-2, 12)).clamp(10, 36).round(0),
            "扬尘量", {
                unit: "撮",
                description: "角尖扎入与一路推走时扬起的尘土数量，由体重换算；粒子按它发射，不是独立伤害。"
            }),
        /** 起手：7 − 速度偏移[−1.5,2.5] ×0.03 + 推土 +3；夹 4..14。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.03).clamp(-1.5, 2.5))
                .plus(F.when(F.pref("drive", text("worldcombat.skill.hornattack.preference.drive")), F.const(3), F.const(0)))
                .clamp(4, 14).round(0),
            "起手", "低头、后腿蹬地、把角对准目标的时间；速度越快越短，推土式要多压一拍。"),
        /** 收招：7 − 速度偏移[−1,2] ×0.02 + 推土 +2；夹 4..12。 */
        aftercast: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.02).clamp(-1, 2))
                .plus(F.when(F.pref("drive", text("worldcombat.skill.hornattack.preference.drive")), F.const(2), F.const(0)))
                .clamp(4, 12).round(0),
            "收招", "推完把角抽回来、重新站稳的收势；速度越快越短。"),
        /** 冷却：16 − 等级偏移[0,4] ×0.1 + 推土 +5；夹 11..30。 */
        recharge: seconds(
            F.base(16).minus(F.level().minus(22).times(0.1).clamp(0, 4))
                .plus(F.when(F.pref("drive", text("worldcombat.skill.hornattack.preference.drive")), F.const(5), F.const(0)))
                .clamp(11, 30).round(0),
            "冷却", "两次角撞之间等多久；等级越高回得越快，推土式额外更费。")
    });

    stages("hornattack", [
        { level: 25, values: { gore: 70 } },
        { level: 44, values: { gore: 78, carry: 1.1 } }
    ]);

    defineDamage("hornattack", "gore", {}, { contact: true });

    describe("hornattack", [
        { key: "description.0", values: ["gore", "reach", "horn"] },
        { key: "description.1", values: ["shove", "carry"] },
        { key: "drive.on", values: ["carry", "gore"], when: function (context) { return read(context.detail.values, ["drive"]) === true; } },
        { key: "drive.off", values: ["carry", "gore"], when: function (context) { return read(context.detail.values, ["drive"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.gore"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.gore", "tier.1.carry"] }
    ]);
}
