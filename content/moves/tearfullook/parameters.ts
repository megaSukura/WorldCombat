/**
 * 泪眼汪汪 / Tearful Look 的参数与数值来源。
 *
 * 原生：Normal／Status／威力 —／命中 —（必定命中）／PP 20／目标 normal（单体）／boosts={atk:-1, spa:-1}／
 *       flags 含 reflectable、mirror（非声音，需被看见）。
 * 世界化：不是隔空扣等级，而是**把自己的伤摆到对方眼前**——眼圈一红，对手下不去手。它是本组唯一
 *   「越挨打越强」的一招：自己掉的血就是它的威力来源，满血时几乎只是挠痒，残血时能一口气垮掉对方的物攻与
 *   特攻。命中后挂共享身份 world_combat:status/disheartened 的真实 MobEffect，再调用 NativeEffects.boost
 *   同时下降攻击与特攻：宝可梦损失原生等级，其他生物把两项折进攻击属性。
 * 「含泪」只盯住一个看得见的对手，出手快；「放声大哭」朝面前张开一片扇形，把看见的人都卷进来，但起手与
 *   冷却更长，也必须站得住。它需要通视——眼泪要被看见才成立。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   despair     1 + (1 − 当前生命 ÷ 最大生命) × 2，夹 1..2；掉血越多，夺走的斗志越多。
 *   tearRange   身高 × 1.2 + 3 格，夹 4..8；身量越高，眼泪送得越远。
 *   sectorAngle 90 + (宽度 − 0.9) × 40 度，夹 60..140；体型越宽，放声大哭时扇面越开。
 *   sobRadius   2.5 + 宽度 × 1.5 格，夹 2.5..4.5；体型越宽，卷进来的人越多。
 *   lingerTicks 90 + 亲密度 × 0.6，含泪 ×1／放声 ×1.3，夹 60..240；越亲近，这份失落留得越久。
 *   tears       12 + (1 − 当前生命 ÷ 最大生命) × 30，夹 10..42；伤得越重，一次涌出的泪滴越多（也是画面里的数量）。
 *   tempo       含泪 8／放声 13 − (速度 − 60) × 0.04 刻，夹 5..15；速度越快越早红眼圈。
 *   recharge    含泪 120／放声 160 + (等级 − 30) × 0.6 刻，夹 105..200；等级越高越熟练。
 */
namespace PokemonSkills {
    export const tearfullookId = "tearfullook";
    export const tearfullookEffect = "world_combat:disheartened_tears";
    export const tearfullookScene = "world_combat:move_tearfullook";
    export const tearfullookSpot = "world_combat:status/disheartened";

    /** 当前生命比例；读不到时按满血处理，despair 回到 1。 */
    function tearfullookMissing(): Formula.Node {
        return F.const(1).minus(F.stat("hp").div(F.stat("maxHp"))).max(0);
    }

    actionParameters.define(tearfullookId, {
        despair: formula(F.base(1).plus(tearfullookMissing().times(2)).clamp(1, 2).round(0), "斗志下降", {
            base: 1,
            unit: " 级",
            description: "被夺走的攻击与特攻等级；施法者生命越接近见底，从 1 级逼近 2 级。"
        }),
        tearRange: formula(F.body("height").times(1.2).plus(3).clamp(4, 8).round(1), "泪眼距离", {
            unit: " 格",
            description: "眼泪能被看见的距离；施法者身形越高，看得越远。"
        }),
        sectorAngle: formula(F.base(90).plus(F.body("width").minus(0.9).times(40)).clamp(60, 140).round(0), "扇面角度", {
            unit: " 度",
            description: "放声大哭时面前扇面的张角；体型越宽，扇面越开。"
        }),
        sobRadius: formula(F.base(2.5).plus(F.body("width").times(1.5)).clamp(2.5, 4.5).round(2), "哭声半径", {
            unit: " 格",
            description: "放声大哭时扇面覆盖的半径；体型越宽罩得越远。"
        }),
        lingerTicks: seconds(
            F.base(90).plus(F.individual("friendship").times(0.6))
                .times(F.when(F.pref("sob", text("worldcombat.skill.tearfullook.preference.sob")), F.const(1.3), F.const(1)))
                .clamp(60, 240).round(0),
            "失落时长", "对手下不去手多久；施法者越亲近，这份失落留得越久，放声大哭更长。"),
        tears: formula(F.base(12).plus(tearfullookMissing().times(30)).clamp(10, 42).round(0), "泪滴数量", {
            base: 12,
            unit: " 个",
            description: "一次涌出的泪滴数量；伤得越重越多，画面里的泪滴也按它画出。"
        }),
        tempo: seconds(
            F.when(F.pref("sob", text("worldcombat.skill.tearfullook.preference.sob")),
                F.base(13).minus(F.stat("speed").minus(60).max(0).times(0.04)).clamp(9, 15),
                F.base(8).minus(F.stat("speed").minus(60).max(0).times(0.04)).clamp(5, 11)),
            "起手", "眼圈红起来需要多久；速度越快越早，放声大哭要多花几刻。"),
        recharge: seconds(
            F.when(F.pref("sob", text("worldcombat.skill.tearfullook.preference.sob")),
                F.base(160).plus(F.level().minus(30).max(0).times(0.6)).clamp(140, 200),
                F.base(120).plus(F.level().minus(30).max(0).times(0.6)).clamp(105, 160)),
            "冷却", "两次示弱之间的等待；等级越高越熟练。")
    });
    describe(tearfullookId, [
        { key: "description.0", values: ["despair","lingerTicks"] },
        { key: "description.1", values: ["tearRange","sectorAngle","sobRadius","range"] },
        { key: "description.2", values: ["tempo","recharge"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
