/**
 * 怪异电波 / eerieimpulse 的参数与数值来源。
 *
 * 原生：Electric／Status／威力 —／命中 100／PP 15／目标 normal（单体）／boosts={spd:-2}／
 *       flags 含 protect、reflectable、mirror、metronome（不是声音，也不是目光）。
 *
 * 世界化：把「从身体放射出怪异电波」落成**一片以自己为圆心铺开的电波场**——施法者身上放电，
 *   一圈看不见的波贴地扫开，圈里的敌人都被迫「沐浴」其中，特攻被扰乱。它不对准谁、不需要看见谁，
 *   只要对方近身；代价是电波从身体放射，射程短，而且得站在原地把电放出去。它是本组唯一绕身一圈、
 *   唯一作用于特攻、唯一能一次罩住多人的一招。
 *   与同族分开：刺耳声是一条能扫多人的走廊、假哭要贴脸通视、金属音是单体的长回响；怪异电波只做「身周一圈」。
 *
 * 数值来源（每个参数读不同的精灵数据）：
 *   reach   电波半径：基础 3.5 格 + 碰撞箱高度×0.8 + 等级×0.02，过载 ×1.25；夹 3.5..7。身板越高、越老练，场铺得越开。
 *   drop    特攻下降：基础 2 级，特攻 ≥ 110 加 1 级；夹 2..3。放电的身体越强，扰乱越深。
 *   jam     扰乱时长：基础 100 刻 + 等级×2，过载 ×1.25；夹 90..320。等级越高，电波缠得越久。
 *   arcs    电弧数量：基础 12 + (速度 − 60) × 0.25，过载 ×1.3；夹 10..44。速度越快，一次迸出的电弧越多（也是画面里的数量）。
 *   tempo   起手：基础 10 刻 − (速度 − 60) × 0.04，过载 +3；夹 6..16。速度越快越早放电。
 *   wait    冷却：基础 120 刻 − 等级×0.4，过载 +25；夹 90..170。等级越高越熟练。
 *
 * 配置 `overload`（过载）：开启＝电波半径 ×1.25、扰乱更久、电弧更密，但起手 +3 刻、冷却 +25 刻；
 *   关闭（常放）＝出手更快、冷却更短。一次罩得更开更久，换更长的站定与等待。
 */
namespace PokemonSkills {
    export const eerieimpulseId = "eerieimpulse";
    export const eerieimpulseEffect = "world_combat:eerie_impulse_jammed";
    export const eerieimpulseScene = "world_combat:move_eerieimpulse";
    export const eerieimpulseSpot = "world_combat:status/jammed";

    actionParameters.define(eerieimpulseId, {
        reach: formula(
            F.base(3.5).plus(F.body("height").times(0.8)).plus(F.level().times(0.02))
                .times(F.when(F.pref("overload", text("worldcombat.skill.eerieimpulse.preference.overload")), F.const(1.25), F.const(1)))
                .clamp(3.5, 7).round(2),
            "电波半径", {
                unit: " 格",
                description: "以施法者为中心铺开多大一圈（空中地面一起算）；体型高、等级高铺得更开，过载再 ×1.25。它也是本招的实际射程与指示圈半径。"
            }),
        drop: formula(
            F.base(2).plus(F.when(F.stat("specialAttack").gte(110), F.const(1), F.const(0))).clamp(2, 3).round(0),
            "特攻下降", {
                unit: " 级",
                description: "被电波扰乱者损失的特攻等级；施法者特攻达到 110 时从 2 级升到 3 级。"
            }),
        jam: seconds(
            F.base(100).plus(F.level().times(2))
                .times(F.when(F.pref("overload", text("worldcombat.skill.eerieimpulse.preference.overload")), F.const(1.25), F.const(1)))
                .clamp(90, 320).round(0),
            "扰乱时长", "怪异电波缠在对方身上多久；等级越高越久，过载更长。"),
        arcs: formula(
            F.base(12).plus(F.stat("speed").minus(60).times(0.25))
                .times(F.when(F.pref("overload", text("worldcombat.skill.eerieimpulse.preference.overload")), F.const(1.3), F.const(1)))
                .clamp(10, 44).round(0),
            "电弧数量", {
                unit: " 道",
                description: "一次放电迸出的电弧数量；速度越快越多，过载更密，画面里的电弧也按它画出。"
            }),
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(60).max(0).times(0.04))
                .plus(F.when(F.pref("overload", text("worldcombat.skill.eerieimpulse.preference.overload")), F.const(3), F.const(0)))
                .clamp(6, 16).round(0),
            "起手", "把电攒到身上再放开需要多久；速度越快越早，过载要多花几刻。"),
        wait: seconds(
            F.base(120).minus(F.level().times(0.4))
                .plus(F.when(F.pref("overload", text("worldcombat.skill.eerieimpulse.preference.overload")), F.const(25), F.const(0)))
                .clamp(90, 170).round(0),
            "冷却", "两次怪异电波之间的等待；等级越高越熟练，过载更久。PP 15 的代价。")
    });

    describe(eerieimpulseId, [
        { key: "description.0", values: ["drop", "jam"] },
        { key: "description.1", values: ["reach", "arcs"] },
        { key: "description.2", values: ["tempo", "wait"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
