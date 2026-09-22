/**
 * 抢夺 / snatch —— 参数与数值来源。
 *
 * 原生事实（Showdown / Cobblemon 1.8）：Dark／变化／威力 —／命中必中／PP 10／优先度 +4／目标 self；
 *   进入 volatile `snatch`，本回合内对手使出的、带原生 `snatch` 旗标的自我强化／回复招式会被夺过来，
 *   改由施法者使用（Showdown condition `onAnyPrepareHit` → `useMove(move.id, snatchUser)`）。
 *
 * 核心念头：探出一只手，抓住对手正打算给自己加的那一手——它要给自己用的，被你原样收进自己身上。
 * 世界化：一扇可被打断的预提交窗口。起手之后手在 `window` 刻内张着；这段时间里被指定的对手一旦提交
 *   带 snatch 旗标的招式，它的那次提交在提交闸门被顶回去（不花它的 PP），同一刻由本单元经
 *   `NativeLoadout.call` 把那一手接在施法者身上（借用自己这一次的 PP 与提交）。窗口没等到东西就落空、不结账。
 *   这是预提交过程，所以不写世界：预告与持续画面走 `action.present`。
 *
 * 数值来源（每个参数读不同的精灵数据，分散到不同参数上）：
 *   reach    探手距离：特攻给出能探的范围，身高决定臂展，夹 4..13，并作为本招实际射程。
 *   tempo    起手：速度决定探手多快。
 *   window   张手时长：等级与特防决定这只手能撑多久。
 *   recharge 冷却：速度决定多久能再探一次。
 *   grip     指痕数量：特攻决定画面里沿路径抓出的指痕与光点数量。
 * 配置 patient（屏息／急取）双向取舍：屏息把手张得更久（窗口 ×1.5），但起手 +3 刻、冷却 ×1.2；
 *   急取出手更快（起手 −2 刻、冷却 ×0.85）、窗口略短（×0.9）。等大鱼与抢一拍各有局面。
 */
namespace PokemonSkills {
    actionParameters.define("snatch", {
        reach: formula(
            F.base(6, "基础")
                .plus(F.stat("specialAttack").times(0.03).as("特攻"))
                .plus(F.body("height").times(1.2).as("体型"))
                .clamp(4, 13).round(1),
            "探手距离", {
                unit: " 格",
                description: "这只手能探到多远之外的那一手；特攻越高、身板越大够得越远。它也是本招实际射程的来源。"
            }),
        tempo: seconds(
            F.base(8, "基础").minus(F.stat("speed").times(0.03).as("速度"))
                .plus(F.when(F.pref("patient"), F.const(3), F.const(-2)).as("探手方式"))
                .clamp(3, 13).round(0),
            "起手", "把手探出去需要多久；速度越快越短，屏息比急取多花 5 刻。"),
        window: seconds(
            F.base(130, "基础").plus(F.level().times(1.4).as("等级")).plus(F.stat("specialDefence").times(0.5).as("特防"))
                .times(F.when(F.pref("patient"), F.const(1.5), F.const(0.9)).as("探手方式"))
                .clamp(70, 420).round(0),
            "张手时长", "手在对手面前张着多久；这段时间里它提交的自我强化／回复招式会被夺走。等级与特防越高撑得越久。"),
        recharge: seconds(
            F.base(100, "基础").minus(F.stat("speed").times(0.3).as("速度"))
                .times(F.when(F.pref("patient"), F.const(1.2), F.const(0.85)).as("探手方式"))
                .clamp(40, 170).round(0),
            "冷却", "两次探手之间的等待；速度快的个体恢复快，屏息更贵。"),
        grip: formula(
            F.base(7, "基础").plus(F.stat("specialAttack").div(45).as("特攻")).clamp(7, 18).round(0),
            "指痕数量", {
                unit: " 条",
                description: "沿探手路径抓出的指痕与吸回的光点数量；特攻越高越密，画面按它发射。"
            })
    });

    stages("snatch", [{ level: 40, values: { reach: 9.2, window: 240 } }, { level: 55, values: { reach: 10.4, window: 300 } }]);

    describe("snatch", [
        { key: "description.0", values: ["window", "tempo"] },
        { key: "description.1", values: ["reach", "grip", "range"] },
        { key: "description.2", values: ["recharge"] },
        { key: "patient.on", values: [], when: function (context) { return read(context.detail.values, ["patient"]) === true; } },
        { key: "patient.off", values: [], when: function (context) { return read(context.detail.values, ["patient"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.reach", "tier.0.window"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.reach", "tier.1.window"] }
    ]);
}
