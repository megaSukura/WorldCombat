/**
 * 刺耳声 / screech 的参数与数值来源。
 *
 * 原生：Normal／Status／威力 —／命中 85／PP 40／目标 normal（单体）／boosts={def:-2}／
 *       flags 含 sound、bypasssub、mirror（声音类，隔着掩体也听得见）。
 *
 * 世界化：把「一声尖啸」展开成**一道从嘴前向前推进的薄声前沿**——施法者张口，高频声波沿一条窄道扫出去；
 *   声音不被掩体挡住，前沿每经过一个敌人一次，就把它那层防御松开一次（同一个人只降一次，不叠降）。
 *   这是本组射程最长、唯一能一次扫到多人、且唯一作用于物防的一招。走廊的长度与宽度由 WorldGeometry.lane 判定，
 *   表现读同一组机制数值，前沿位置与服务端推进距离同步。
 *   与同族分开：假哭是贴脸单体、金属音是回响单体、怪异电波是绕身一圈；刺耳声只做「一条线上的所有人」。
 *
 * 数值来源（每个参数读不同的精灵数据）：
 *   reach   声浪长度：基础 5 格 + 碰撞箱高度×1.0 + 等级×0.03，尖啸 ×0.8；夹 4..12。身板越高、越老练，吼得越远。
 *   lane    走廊宽度：基础 0.7 格 + 碰撞箱宽度×0.6 + 体重/200，尖啸 ×0.55；夹 0.6..2.2。嘴越大、越重，开口越宽。
 *   front   前沿推进：基础 13 刻 − (特攻 − 60) × 0.04；夹 8..15。嗓音越强，整道前沿扫完全程越快。
 *   drop    物防下降：基础 2 级，特攻 ≥ 110 加 1 级（嗓音更尖利），尖啸再加 1 级；夹 2..3。
 *   ringing 耳鸣时长：基础 110 刻 + 等级×2.5，尖啸 ×0.55／长鸣 ×1.4；夹 90..380。等级越高越震耳。
 *   tempo   起手：基础 9 刻 − (速度 − 60) × 0.04；夹 6..13。速度越快越早开嗓。
 *   wait    冷却：基础 120 刻 − 等级×0.5，尖啸 −10／长鸣 +10；夹 80..140。等级越高越熟练。
 *
 * 配置 `shrill`（尖啸）：开启＝走廊收到 0.55、声浪短 0.8、耳鸣只有 0.55 倍，但物防多降 1 级、冷却略短；
 *   关闭（长鸣）＝更宽更远、耳鸣更久，降幅保持基础。穿透深度与持续之间的取舍。
 */
namespace PokemonSkills {
    export const screechId = "screech";
    export const screechEffect = "world_combat:screech_ringing";
    export const screechScene = "world_combat:move_screech";
    /** 借共享身份「耳鸣」；刺耳声与爆音波落在同一个身份上，别的单元按身份就能读到它。 */
    export const screechSpot = "world_combat:status/deafened";

    actionParameters.define(screechId, {
        reach: formula(
            F.base(5).plus(F.body("height").times(1.0)).plus(F.level().times(0.03))
                .times(F.when(F.pref("shrill", text("worldcombat.skill.screech.preference.shrill")), F.const(0.8), F.const(1)))
                .clamp(4, 12).round(1),
            "声浪长度", {
                unit: " 格",
                description: "声浪走廊沿正前方推出去多远；碰撞箱越高、等级越高推得越远，尖啸收短。画面里走廊铺到哪，就是会被扎到哪。"
            }),
        lane: formula(
            F.base(0.7).plus(F.body("width").times(0.6)).plus(F.body("weight").div(200))
                .times(F.when(F.pref("shrill", text("worldcombat.skill.screech.preference.shrill")), F.const(0.55), F.const(1)))
                .clamp(0.6, 2.2).round(2),
            "走廊宽度", {
                unit: " 格",
                description: "声浪走廊的半宽（两侧各这么多）；施法者身体越宽、体重越大，开口越宽，尖啸收窄成一根针。"
            }),
        front: seconds(
            F.base(13).minus(F.stat("specialAttack").minus(60).max(0).times(0.04)).clamp(8, 15).round(0),
            "前沿推进", "声浪从嘴前推到最远处的整段时间；特攻越高，整道前沿扫得越快、越早落到远处的人身上。"),
        drop: formula(
            F.base(2).plus(F.when(F.stat("specialAttack").gte(110), F.const(1), F.const(0)))
                .plus(F.when(F.pref("shrill", text("worldcombat.skill.screech.preference.shrill")), F.const(1), F.const(0)))
                .clamp(2, 3).round(0),
            "物防下降", {
                unit: " 级",
                description: "被扎中者损失的防御等级；施法者特攻达到 110 时 +1，尖啸再 +1。"
            }),
        ringing: seconds(
            F.base(110).plus(F.level().times(2.5))
                .times(F.when(F.pref("shrill", text("worldcombat.skill.screech.preference.shrill")), F.const(0.55), F.const(1.4)))
                .clamp(90, 380).round(0),
            "耳鸣时长", "被扎中者耳朵嗡响多久；等级越高越震耳，尖啸短促、长鸣更久。"),
        tempo: seconds(
            F.base(9).minus(F.stat("speed").minus(60).max(0).times(0.04)).clamp(6, 13),
            "起手", "把气提到喉咙、开嗓需要多久；速度越快越早。"),
        wait: seconds(
            F.base(120).minus(F.level().times(0.5))
                .plus(F.when(F.pref("shrill", text("worldcombat.skill.screech.preference.shrill")), F.const(-10), F.const(10)))
                .clamp(80, 140).round(0),
            "冷却", "两次刺耳声之间的等待；等级越高越熟练，尖啸稍短。PP 40 的代价。")
    });

    describe(screechId, [
        { key: "description.0", values: ["drop","ringing"] },
        { key: "description.1", values: ["reach","lane","front"] },
        { key: "description.2", values: ["tempo", "wait"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
