/**
 * 迷人 / Attract — 参数与数值来源。
 *
 * 原生：Normal／Status／PP 15／命中 100；volatileStatus attract，只在异性之间生效，着迷时约一半回合无法行动。
 * 世界化：把一颗会跳动的心当飞吻掷向单个敌人。命中后才着迷：着迷期间每次试图提交出招都有几率心软收手；
 *         着迷只在双方视线畅通且目标仍在你身边时维持——躲到墙后或走远就解除。飞吻有飞行时间并被地形挡下，
 *         但会缓慢追踪目标（空放则直飞）；宝可梦要求异性，原版生物、其他模组生物与玩家没有性别概念，直接有效。
 *         它只是让对手变得不可靠，不是硬控，也不会把人拽走。
 *
 * 数值来源（都来自个体，分散在不同参数上）：
 *   chance      基础 50%，特攻 spa 超出 60 的部分 ×0.15%/点，妩媚风情 -8%、甜言蜜语 +8%，限幅 20%~80%
 *   duration    基础 140 刻，妩媚风情 +80、甜言蜜语 -30；30 级后每级 +1.5 刻，限幅 90~600
 *   leash       基础 5 格，特攻越高牵得越紧（最低 3 格），妩媚风情 ×1.25：着迷能维持的最远距离
 *   speed       基础 0.9 格/刻，速度 spe 超出 60 的部分 ×0.3%/点（最多 +0.6）
 *   kissRadius  基础 0.35 格，体重每 300 单位 +1，最多 +0.25：越大的个体丢出的心越大
 * 配置项 allure 在“更容易失手（甜言蜜语）”和“着迷更久、羁绊范围更大但更贵（妩媚风情）”之间取舍，两个方向都有代价。
 * 时序（prepare/recover/cooldown）见 skill.ts 的 resolve：allure 让冷却 +14 刻，甜言蜜语 -14 刻。
 */
namespace PokemonSkills {
    export const attractScene = "world_combat:move_attract";
    export const attractStatus = "world_combat:attract_infatuation";
    export const attractTether = "world_combat:attract_tether";
    export const attractCharmText = "world_combat.move.attract.text.charm";
    export const attractHesitateText = "world_combat.move.attract.text.hesitate";
    export const attractSnapText = "world_combat.move.attract.text.snap";
    function attractAlluring(detail: any): boolean { return !!(detail && detail.values && detail.values.allure); }
    function attractPreference(): Formula.Node { return F.pref("allure"); }

    actionParameters.define("attract", {
        chance: percent(F.base(0.5, "心软几率")
            .plus(F.when(attractPreference(), F.const(-0.08), F.const(0.08)).as("示好方式"))
            .plus(F.stat("specialAttack").minus(60).max(0).times(0.0015).as("特攻")).clamp(0, 1),
            "心软几率", "着迷期间目标每次试图出招时心软收手的概率；妩媚风情 -8%，甜言蜜语 +8%，并随特攻增长。"),
        duration: seconds(F.base(140, "着迷持续")
            .plus(F.when(attractPreference(), F.const(80), F.const(-30)).as("示好方式"))
            .plus(F.level().minus(30).max(0).times(1.5).as("等级"))
                .clamp(90, 600).round(0),
            "着迷持续", "着迷状态持续多久；妩媚风情 +80 刻，甜言蜜语 -30 刻，30 级后随等级延长。"),
        leash: formula(F.base(5, "羁绊范围")
            .times(F.when(attractPreference(), F.const(1.25), F.const(1)).as("示好方式"))
            .minus(F.stat("specialAttack").minus(60).max(0).times(0.01).min(2).as("特攻")),
            "羁绊范围", { unit: " 格", description: "着迷期间目标离施放者超过这个距离、或与你之间断了视线，着迷就解除；妩媚风情 ×1.25，特攻越高范围越小。" }),
        speed: formula(F.base(0.9, "飞吻速度")
            .plus(F.stat("speed").minus(60).max(0).times(0.003).min(0.6).as("速度")),
            "飞吻速度", { unit: " 格/刻", description: "飞吻的飞行速度；速度越高飞得越快，对手越难走位躲开。" }),
        kissRadius: formula(F.base(0.35, "飞吻半径")
            .plus(F.body("weight").div(10).max(0).div(300).min(0.25).as("体重")),
            "飞吻半径", { unit: " 格", description: "飞吻的碰撞半径；体重越大丢出的心越大，越难被侧身闪过。" })
    });

    stages("attract", [{ level: 30, values: { cooldown: 66 } }, { level: 50, values: { cooldown: 54 } }]);
    describe("attract", [
        { key: "description.0", values: ["chance","duration"] },
        { key: "description.1", values: ["kissRadius","speed","leash"] },
        { key: "allure.0", values: [], when: function (context) { return attractAlluring(context.detail); } },
        { key: "allure.1", values: [], when: function (context) { return !attractAlluring(context.detail); } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cooldown"] }
    ]);
}
