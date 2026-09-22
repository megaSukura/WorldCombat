/**
 * 喋喋不休 / chatter —— 参数与伤害段。
 *
 * 原生事实：Flying／特殊／威力 65／命中 100／PP 20／声音（sound、bypasssub、distance），
 *   目标 any，secondary 100% 使目标混乱。
 *
 * 翻译：把「用非常烦人的、喋喋不休的音波攻击对手，并使对手混乱」落成一串**停不下来的尖叫**：
 *   鸟贴在中近距离，对着身前一道扇面连叫 `bursts` 声，每一声都结算一次声音伤害（少而密的多段）；
 *   被叫到的人当场脑子嗡掉——共享身份 confusion，之后每次想出手都可能被打散、打中别人还会被自己的力气反噬。
 *   声波不看掩体（石头墙挡不住声音），判定是一片扇面而不是一条线；代价是射程短、每一段都轻。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   shriek       单声威力：特攻定尖锐程度，等级定嗓门；整串总伤害 = 单声 × 段数。
 *   bursts       段数：速度与等级决定连叫几声。
 *   interval     间隔：速度决定叫得多密。
 *   coneAngle    扇面张角：身宽决定声音铺得有多开。
 *   reach        声程：特攻与等级决定能叫到多远，也是实际射程。
 *   scrambleTicks 混乱时长：特攻与等级决定对手晕多久。
 *   fumbleChance 混乱载体振幅（失手概率）：特攻越高叫得越乱。
 *   screech      音数：特攻与等级决定画面的密度。
 *   tempo/aftercast/recharge 速度决定起手、收招与冷却。
 *
 * 配置 shrill（尖啸）：开启＝声程 +2 格、混乱 ×1.25，但单声威力 ×0.92、起手 +2 刻、冷却 +4 刻；
 *   关闭＝更近更狠的一串。两向各有适用局面（远距压制 vs 近身爆发）。
 *
 * 伤害段 shriek：每一声各结算一次，sound: true 让原生隔音类能力参与。
 */
namespace PokemonSkills {
    export const chatterId = "chatter";
    export const chatterEffect = "world_combat:chatter_screech";
    export const chatterScene = "world_combat:move_chatter";
    export const chatterScrambleText = "world_combat.move.chatter.text.scramble";
    export const chatterRecoilText = "world_combat.move.chatter.text.recoil";
    /** 反噬基数（最大生命比例）；被这一串叫懵的目标打中别人时按攻击放大。 */
    export const chatterRecoilFraction = 0.05;

