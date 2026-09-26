/**
 * 假哭 / faketears 的参数与数值来源。
 *
 * 原生：Dark／Status／威力 —／命中 100／PP 20／目标 normal（单体）／boosts={spd:-2}／
 *       flags 含 protect、reflectable、mirror、allyanim（不是声音，要靠对方看见）。
 *
 * 世界化：把「装哭」落成一次**当面行骗**——要在对手看得见的地方挤出眼泪，还得离得够近，眼泪才骗得过人；
 *   所以它是本组射程最短、必须通视的一招。眼泪命中、特防松开的那一瞬并不附加任何控制：对手不因此被定住，
 *   也不需要看着施法者。施法者越是受珍视，这场假哭越像真的。
 *   与同族分开：泪眼汪汪用的是「真伤」（自己掉的血），假哭用的是「演技」（亲近关系与娇小身形）；刺耳声与
 *   金属音是声音、穿掩体，怪异电波是绕身一圈。
 *
 * 数值来源（每个参数读不同的精灵数据）：
 *   reach     假哭距离：基础 3 格 + 碰撞箱高度×0.8 + 等级×0.01；夹 3..6。身形越高、越老练，能把眼泪递得稍远。
 *   drop      特防下降：基础 2 级，亲密度 ≥ 140 加 1 级；夹 2..3。越受珍视，这场假哭越可信。
 *   fluster   失神时长：基础 90 刻 + 等级×1.6；夹 80..280。等级越高演得越像，身份标记留得越久。
 *   tears     泪点数量：基础 12 + (1 − 碰撞箱宽度)×10 + 亲密度×0.12；夹 10..40。身形越娇小、越亲近，涌出的假泪越多。
 *   tempo     起手：基础 7 刻 − (速度 − 60) × 0.03；夹 5..11。速度越快越早红眼圈。
 *   wait      冷却：基础 110 刻 − 等级×0.4；夹 85..130。等级越高越熟练。
 */
namespace PokemonSkills {
    export const faketearsId = "faketears";
    export const faketearsEffect = "world_combat:fake_tears_fluster";
    export const faketearsScene = "world_combat:move_faketears";
    export const faketearsSpot = "world_combat:status/flustered";

    actionParameters.define(faketearsId, {
        reach: formula(
            F.base(3).plus(F.body("height").times(0.8)).plus(F.level().times(0.01)).clamp(3, 6).round(1),
            "假哭距离", {
                unit: " 格",
                description: "眼泪要被看清才骗得过人；施法者身形越高、等级越高，能把这张脸递得稍远。"
            }),
        drop: formula(
            F.base(2).plus(F.when(F.individual("friendship").gte(140), F.const(1), F.const(0))).clamp(2, 3).round(0),
            "特防下降", {
                unit: " 级",
                description: "被假哭乱了阵脚者损失的特防等级；施法者亲密度达到 140 时从 2 级升到 3 级。"
            }),
        fluster: seconds(
            F.base(90).plus(F.level().times(1.6)).clamp(80, 280).round(0),
            "失神时长", "特防下降后留下的身份标记持续多久；它本身不改变属性或行动，只让同伴知道这个人已经吃过这一招。"),
        tears: formula(
            F.base(12).plus(F.const(1).minus(F.body("width")).times(10))
                .plus(F.individual("friendship").times(0.12)).clamp(10, 40).round(0),
            "泪点数量", {
                unit: " 个",
                description: "一次挤出的假泪数量；身形越娇小、越受珍视越多，画面里的泪点也按它画出。"
            }),
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(60).max(0).times(0.03)).clamp(5, 11),
            "起手", "把眼圈憋红需要多久；速度越快越早。"),
        wait: seconds(
            F.base(110).minus(F.level().times(0.4)).clamp(85, 130).round(0),
            "冷却", "两次假哭之间的等待；等级越高越熟练。PP 20 的代价。")
    });

    describe(faketearsId, [
        { key: "description.0", values: ["drop","fluster"] },
        { key: "description.1", values: ["reach"] },
        { key: "description.2", values: ["tempo", "wait"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