    actionParameters.define(chatterId, {
        /** 单声威力：基础 20，特攻每比 60 多 1 加 0.07（夹 -5..10），等级每比 30 高 1 加 0.12（夹 0..4）；尖啸 ×0.92；夹在 12..40。 */
        shriek: formula(
            F.base(20).plus(F.stat("specialAttack").minus(60).times(0.07).clamp(-5, 10))
                .plus(F.level().minus(30).times(0.12).clamp(0, 4))
                .times(F.when(F.pref("shrill"), F.const(0.92), F.const(1)))
                .clamp(12, 40).round(1),
            "单声威力", {
                unit: "威力",
                description: "连叫里每一声的基础威力；整串总伤害约等于它乘以段数。特攻越高叫得越尖，等级越高嗓门越足；尖啸形态单声略轻。对手防御、相性与暴击在每一声命中时各自另算。"
            }),
        /** 段数：基础 3，速度每比 60 快 1 加 0.01，等级每比 30 高 1 加 0.03，夹在 2..5。 */
        bursts: formula(
            F.base(3).plus(F.stat("speed").minus(60).times(0.01).clamp(-0.6, 0.8))
                .plus(F.level().minus(30).times(0.03).clamp(0, 0.8)).clamp(2, 5).round(0),
            "段数", {
                unit: "段",
                description: "一次喋喋不休连叫几声；速度快的个体叫得更急，等级高底气更足。"
            }),
        /** 间隔：基础 6 刻，速度每比 60 快 1 减 0.02 刻，夹在 3..10。 */
        interval: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.02)).clamp(3, 10).round(0),
            "间隔", "两声之间隔多久；速度越快叫得越密。"),
        /** 扇面张角：基础 68 度，身宽每比 0.9 宽 1 格加 14 度（夹 -6..18）；尖啸 ×0.82；夹在 44..92。 */
        coneAngle: formula(
            F.base(68).plus(F.body("width").minus(0.9).times(14).clamp(-6, 18))
                .times(F.when(F.pref("shrill"), F.const(0.82), F.const(1)))
                .clamp(44, 92).round(0),
            "扇面张角", {
                unit: "度",
                description: "声浪扇面张开的总角度；身宽的个体声音铺得更开，尖啸收得更窄。画面里的扇面就是判定范围。"
            }),
        /** 声程：基础 8.5 格，特攻每比 60 多 1 加 0.04（夹 -1.5..3），等级每比 30 高 1 加 0.02（夹 0..1）；尖啸 +2；夹在 7..13。 */
        reach: formula(
            F.base(8.5).plus(F.stat("specialAttack").minus(60).times(0.04).clamp(-1.5, 3))
                .plus(F.level().minus(30).times(0.02).clamp(0, 1))
                .plus(F.when(F.pref("shrill"), F.const(2), F.const(0)))
                .clamp(7, 13).round(2),
            "声程", {
                unit: "格",
                description: "这串尖叫能压到多远；特攻高、等级高、尖啸形态叫得更远。它也是本招的实际射程来源。"
            }),
        /** 混乱时长：基础 200 刻，等级每比 30 高 1 加 1.2 刻（夹 0..60），特攻每比 60 多 1 加 0.5 刻（夹 -30..60）；尖啸 ×1.25；夹在 120..400。 */
        scrambleTicks: seconds(
            F.base(200).plus(F.level().minus(30).times(1.2).clamp(0, 60))
                .plus(F.stat("specialAttack").minus(60).times(0.5).clamp(-30, 60))
                .times(F.when(F.pref("shrill"), F.const(1.25), F.const(1)))
                .clamp(120, 400).round(0),
            "混乱时长", "被叫到的人陷入混乱多久；期间每次想出手都可能被打散、打中别人会被反噬。等级与特攻越高晕得越久，尖啸形态更久。"),
        /** 失手概率：基础 0.30，特攻每比 60 多 1 加 0.001（夹 -0.05..0.12）；夹在 0.18..0.55。 */
        fumbleChance: percent(
            F.base(0.30).plus(F.stat("specialAttack").minus(60).times(0.001).clamp(-0.05, 0.12)).clamp(0.18, 0.55).round(3),
            "失手概率", "混乱期间目标每次想出手被打散的概率；也是混乱载体的振幅，特攻越高叫得越乱。"),
        /** 音数：基础 8，特攻每比 60 多 1 加 0.1，等级每比 30 高 1 加 0.12，夹在 5..22 并向下取整。 */
        screech: formula(
            F.base(8).plus(F.stat("specialAttack").minus(60).times(0.1))
                .plus(F.level().minus(30).times(0.12)).clamp(5, 22).floor(),
            "音数", {
                unit: "个",
                description: "这一串尖叫在画面里的音符数量；特攻与等级越高越密，直接驱动发射量。"
            }),
        /** 起手：基础 11 刻，速度每比 60 快 1 减 0.04 刻，尖啸 +2；夹在 6..18。 */
        tempo: seconds(
            F.base(11).minus(F.stat("speed").minus(60).times(0.04))
                .plus(F.when(F.pref("shrill"), F.const(2), F.const(0))).clamp(6, 18).round(0),
            "起手", "张开嘴、把这一串叫出来之前的时间；速度越快越短，尖啸多花一点。"),
        /** 收招：基础 8 刻，速度每比 60 快 1 减 0.01 刻，夹在 4..12。 */
        aftercast: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.01)).clamp(4, 12).round(0),
            "收招", "叫完之后缓嗓子的时间；速度越快收得越快。"),
        /** 冷却：基础 36 刻，速度每比 60 快 1 减 0.06 刻，尖啸 +4；夹在 22..60。 */
        recharge: seconds(
            F.base(36).minus(F.stat("speed").minus(60).times(0.06))
                .plus(F.when(F.pref("shrill"), F.const(4), F.const(0))).clamp(22, 60).round(0),
            "冷却", "两次喋喋不休之间的等待；速度越快回得越快，尖啸形态要缓更久。")
    });

    defineDamage(chatterId, "shriek", {}, { sound: true });

    stages(chatterId, [
        { level: 30, values: { shriek: 24 } },
        { level: 44, values: { bursts: 4, shriek: 28 } },
        { level: 58, values: { shriek: 32, scrambleTicks: 260 } }
    ]);

    describe(chatterId, [
        { key: "description.0", values: ["shriek", "bursts", "interval"] },
        { key: "description.1", values: ["coneAngle", "reach"] },
        { key: "description.2", values: ["scrambleTicks", "fumbleChance"] },
        { key: "description.3", values: ["screech", "pref.shrill"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.shriek"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.bursts", "tier.1.shriek"] },
        { key: "growth.2", values: ["tier.2.level", "tier.2.shriek", "tier.2.scrambleTicks"] }
    ]);
}
